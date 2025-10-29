const express = require('express');

module.exports = (db, io) => {
  const router = express.Router();

  // ESP32 gửi dữ liệu sensor lên server
  router.post('/data', (req, res) => {
    try {
      const { deviceId, sensors } = req.body;

      if (!deviceId || !sensors || !Array.isArray(sensors)) {
        return res.status(400).json({ 
          error: 'Invalid request: deviceId and sensors array required' 
        });
      }

      // Register device if not exists
      let device = db.getDevice(deviceId);
      if (!device) {
        device = db.addDevice({
          deviceId,
          name: `Device ${deviceId}`,
          firmware: req.body.firmware || 'unknown',
          macAddress: req.body.macAddress || 'unknown'
        });
        console.log(`New device registered: ${deviceId}`);
      }

      // Update last seen
      db.updateDevice(deviceId, { 
        lastSeen: new Date().toISOString(),
        isOnline: true 
      });

      // Store sensor data
      const record = db.addSensorData({
        deviceId,
        sensors,
        timestamp: new Date().toISOString(),
        rawData: req.body
      });

      console.log(`Received data from ${deviceId}: ${sensors.length} sensors`);

      // Broadcast to WebSocket clients
      io.emit('sensor-data', record);
      io.to(`device:${deviceId}`).emit('sensor-data', record);

      // Check for pending commands
      const commands = db.getPendingCommands(deviceId);
      if (commands.length > 0) {
        res.json({
          success: true,
          dataReceived: true,
          pendingCommands: commands.map(c => c.command)
        });
      } else {
        res.json({ success: true, dataReceived: true });
      }

    } catch (error) {
      console.error('Error processing sensor data:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Lấy dữ liệu sensor
  router.get('/data', (req, res) => {
    try {
      const { deviceId, limit } = req.query;
      const data = db.getSensorData(deviceId, parseInt(limit) || 100);
      
      res.json({
        success: true,
        count: data.length,
        data: data
      });
    } catch (error) {
      console.error('Error fetching sensor data:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Lấy dữ liệu theo deviceId
  router.get('/data/:deviceId', (req, res) => {
    try {
      const { deviceId } = req.params;
      const { limit } = req.query;
      const data = db.getSensorData(deviceId, parseInt(limit) || 100);
      
      res.json({
        success: true,
        deviceId,
        count: data.length,
        data: data
      });
    } catch (error) {
      console.error('Error fetching sensor data:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};

