const fs = require('fs');
const path = require('path');

class FileDatabase {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.ensureDirectory();
    this.initDatabase();
  }

  ensureDirectory() {
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  initDatabase() {
    if (!fs.existsSync(this.dbPath)) {
      const defaultData = {
        devices: [],
        sensorData: [],
        pendingCommands: []
      };
      fs.writeFileSync(this.dbPath, JSON.stringify(defaultData, null, 2));
    }
  }

  read() {
    try {
      const data = fs.readFileSync(this.dbPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading database:', error);
      return { devices: [], sensorData: [], pendingCommands: [] };
    }
  }

  write(data) {
    try {
      fs.writeFileSync(this.dbPath, JSON.stringify(data, null, 2));
      return true;
    } catch (error) {
      console.error('Error writing database:', error);
      return false;
    }
  }

  // Device operations
  getDevices() {
    const db = this.read();
    return db.devices || [];
  }

  getDevice(deviceId) {
    const db = this.read();
    return db.devices.find(d => d.deviceId === deviceId);
  }

  addDevice(device) {
    const db = this.read();
    if (!db.devices.find(d => d.deviceId === device.deviceId)) {
      db.devices.push({
        ...device,
        registeredAt: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        isOnline: false
      });
      this.write(db);
    }
    return this.getDevice(device.deviceId);
  }

  updateDevice(deviceId, updates) {
    const db = this.read();
    const device = db.devices.find(d => d.deviceId === deviceId);
    if (device) {
      Object.assign(device, updates);
      this.write(db);
      return device;
    }
    return null;
  }

  deleteDevice(deviceId) {
    const db = this.read();
    db.devices = db.devices.filter(d => d.deviceId !== deviceId);
    this.write(db);
  }

  // Sensor data operations
  addSensorData(data) {
    const db = this.read();
    const record = {
      ...data,
      receivedAt: new Date().toISOString()
    };
    db.sensorData.push(record);
    
    // Keep only last N records
    const limit = 1000;
    if (db.sensorData.length > limit) {
      db.sensorData = db.sensorData.slice(-limit);
    }
    
    this.write(db);
    return record;
  }

  getSensorData(deviceId, limit = 100) {
    const db = this.read();
    let data = db.sensorData || [];
    
    if (deviceId) {
      data = data.filter(d => d.deviceId === deviceId);
    }
    
    return data.slice(-limit);
  }

  // Command operations
  addPendingCommand(deviceId, command) {
    const db = this.read();
    const device = db.devices.find(d => d.deviceId === deviceId);
    if (!device) return null;

    const cmd = {
      id: Date.now().toString(),
      deviceId,
      command,
      createdAt: new Date().toISOString(),
      delivered: false
    };

    db.pendingCommands.push(cmd);
    this.write(db);
    return cmd;
  }

  getPendingCommands(deviceId) {
    const db = this.read();
    return db.pendingCommands.filter(cmd => 
      cmd.deviceId === deviceId && !cmd.delivered
    );
  }

  markCommandDelivered(cmdId) {
    const db = this.read();
    const cmd = db.pendingCommands.find(c => c.id === cmdId);
    if (cmd) {
      cmd.delivered = true;
      cmd.deliveredAt = new Date().toISOString();
      this.write(db);
      return cmd;
    }
    return null;
  }
}

module.exports = FileDatabase;

