
import { SessionManager } from './SessionManager';
import { TrackGenerator } from './TrackGenerator';
import { Session, TrackSegment } from './shared/types';

export class GameLoop {
    private sessionManager: SessionManager;
    private trackGenerators: Map<string, TrackGenerator> = new Map();
    private sessionSegments: Map<string, TrackSegment[]> = new Map();

    constructor(sessionManager: SessionManager) {
        this.sessionManager = sessionManager;
    }

    update() {
        const sessions = this.sessionManager.getAllSessions();
        sessions.forEach(session => {
            if (session.status !== 'live') return;

            const segments = this.getSegments(session.id);

            session.players.forEach(player => {
                if (!player.alive) return;

                // Check falling
                if (player.y > 800) { // Below screen
                    player.alive = false;
                    console.log(`Player ${player.username} eliminated (fell)`);
                    return;
                }

                // Check obstacles
                // Find segments near player
                const relevantSegments = segments.filter(s =>
                    s.startX < player.x + 100 && s.startX + s.width > player.x - 100
                );

                for (const seg of relevantSegments) {
                    if (seg.obstacle) {
                        const obs = seg.obstacle;
                        // Simple AABB
                        const playerRight = player.x + 40; // PLAYER_WIDTH
                        const playerBottom = player.y + 40; // PLAYER_HEIGHT
                        const obsRight = obs.x + obs.width;
                        const obsBottom = obs.y + obs.height;

                        if (player.x < obsRight &&
                            playerRight > obs.x &&
                            player.y < obsBottom &&
                            playerBottom > obs.y) {
                            player.alive = false;
                            console.log(`Player ${player.username} eliminated (hit obstacle)`);
                        }
                    }
                }
            });
        });
    }

    // Actually, let's keep it simple. The SessionManager can hold the TrackGenerator for each session?
    // Or we separate concerns.

    generateTrackForSession(sessionId: string, maxDistance: number): TrackSegment[] {
        let generator = this.trackGenerators.get(sessionId);
        if (!generator) {
            generator = new TrackGenerator();
            this.trackGenerators.set(sessionId, generator);
        }

        let segments = this.sessionSegments.get(sessionId) || [];

        // If we don't have enough segments ahead of the max distance, generate more
        // Let's say we always want 2000px ahead of the leading player
        const targetX = maxDistance * 100 + 2000; // maxDistance is in meters (approx 100px = 1m?)
        // In gameLogic.ts: distanceScore = player.x / 100. So 1m = 100px.

        const lastSegment = segments[segments.length - 1];
        let currentX = lastSegment ? lastSegment.startX + lastSegment.width : 0;

        if (!lastSegment) {
            // Initial generation
            currentX = -50; // Start
        }

        const newSegments: TrackSegment[] = [];

        while (currentX < targetX) {
            const segment = generator.generateNextSegment(1.0 + (currentX / 10000)); // Difficulty scales with distance
            segments.push(segment);
            newSegments.push(segment);
            currentX = segment.startX + segment.width;
        }

        this.sessionSegments.set(sessionId, segments);

        // Cleanup old segments (behind all players)
        // TODO: Need min player X

        return newSegments;
    }

    getSegments(sessionId: string): TrackSegment[] {
        return this.sessionSegments.get(sessionId) || [];
    }
}
