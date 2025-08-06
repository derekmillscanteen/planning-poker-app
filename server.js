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

// This line is crucial for your setup. It explicitly serves index.html.
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

    socket.on('resetVotes', ({ room }) => {
        if (rooms[room]) {
            for (const user in rooms[room].votes) {
                rooms[room].votes[user] = null;
            }
            rooms[room].revealed = false;
            io.to(room).emit('updateState', rooms[room]);
        }
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected:', socket.id);
        // Add cleanup logic here if needed
    });
});

server.listen(3000, () => {
    console.log('Server is running on port 3000');
});
