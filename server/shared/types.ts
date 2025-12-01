
export type SegmentType = "plain" | "gap" | "obstacle" | "mystery";

export type ObstacleType = "static" | "lowCeiling" | "moving" | "laser";

export interface Obstacle {
    kind: ObstacleType;
    x: number;
    y: number;
    width: number;
    height: number;
    params?: {
        amplitude?: number;
        speed?: number;
        period?: number;
        activeDuration?: number;
        inactiveDuration?: number;
        offset?: number;
    };
}

export interface TrackSegment {
    id: string;
    startX: number;
    width: number;
    height: number;
    type: SegmentType;
    obstacle?: Obstacle;
    mysteryType?: "credit" | "speedBoost" | "fakeSafe";
}

export interface PlayerState {
    id: string;
    username: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    isGrounded: boolean;
    isJumping: boolean;
    alive: boolean;
    distance: number;
    credits: number;
    themeId: string;
}

export interface Session {
    id: string;
    players: PlayerState[];
    status: "waiting" | "live";
    startTime: number;
}

// Socket Events
export interface ServerToClientEvents {
    session_update: (session: Session) => void;
    track_update: (segments: TrackSegment[]) => void;
    player_eliminated: (playerId: string) => void;
    game_over: () => void;
    pong: (timestamp: number) => void;
}

export interface ClientToServerEvents {
    join_game: () => void;
    update_position: (data: { x: number; y: number; vx: number; vy: number; isGrounded: boolean }) => void;
    player_hit: (obstacleId: string) => void;
    ping: (timestamp: number) => void;
}
