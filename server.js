const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Join a specific room (max limit logic can be handled or kept open for family)
    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        console.log(`User ${socket.id} joined room: ${roomId}`);

        // Notify existing room members about the new user
        socket.to(roomId).emit('user-joined', socket.id);

        // Send list of existing users in room to the new user
        const roomClients = Array.from(io.sockets.adapter.rooms.get(roomId) || []);
        const otherClients = roomClients.filter(id => id !== socket.id);
        socket.emit('existing-users', otherClients);
    });

    // WebRTC Signaling relays
    socket.on('offer', (data) => {
        io.to(data.target).emit('offer', { sender: socket.id, offer: data.offer });
    });

    socket.on('answer', (data) => {
        io.to(data.target).emit('answer', { sender: socket.id, answer: data.answer });
    });

    socket.on('ice-candidate', (data) => {
        io.to(data.target).emit('ice-candidate', { sender: socket.id, candidate: data.candidate });
    });

    // Feature 3: Buzz notification to get attention
    socket.on('buzz-user', (targetId) => {
        io.to(targetId).emit('buzzed', { sender: socket.id });
    });

    // Feature 4: Like button animation broadcast
    socket.on('send-like', (roomId) => {
        socket.to(roomId).emit('receive-like', { sender: socket.id });
    });

    // Handle user disconnection
    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        io.emit('user-disconnected', socket.id);
    });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
