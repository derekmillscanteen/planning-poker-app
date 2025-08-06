// Import the necessary libraries
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require("socket.io");

// Set up the Express app and HTTP server
const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Serve the static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// A simple in-memory store for our game state
const rooms = {};

// Helper function to emit the current state to all clients in a room
function emitStateToRoom(roomName) {
    if (rooms[roomName]) {
        io.to(roomName).emit('updateState', rooms[roomName].state);
    }
}

// Handle new WebSocket connections
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Event listener for a client creating a new room
    socket.on('createRoom', ({ room, username }) => {
        if (!rooms[room]) {
            rooms[room] = {
                state: {
                    votes: { [username]: null },
                    revealed: false,
                    facilitator: username
                },
                participants: [username]
            };
            socket.join(room);
            console.log(`Room '${room}' created by ${username}.`);
            emitStateToRoom(room);
        } else {
            console.error(`Room '${room}' already exists.`);
        }
    });

    // Event listener for a client joining an existing room
    socket.on('joinRoom', ({ room, username }) => {
        // --- NEW LOGIC HERE ---
        if (!rooms[room]) {
            // If the room doesn't exist, create it and set this user as the facilitator
            rooms[room] = {
                state: {
                    votes: { [username]: null },
                    revealed: false,
                    facilitator: username
                },
                participants: [username]
            };
            socket.join(room);
            console.log(`Room '${room}' created on join by ${username}.`);
        } else {
            // If the room exists, just add the new user
            rooms[room].state.votes[username] = null;
            rooms[room].participants.push(username);
            socket.join(room);
            console.log(`User ${username} joined room '${room}'.`);
        }
        
        emitStateToRoom(room);
    });

    // Event listener for a client voting
    socket.on('vote', ({ room, username, vote }) => {
        if (rooms[room]) {
            rooms[room].state.votes[username] = vote;
            console.log(`User ${username} voted in room '${room}'.`);
            emitStateToRoom(room);
        }
    });

    // Event listener for revealing votes
    socket.on('revealVotes', ({ room }) => {
        if (rooms[room] && rooms[room].state.facilitator === rooms[room].participants[0]) {
             rooms[room].state.revealed = true;
             console.log(`Votes revealed in room '${room}'.`);
             emitStateToRoom(room);
        }
    });
    
    // Event listener for resetting the game
    socket.on('resetGame', ({ room }) => {
        if (rooms[room] && rooms[room].state.facilitator === rooms[room].participants[0]) {
            rooms[room].state.votes = {};
            rooms[room].state.revealed = false;
            console.log(`Game reset in room '${room}'.`);
            emitStateToRoom(room);
        }
    });


    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// Start the server
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});