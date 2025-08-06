const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Serve static files from the "public" folder
app.use(express.static('public'));

// Ensure index.html is served directly on root access
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// In-memory room store
const rooms = {};

io.on('connection', (socket) => {
  console.log(`🔌 User connected: ${socket.id}`);

  socket.on('createRoom', ({ room, username }) => {
    if (!room || !username) {
      console.warn('❗ Missing room or username in createRoom');
      return;
    }

    if (!rooms[room]) {
      rooms[room] = {
        facilitator: username,
        votes: { [username]: null },
        revealed: false
      };
      socket.join(room);
      console.log(`✅ Room created: ${room} by ${username}`);
      io.to(room).emit('updateState', rooms[room]);
    }
  });

  socket.on('joinRoom', ({ room, username }) => {
    if (!room || !username) {
      console.warn('❗ Missing room or username in joinRoom');
      return;
    }

    // Auto-create room if it doesn't exist
    if (!rooms[room]) {
      console.log(`⚠️ Room ${room} does not exist. Creating on join by ${username}.`);
      rooms[room] = {
        facilitator: username,
        votes: { [username]: null },
        revealed: false
      };
    } else {
      rooms[room].votes[username] = null;
    }

    socket.join(room);
    console.log(`👥 ${username} joined room: ${room}`);
    io.to(room).emit('updateState', rooms[room]);
  });

  socket.on('vote', ({ room, username, vote }) => {
    if (rooms[room] && username in rooms[room].votes) {
      rooms[room].votes[username] = vote;
      console.log(`🗳️ ${username} voted in room ${room}: ${vote}`);
      io.to(room).emit('updateState', rooms[room]);
    }
  });

  socket.on('revealVotes', ({ room }) => {
    if (rooms[room]) {
      rooms[room].revealed = true;
      console.log(`👁️ Votes revealed in room ${room}`);
      io.to(room).emit('updateState', rooms[room]);
    }
  });

  socket.on('resetVotes', ({ room }) => {
    if (rooms[room]) {
      for (const user in rooms[room].votes) {
        rooms[room].votes[user] = null;
      }
      rooms[room].revealed = false;
      console.log(`🔄 Votes reset in room ${room}`);
      io.to(room).emit('updateState', rooms[room]);
    }
  });

  socket.on('disconnect', () => {
    console.log(`🔌 User disconnected: ${socket.id}`);
    // Cleanup logic could be added here later (e.g. removing users)
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
