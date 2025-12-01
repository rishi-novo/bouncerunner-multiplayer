
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

        // Subscribe to Postgres changes on public.player_states for this room
        this.channel = supabase.channel(`room:${roomId}`)

        this.channel.on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'player_states',
                filter: `room_id=eq.${roomId}`
            },
            (payload) => {
                const row = payload.new as any
                const data: RemotePlayerState = {
                    id: row.client_id,
                    username: row.username,
                    x: row.x,
                    y: row.y,
                    alive: row.alive,
                    updatedAt: new Date(row.updated_at).getTime()
                }
                this.players.set(data.id, data)
                this.pruneStale()
                this.emitSession()
            }
        )

        const status = await this.channel.subscribe()
        console.log('[NetworkManager] channel subscribed (postgres_changes)', { roomId, status })

        // Write initial state row so others see us
        await this.upsertState(me)

        this.emitSession()
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
        this.upsertState(updated)
    }

    getSelfId(): string | null {
        return this.selfId
    }

    private async upsertState(state: RemotePlayerState) {
        if (!supabase || !this.roomId) return
        const { error } = await supabase
            .from('player_states')
            .upsert({
                room_id: this.roomId,
                client_id: state.id,
                username: state.username,
                x: state.x,
                y: state.y,
                alive: state.alive,
                updated_at: new Date(state.updatedAt).toISOString()
            })
        if (error) console.error('[NetworkManager] upsertState error', error)
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
        console.log('[NetworkManager] session update', { roomId: id, playerCount: players.length })
    }
}

export const networkManager = new NetworkManager()
