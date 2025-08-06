const express = require('express');
const app = express();
const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

// --- In-memory state for the game ---
const rooms = {};

// Handle HTTP requests (Vercel will handle static files automatically)
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('createRoom', ({ room, username }) => {
        if (!rooms[room]) {
            rooms[room] = {
                facilitator: username,
                votes: { [username]: null },
                revealed: false
            };
            socket.join(room);
            socket.emit('updateState', rooms[room]);
        }
    });

    socket.on('joinRoom', ({ room, username }) => {
        if (rooms[room]) {
            rooms[room].votes[username] = null;
            socket.join(room);
            socket.emit('updateState', rooms[room]);
            io.to(room).emit('updateState', rooms[room]);
        }
    });

    socket.on('vote', ({ room, username, vote }) => {
        if (rooms[room]) {
            rooms[room].votes[username] = vote;
            io.to(room).emit('updateState', rooms[room]);
        }
    });

    socket.on('revealVotes', ({ room }) => {
        if (rooms[room]) {
            rooms[room].revealed = true;
            io.to(room).emit('updateState', rooms[room]);
        }
    });

    socket.on('resetGame', ({ room }) => {
        if (rooms[room]) {
            rooms[room].revealed = false;
            for (const user in rooms[room].votes) {
                rooms[room].votes[user] = null;
            }
            io.to(room).emit('updateState', rooms[room]);
        }
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected:', socket.id);
    });
});

// We export the HTTP server instance for Vercel to run
module.exports = server;