
import { TrackSegment, SegmentType, Obstacle, ObstacleType } from './shared/types';
import { v4 as uuidv4 } from 'uuid';

const PLATFORM_HEIGHT = 26;
const MIN_GAP = 150;
const MAX_GAP = 350;
const MIN_WIDTH = 200;
const MAX_WIDTH = 600;

export class TrackGenerator {
    private lastSegment: TrackSegment;
    private difficultyMultiplier: number = 1.0;

    constructor() {
        // Initial starting platform
        this.lastSegment = {
            id: 'start',
            startX: -50,
            width: 1500,
            height: 600, // Low Y is higher up in canvas (0 is top) - wait, canvas Y is 0 at top.
            // In the client code: y = CANVAS_HEIGHT - 100. CANVAS_HEIGHT is 720. So y = 620.
            // Let's use the same coordinate system.
            type: 'plain'
        };
    }

    generateNextSegment(difficulty: number): TrackSegment {
        this.difficultyMultiplier = difficulty;

        const isGap = Math.random() < 0.3;

        if (isGap) {
            return this.generateGap();
        } else {
            return this.generatePlatform();
        }
    }

    private generateGap(): TrackSegment {
        const gapSize = MIN_GAP + Math.random() * (MAX_GAP - MIN_GAP) * this.difficultyMultiplier;

        // A gap is just empty space, but we need to track where the next platform starts.
        // We can represent a gap as a segment with type 'gap' and width = gapSize.
        // But usually we want the segment to BE the platform.
        // Let's say the "segment" is the platform.

        // Actually, let's define the segment as the platform itself.
        // The "gap" is the distance FROM the previous platform TO this one.

        // Wait, the interface has `startX`.
        const startX = this.lastSegment.startX + this.lastSegment.width + gapSize;

        return this.generatePlatformAt(startX);
    }

    private generatePlatform(): TrackSegment {
        // No gap, just adjacent? Or small gap?
        // Let's always have some gap for now to make it a runner.
        return this.generateGap();
    }

    private generatePlatformAt(startX: number): TrackSegment {
        const width = MIN_WIDTH + Math.random() * (MAX_WIDTH - MIN_WIDTH);
        const height = 620; // Keep flat for now, later add height variation

        // Determine type
        const roll = Math.random();
        let type: SegmentType = 'plain';
        let obstacle: Obstacle | undefined;
        let mysteryType: "credit" | "speedBoost" | "fakeSafe" | undefined;

        if (roll < 0.1) {
            type = 'mystery';
            const mRoll = Math.random();
            if (mRoll < 0.4) mysteryType = 'credit';
            else if (mRoll < 0.7) mysteryType = 'speedBoost';
            else mysteryType = 'fakeSafe';
        } else if (roll < 0.4) {
            type = 'obstacle';
            obstacle = this.generateObstacle(startX, width, height);
        }

        const segment: TrackSegment = {
            id: uuidv4(),
            startX,
            width,
            height,
            type,
            obstacle,
            mysteryType
        };

        this.lastSegment = segment;
        return segment;
    }

    private generateObstacle(platformX: number, platformW: number, platformY: number): Obstacle {
        const types: ObstacleType[] = ['static', 'lowCeiling', 'moving', 'laser'];
        const kind = types[Math.floor(Math.random() * types.length)];

        const obsWidth = 40;
        const obsHeight = 40;

        // Position relative to platform start, but we store absolute world coordinates
        const relativeX = 50 + Math.random() * (platformW - 100);
        const x = platformX + relativeX;

        let y = platformY - obsHeight; // On top of platform
        let params = {};

        if (kind === 'lowCeiling') {
            y = platformY - 150; // Hanging above
        } else if (kind === 'moving') {
            params = {
                amplitude: 100,
                speed: 2
            };
        } else if (kind === 'laser') {
            params = {
                activeDuration: 60,
                inactiveDuration: 60,
                offset: Math.random() * 100
            };
        }

        return {
            kind,
            x,
            y,
            width: obsWidth,
            height: obsHeight,
            params
        };
    }
}
