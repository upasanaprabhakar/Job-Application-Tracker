const { Server } = require('socket.io');
const jwt        = require('jsonwebtoken');

let io;

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin:      process.env.CLIENT_URL || 'http://localhost:5173',
      methods:     ['GET', 'POST'],
      credentials: true,
    },
  });

  /* ── Auth middleware — verify cookie/token before allowing connection ── */
  io.use((socket, next) => {
    try {
      // Token can come from cookie or handshake auth
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.cookie
          ?.split(';')
          .find(c => c.trim().startsWith('accessToken='))
          ?.split('=')[1];

      if (!token) return next(new Error('Unauthorized'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id || decoded.userId;
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;
    console.log(`Socket connected: user ${userId}`);

    // Each user joins their own private room
    socket.join(`user:${userId}`);

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: user ${userId}`);
    });
  });

  return io;
};

/* ── Emit to a specific user's room ── */
const emitToUser = (userId, event, data) => {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, data);
};

const getIO = () => io;

module.exports = { initSocket, emitToUser, getIO };