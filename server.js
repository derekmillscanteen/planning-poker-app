const express = require('express');
const app = express();
const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer(app);
const io = new Server(server);

// --- In-memory state for the game ---
const rooms = {};

// Serve the static files from the 'public' directory
app.use(express.static('public'));

// This is the root route for our app
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

// Start the server on the port provided by Render
server.listen(process.env.PORT || 3000, () => {
    console.log(`Server is running on port ${process.env.PORT || 3000}`);
});