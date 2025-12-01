
/**
 * Local stub for networking.
 * We keep the API shape but run everything in-memory so the app does not
 * depend on any backend or socket.io at runtime.
 */

export interface SessionStub {
    id: string
    players: { id: string; username: string; distance: number; alive: boolean }[]
}

export interface TrackSegmentStub {
    id: string
    startX: number
    width: number
}

class NetworkManager {
    // Callbacks
    onSessionUpdate: ((session: SessionStub) => void) | null = null
    onTrackUpdate: ((segments: TrackSegmentStub[]) => void) | null = null

    connect() {
        // No-op: in-app only. We can emit a fake session once to satisfy callbacks.
        const fakeSession: SessionStub = {
            id: 'local-session',
            players: [],
        }
        if (this.onSessionUpdate) this.onSessionUpdate(fakeSession)
    }

    joinGame() {
        // No-op for now – sessions are managed locally.
    }

    updatePosition(_x: number, _y: number, _vx: number, _vy: number, _isGrounded: boolean) {
        // No-op – kept for API compatibility.
    }
}

export const networkManager = new NetworkManager()

