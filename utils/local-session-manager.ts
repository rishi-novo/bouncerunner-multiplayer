import { THEMES } from '../constants'
import { GameStatus } from '../types'

export interface LocalPlayerState {
  id: string
  username: string
  distance: number
  alive: boolean
}

export interface LocalSessionSnapshot {
  id: string
  players: LocalPlayerState[]
  status: GameStatus
}

function generateRandomUsername(): string {
  const adjectives = ['Neon', 'Quantum', 'Rapid', 'Silent', 'Crimson', 'Turbo', 'Ghost', 'Hyper', 'Violet', 'Azure']
  const nouns = ['Runner', 'Falcon', 'Byte', 'Phantom', 'Vector', 'Blaze', 'Circuit', 'Nova', 'Rider', 'Shadow']
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)]
  const noun = nouns[Math.floor(Math.random() * nouns.length)]
  const num = Math.floor(Math.random() * 900 + 100)
  return `${adj}${noun}${num}`
}

class LocalSessionManager {
  private sessionId = 'local-session'
  private players: LocalPlayerState[] = []

  getSnapshot(): LocalSessionSnapshot {
    return {
      id: this.sessionId,
      players: this.players,
      status: GameStatus.PLAYING,
    }
  }

  ensurePlayers(count: number) {
    while (this.players.length < count) {
      this.players.push({
        id: `bot-${this.players.length + 1}`,
        username: generateRandomUsername(),
        distance: 0,
        alive: true,
      })
    }
  }

  updatePlayerDistance(id: string, distance: number) {
    const player = this.players.find(p => p.id === id)
    if (player) player.distance = distance
  }
}

export const localSessionManager = new LocalSessionManager()


