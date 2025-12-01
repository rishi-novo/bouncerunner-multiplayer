
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { SessionManager } from './SessionManager';
import { ClientToServerEvents, ServerToClientEvents } from './shared/types';

const app = express();
const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
        origin: "*", // Allow all for dev
        methods: ["GET", "POST"]
    }
});

const sessionManager = new SessionManager();
import { GameLoop } from './GameLoop';
const gameLoop = new GameLoop(sessionManager);
const TICK_RATE = 30;

// Game Loop
setInterval(() => {
    gameLoop.update();

    const sessions = sessionManager.getAllSessions();
    sessions.forEach(session => {
        // Find leading player distance
        let maxDist = 0;
        session.players.forEach(p => {
            if (p.distance > maxDist) maxDist = p.distance;
        });

        // Generate track
        const newSegments = gameLoop.generateTrackForSession(session.id, maxDist);

        if (newSegments.length > 0) {
            io.to(session.id).emit('track_update', newSegments);
        }

        // Broadcast session state (including alive status)
        io.to(session.id).emit('session_update', session);
    });
}, 1000 / TICK_RATE);

io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);

    socket.on('join_game', () => {
        const { session, player } = sessionManager.joinSession(socket.id);
        socket.join(session.id);

        // Send initial state
        socket.emit('session_update', session);

        // Notify others
        socket.to(session.id).emit('session_update', session);

        console.log(`Player ${player.username} joined session ${session.id}`);
    });

    socket.on('update_position', (data) => {
        sessionManager.updatePlayerPosition(socket.id, data);

        // Broadcast to room (excluding sender to save bandwidth? No, usually include for reconciliation, but for now exclude)
        // Actually, we want to broadcast the FULL session state periodically, or relay updates.
        // Relaying updates is faster for 60fps client interpolation.
        const session = sessionManager.getPlayerSession(socket.id);
        if (session) {
            socket.to(session.id).emit('session_update', session);
        }
    });

    socket.on('disconnect', () => {
        console.log(`Player disconnected: ${socket.id}`);
        const session = sessionManager.leaveSession(socket.id);
        if (session) {
            io.to(session.id).emit('session_update', session);
        }
    });
});

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
