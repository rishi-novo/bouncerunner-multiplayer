
import { Session, PlayerState } from '../shared/types';
import { generateRandomUsername } from './utils/nameGenerator';
import { v4 as uuidv4 } from 'uuid';

const MAX_PLAYERS = 10;

export class SessionManager {
    private sessions: Map<string, Session> = new Map();
    private playerSessionMap: Map<string, string> = new Map(); // playerId -> sessionId

    constructor() {
        // Start cleanup loop
        setInterval(() => this.cleanupSessions(), 60000);
    }

    findOrCreateSession(): Session {
        // Find a live session with space
        for (const session of this.sessions.values()) {
            const activePlayers = session.players.filter(p => p.alive).length;
            if (session.status === 'live' && activePlayers < MAX_PLAYERS) {
                return session;
            }
        }

        // Create new session
        return this.createSession();
    }

    createSession(): Session {
        const id = uuidv4();
        const session: Session = {
            id,
            players: [],
            status: 'live', // Always live for infinite runner
            startTime: Date.now()
        };
        this.sessions.set(id, session);
        console.log(`Created session ${id}`);
        return session;
    }

    joinSession(socketId: string): { session: Session, player: PlayerState } {
        const session = this.findOrCreateSession();
        const username = generateRandomUsername();

        const player: PlayerState = {
            id: socketId,
            username,
            x: 0,
            y: 0,
            vx: 0,
            vy: 0,
            isGrounded: true,
            isJumping: false,
            alive: true,
            distance: 0,
            credits: 0,
            themeId: 'white'
        };

        session.players.push(player);
        this.playerSessionMap.set(socketId, session.id);

        return { session, player };
    }

    leaveSession(socketId: string): Session | null {
        const sessionId = this.playerSessionMap.get(socketId);
        if (!sessionId) return null;

        const session = this.sessions.get(sessionId);
        if (!session) return null;

        // Remove player
        session.players = session.players.filter(p => p.id !== socketId);
        this.playerSessionMap.delete(socketId);

        // If empty, mark for cleanup (or cleanup immediately)
        if (session.players.length === 0) {
            this.sessions.delete(sessionId);
            console.log(`Session ${sessionId} destroyed (empty)`);
        }

        return session;
    }

    getSession(sessionId: string): Session | undefined {
        return this.sessions.get(sessionId);
    }

    getPlayerSession(socketId: string): Session | undefined {
        const sessionId = this.playerSessionMap.get(socketId);
        if (!sessionId) return undefined;
        return this.sessions.get(sessionId);
    }

    updatePlayerPosition(socketId: string, data: { x: number, y: number, vx: number, vy: number, isGrounded: boolean }) {
        const session = this.getPlayerSession(socketId);
        if (!session) return;

        const player = session.players.find(p => p.id === socketId);
        if (player && player.alive) {
            player.x = data.x;
            player.y = data.y;
            player.vx = data.vx;
            player.vy = data.vy;
            player.isGrounded = data.isGrounded;
            player.distance = Math.max(player.distance, player.x / 100); // Update distance score
        }
    }

    cleanupSessions() {
        const now = Date.now();
        for (const [id, session] of this.sessions.entries()) {
            if (session.players.length === 0) {
                this.sessions.delete(id);
            }
        }
    }
}
