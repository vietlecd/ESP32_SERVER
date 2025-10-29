const express = require('express');

module.exports = (db, io) => {
  const router = express.Router();

  // Seed mock devices và data
  router.post('/seed', (req, res) => {
    try {
      const { numDevices = 2, numDataPoints = 50 } = req.body;

      // Tạo mock devices
      const devices = [];
      for (let i = 1; i <= numDevices; i++) {
        const deviceId = `ESP32_00${i}`;
        
        // Thêm device nếu chưa có
        if (!db.getDevice(deviceId)) {
          devices.push(db.addDevice({
            deviceId,
            name: `Thiết bị ${i}`,
            firmware: '1.0.0',
            macAddress: `AA:BB:CC:DD:EE:0${i}`,
            isOnline: Math.random() > 0.3, // 70% online
            wifi_ssid: `MyWiFi${i}`,
            send_interval: 5000
          }));
        }
      }

      // Tạo mock sensor data cho mỗi device
      const now = Date.now();
      const dataCreated = [];

      devices.forEach(device => {
        for (let j = 0; j < numDataPoints; j++) {
          const timestamp = new Date(now - (numDataPoints - j) * 10000).toISOString();
          
          // Random temperature (20-30°C)
          const tempValue = (20 + Math.random() * 10).toFixed(1);
          // Random humidity (40-80%)
          const humValue = (40 + Math.random() * 40).toFixed(1);

          const record = db.addSensorData({
            deviceId: device.deviceId,
            sensors: [
              {
                type: 'temperature',
                value: parseFloat(tempValue),
                unit: '°C',
                timestamp: timestamp
              },
              {
                type: 'humidity',
                value: parseFloat(humValue),
                unit: '%',
                timestamp: timestamp
              }
            ],
            timestamp: timestamp
          });

          dataCreated.push(record);
        }
      });

      res.json({
        success: true,
        message: 'Mock data created successfully',
        devicesCreated: devices.length,
        dataPointsCreated: dataCreated.length
      });

    } catch (error) {
      console.error('Error seeding mock data:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Generate random sensor data (simulate ESP32 sending data)
  router.post('/generate', (req, res) => {
    try {
      const { deviceId } = req.body;
      
      // Get device or create random
      let device;
      if (deviceId) {
        device = db.getDevice(deviceId);
      }

      if (!device) {
        // Generate random device
        const devices = db.getDevices();
        if (devices.length > 0) {
          const randomDevice = devices[Math.floor(Math.random() * devices.length)];
          device = randomDevice;
        }
      }

      if (!device) {
        return res.status(404).json({ error: 'No device found' });
      }

      // Generate random sensor data
      const tempValue = (20 + Math.random() * 10).toFixed(1);
      const humValue = (40 + Math.random() * 40).toFixed(1);
      const lightValue = (0 + Math.random() * 1000).toFixed(0);

      const sensors = [
        {
          type: 'temperature',
          value: parseFloat(tempValue),
          unit: '°C',
          timestamp: new Date().toISOString()
        },
        {
          type: 'humidity',
          value: parseFloat(humValue),
          unit: '%',
          timestamp: new Date().toISOString()
        },
        {
          type: 'light',
          value: parseFloat(lightValue),
          unit: 'lux',
          timestamp: new Date().toISOString()
        }
      ];

      const record = db.addSensorData({
        deviceId: device.deviceId,
        sensors: sensors,
        timestamp: new Date().toISOString()
      });

      // Update device last seen
      db.updateDevice(device.deviceId, {
        lastSeen: new Date().toISOString(),
        isOnline: true
      });

      // Broadcast to WebSocket clients
      io.emit('sensor-data', record);

      console.log(`Generated mock data for ${device.deviceId}`);

      res.json({
        success: true,
        data: record
      });

    } catch (error) {
      console.error('Error generating mock data:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Clear all data
  router.delete('/clear', (req, res) => {
    try {
      // Delete all devices
      const devices = db.getDevices();
      devices.forEach(device => {
        db.deleteDevice(device.deviceId);
      });

      res.json({
        success: true,
        message: 'All mock data cleared'
      });
    } catch (error) {
      console.error('Error clearing data:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};

