const express = require('express');

module.exports = (db) => {
  const router = express.Router();

  // Lấy danh sách thiết bị
  router.get('/list', (req, res) => {
    try {
      const devices = db.getDevices();
      res.json({
        success: true,
        count: devices.length,
        devices: devices
      });
    } catch (error) {
      console.error('Error fetching devices:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Đăng ký thiết bị mới
  router.post('/register', (req, res) => {
    try {
      const { deviceId, name, firmware, macAddress } = req.body;

      if (!deviceId) {
        return res.status(400).json({ error: 'deviceId is required' });
      }

      const existingDevice = db.getDevice(deviceId);
      if (existingDevice) {
        return res.json({
          success: true,
          message: 'Device already exists',
          device: existingDevice
        });
      }

      const device = db.addDevice({
        deviceId,
        name: name || `Device ${deviceId}`,
        firmware: firmware || 'unknown',
        macAddress: macAddress || 'unknown'
      });

      res.json({
        success: true,
        message: 'Device registered successfully',
        device: device
      });
    } catch (error) {
      console.error('Error registering device:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Lấy thông tin thiết bị
  router.get('/:deviceId', (req, res) => {
    try {
      const { deviceId } = req.params;
      const device = db.getDevice(deviceId);

      if (!device) {
        return res.status(404).json({ error: 'Device not found' });
      }

      // Lấy thống kê
      const sensorData = db.getSensorData(deviceId, 100);
      const recentData = sensorData[sensorData.length - 1];

      res.json({
        success: true,
        device: {
          ...device,
          recentData,
          dataCount: sensorData.length
        }
      });
    } catch (error) {
      console.error('Error fetching device:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Cập nhật thông tin thiết bị
  router.put('/:deviceId', (req, res) => {
    try {
      const { deviceId } = req.params;
      const updates = req.body;

      const device = db.updateDevice(deviceId, updates);

      if (!device) {
        return res.status(404).json({ error: 'Device not found' });
      }

      res.json({
        success: true,
        message: 'Device updated successfully',
        device: device
      });
    } catch (error) {
      console.error('Error updating device:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Xóa thiết bị
  router.delete('/:deviceId', (req, res) => {
    try {
      const { deviceId } = req.params;

      const device = db.getDevice(deviceId);
      if (!device) {
        return res.status(404).json({ error: 'Device not found' });
      }

      db.deleteDevice(deviceId);

      res.json({
        success: true,
        message: 'Device deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting device:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};

