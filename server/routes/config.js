const express = require('express');

module.exports = (db, io) => {
  const router = express.Router();

  // Lấy cấu hình hiện tại của thiết bị
  router.get('/:deviceId', (req, res) => {
    try {
      const { deviceId } = req.params;
      const device = db.getDevice(deviceId);

      if (!device) {
        return res.status(404).json({ error: 'Device not found' });
      }

      res.json({
        success: true,
        config: {
          wifi_ssid: device.wifi_ssid || '',
          wifi_password: device.wifi_password || '',
          send_interval: device.send_interval || 5000,
          device_id: device.deviceId,
          last_updated: device.configUpdatedAt || device.registeredAt
        }
      });
    } catch (error) {
      console.error('Error fetching config:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Cập nhật cấu hình thiết bị
  router.put('/:deviceId', (req, res) => {
    try {
      const { deviceId } = req.params;
      const { wifi_ssid, wifi_password, send_interval, device_id } = req.body;

      const device = db.getDevice(deviceId);
      if (!device) {
        return res.status(404).json({ error: 'Device not found' });
      }

      // Tạo lệnh cấu hình
      const command = {
        type: 'update_config',
        params: {}
      };

      if (wifi_ssid !== undefined) {
        command.params.wifi_ssid = wifi_ssid;
        db.updateDevice(deviceId, { wifi_ssid });
      }

      if (wifi_password !== undefined) {
        command.params.wifi_password = wifi_password;
        db.updateDevice(deviceId, { wifi_password });
      }

      if (send_interval !== undefined) {
        command.params.send_interval = parseInt(send_interval);
        db.updateDevice(deviceId, { send_interval: command.params.send_interval });
      }

      if (device_id !== undefined && device_id !== deviceId) {
        command.params.device_id = device_id;
        db.updateDevice(deviceId, { deviceId: device_id });
      }

      db.updateDevice(deviceId, { 
        configUpdatedAt: new Date().toISOString() 
      });

      // Thêm lệnh vào hàng đợi
      const pendingCommand = db.addPendingCommand(deviceId, command);

      // Broadcast qua WebSocket
      io.emit('config-update', {
        deviceId,
        command: pendingCommand
      });

      console.log(`Configuration update queued for ${deviceId}`);

      res.json({
        success: true,
        message: 'Configuration updated successfully',
        pendingCommand: pendingCommand
      });

    } catch (error) {
      console.error('Error updating config:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Lấy lệnh điều khiển (ESP32 sẽ gọi khi có dữ liệu mới)
  router.get('/:deviceId/commands', (req, res) => {
    try {
      const { deviceId } = req.params;
      const commands = db.getPendingCommands(deviceId);

      res.json({
        success: true,
        commands: commands.map(c => c.command),
        count: commands.length
      });
    } catch (error) {
      console.error('Error fetching commands:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Xác nhận ESP32 đã nhận được lệnh
  router.post('/:deviceId/commands/:commandId/confirm', (req, res) => {
    try {
      const { commandId } = req.params;
      const confirmedCommand = db.markCommandDelivered(commandId);

      if (!confirmedCommand) {
        return res.status(404).json({ error: 'Command not found' });
      }

      console.log(`Command ${commandId} confirmed by device ${confirmedCommand.deviceId}`);

      res.json({
        success: true,
        message: 'Command confirmed'
      });
    } catch (error) {
      console.error('Error confirming command:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};

