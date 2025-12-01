
import { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from './supabaseClient'
import { RemotePlayerState } from '../types'

export interface SessionStub {
    id: string
    players: RemotePlayerState[]
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

    private roomId: string | null = null
    private channel: RealtimeChannel | null = null
    private players: Map<string, RemotePlayerState> = new Map()
    private selfId: string | null = null
    private lastSendMs: number = 0

    async connect(username?: string, roomId: string = 'room-1'): Promise<string | null> {
        this.roomId = roomId

        // If Supabase is not configured, fall back to local-only stub
        if (!supabase) {
            const localId = 'local-player'
            const now = Date.now()
            const me: RemotePlayerState = {
                id: localId,
                username: username || 'YOU',
                x: 0,
                y: 0,
                alive: true,
                updatedAt: now
            }
            this.selfId = localId
            this.players.set(localId, me)
            this.emitSession()
            // eslint-disable-next-line no-console
            console.warn('[NetworkManager] Supabase client not configured. Running in local-only mode.')
            return localId
        }

        if (this.channel) return this.selfId

        const id = crypto.randomUUID()
        const name = username || `Runner-${Math.floor(Math.random() * 900 + 100)}`
        const now = Date.now()
        const me: RemotePlayerState = {
            id,
            username: name,
            x: 0,
            y: 0,
            alive: true,
            updatedAt: now
        }

        this.selfId = id
        this.players.set(id, me)

        this.channel = supabase.channel(`room:${roomId}`)

        this.channel.on(
            'broadcast',
            { event: 'state' },
            (payload) => {
                const data = payload.payload as RemotePlayerState
                this.players.set(data.id, data)
                this.pruneStale()
                this.emitSession()
            }
        )

        await this.channel.subscribe()

        // Send initial state so others see us
        this.sendState(me)

        this.emitSession()
        // eslint-disable-next-line no-console
        console.log('[NetworkManager] Connected to room', { roomId, playerId: id, username: name })

        return id
    }

    joinGame() {
        // Kept for API compatibility – connect() already joins the room.
    }

    updatePosition(x: number, y: number, _vx: number, _vy: number, _isGrounded: boolean) {
        if (!this.selfId) return

        const now = Date.now()
        if (now - this.lastSendMs < 50) return
        this.lastSendMs = now

        const prev = this.players.get(this.selfId)
        const updated: RemotePlayerState = {
            id: this.selfId,
            username: prev?.username || 'YOU',
            x,
            y,
            alive: true,
            updatedAt: now
        }

        this.players.set(this.selfId, updated)
        this.sendState(updated)
    }

    getSelfId(): string | null {
        return this.selfId
    }

    private sendState(state: RemotePlayerState) {
        if (!this.channel) return
        this.channel.send({
            type: 'broadcast',
            event: 'state',
            payload: state
        })
    }

    private pruneStale() {
        const cutoff = Date.now() - 5000
        this.players.forEach((p, id) => {
            if (p.updatedAt < cutoff) this.players.delete(id)
        })
    }

    private emitSession() {
        if (!this.onSessionUpdate) return
        const players = Array.from(this.players.values())
        const id = this.roomId || 'local-session'
        this.onSessionUpdate({ id, players })
    }
}

export const networkManager = new NetworkManager()
