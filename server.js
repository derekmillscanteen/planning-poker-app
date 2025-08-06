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

const rooms = {};

app.use(express.static('public'));



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
            io.to(room).emit('updateState', rooms[room]);
        }
    });

    socket.on('joinRoom', ({ room, username }) => {
        if (rooms[room]) {
            rooms[room].votes[username] = null;
            socket.join(room);
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

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
