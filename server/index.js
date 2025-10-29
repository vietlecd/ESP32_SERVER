const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const config = require('../config/default.json');
const FileDatabase = require('./database');

// Initialize database
const db = new FileDatabase(config.database.path);

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Routes
const sensorRoutes = require('./routes/sensor')(db, io);
const deviceRoutes = require('./routes/device')(db);
const configRoutes = require('./routes/config')(db, io);
// Mock routes (disabled - can re-enable if needed for testing)
// const mockRoutes = require('./routes/mock')(db, io);

app.use('/api/sensor', sensorRoutes);
app.use('/api/device', deviceRoutes);
app.use('/api/config', configRoutes);
// app.use('/api/mock', mockRoutes);

// WebSocket handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });

  // Forward sensor data to all connected clients
  socket.on('subscribe-sensor', (data) => {
    socket.join(`device:${data.deviceId}`);
  });
});

// Start server
const PORT = process.env.PORT || config.server.port;
server.listen(PORT, config.server.host, () => {
  console.log(`Server running on http://${config.server.host}:${PORT}`);
  console.log(`Dashboard available at http://localhost:${PORT}`);
});

// Update device online status periodically
setInterval(() => {
  const devices = db.getDevices();
  const now = Date.now();
  
  devices.forEach(device => {
    if (device.lastSeen) {
      const lastSeenTime = new Date(device.lastSeen).getTime();
      const isOnline = (now - lastSeenTime) < 60000; // 1 minute timeout
      
      if (device.isOnline !== isOnline) {
        db.updateDevice(device.deviceId, { isOnline });
      }
    }
  });
}, 30000); // Check every 30 seconds

module.exports = { app, io, db };

