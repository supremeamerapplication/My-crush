const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Active users and calls tracking
const activeUsers = new Map(); // socketId -> userId
const activeCalls = new Map(); // callId -> {caller, receiver, type}

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // User authentication
  socket.on('authenticate', (userId) => {
    activeUsers.set(socket.id, userId);
    console.log(`User ${userId} authenticated`);
  });

  // Send message
  socket.on('send-message', (data) => {
    const { receiverId, message } = data;
    
    // Find receiver's socket
    for (const [socketId, userId] of activeUsers.entries()) {
      if (userId === receiverId) {
        io.to(socketId).emit('new-message', {
          ...message,
          senderId: activeUsers.get(socket.id)
        });
        break;
      }
    }
  });

  // Start a call
  socket.on('start-call', (data) => {
    const { receiverId, callType } = data;
    const callerId = activeUsers.get(socket.id);
    const callId = `call_${Date.now()}_${callerId}`;

    activeCalls.set(callId, {
      callerId,
      receiverId,
      type: callType,
      status: 'calling'
    });

    // Notify receiver
    for (const [socketId, userId] of activeUsers.entries()) {
      if (userId === receiverId) {
        io.to(socketId).emit('incoming-call', {
          callId,
          callerId,
          type: callType
        });
        break;
      }
    }

    socket.emit('call-started', { callId });
  });

  // Accept call
  socket.on('accept-call', (callId) => {
    const call = activeCalls.get(callId);
    if (!call) return;

    call.status = 'accepted';

    // Notify caller
    for (const [socketId, userId] of activeUsers.entries()) {
      if (userId === call.callerId) {
        io.to(socketId).emit('call-accepted', { callId });
        break;
      }
    }
  });

  // Reject call
  socket.on('reject-call', (callId) => {
    const call = activeCalls.get(callId);
    if (!call) return;

    // Notify caller
    for (const [socketId, userId] of activeUsers.entries()) {
      if (userId === call.callerId) {
        io.to(socketId).emit('call-rejected', { callId });
        break;
      }
    }

    activeCalls.delete(callId);
  });

  // End call
  socket.on('end-call', (callId) => {
    const call = activeCalls.get(callId);
    if (!call) return;

    // Notify other participant
    const otherUserId = activeUsers.get(socket.id) === call.callerId ? 
                       call.receiverId : call.callerId;

    for (const [socketId, userId] of activeUsers.entries()) {
      if (userId === otherUserId) {
        io.to(socketId).emit('call-ended', { callId });
        break;
      }
    }

    activeCalls.delete(callId);
  });

  // WebRTC signaling
  socket.on('rtc-signal', (data) => {
    const { targetUserId, signal } = data;
    
    for (const [socketId, userId] of activeUsers.entries()) {
      if (userId === targetUserId) {
        io.to(socketId).emit('rtc-signal', {
          signal,
          fromUserId: activeUsers.get(socket.id)
        });
        break;
      }
    }
  });

  // Typing indicator
  socket.on('typing', (data) => {
    const { receiverId, isTyping } = data;
    
    for (const [socketId, userId] of activeUsers.entries()) {
      if (userId === receiverId) {
        io.to(socketId).emit('typing', {
          senderId: activeUsers.get(socket.id),
          isTyping
        });
        break;
      }
    }
  });

  // Seen message
  socket.on('message-seen', (data) => {
    const { messageId, senderId } = data;
    
    for (const [socketId, userId] of activeUsers.entries()) {
      if (userId === senderId) {
        io.to(socketId).emit('message-seen', { messageId });
        break;
      }
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    const userId = activeUsers.get(socket.id);
    console.log('Client disconnected:', socket.id, 'User:', userId);
    
    // Remove from active users
    activeUsers.delete(socket.id);
    
    // End any active calls
    for (const [callId, call] of activeCalls.entries()) {
      if (call.callerId === userId || call.receiverId === userId) {
        activeCalls.delete(callId);
        
        // Notify other participant
        const otherUserId = call.callerId === userId ? 
                           call.receiverId : call.callerId;
        
        for (const [otherSocketId, otherUser] of activeUsers.entries()) {
          if (otherUser === otherUserId) {
            io.to(otherSocketId).emit('call-ended', { callId });
            break;
          }
        }
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Socket server running on port ${PORT}`);
});