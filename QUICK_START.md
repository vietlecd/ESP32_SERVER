# Quick Start Guide

## 🚀 Bắt đầu nhanh

### 1. Cài đặt và chạy server

```bash
# Đã có dependencies trong package.json
npm install

# Chạy server
npm start

# Hoặc chạy với nodemon (tự động restart khi code thay đổi)
npm run dev
```

Server sẽ chạy tại: **http://localhost:3000**

### 2. Truy cập Dashboard

Mở browser và vào: `http://localhost:3000`

Dashboard cho phép:
- 📱 Xem danh sách thiết bị ESP32
- 📊 Hiển thị dữ liệu cảm biến real-time
- ⚙️ Cấu hình thiết bị ESP32
- 📈 Xem lịch sử dữ liệu

### 3. Test API

Chạy script test:
```bash
./test_api.sh
```

Hoặc test thủ công bằng curl:
```bash
curl http://localhost:3000/api/device/list
```

## 📁 Cấu trúc dự án

```
esp32_server/
├── server/
│   ├── index.js           # Server chính
│   ├── database.js        # File-based database
│   └── routes/
│       ├── sensor.js      # API nhận dữ liệu từ ESP32
│       ├── device.js      # API quản lý thiết bị
│       └── config.js      # API điều khiển ESP32
├── public/
│   ├── index.html         # Dashboard frontend
│   ├── css/style.css      # Styles
│   └── js/app.js          # Frontend logic
├── config/
│   └── default.json       # Cấu hình server
├── data/                  # Database files (tự tạo)
├── README.md              # Hướng dẫn tổng quan
├── DESIGN.md              # Thiết kế chi tiết
├── ESP32_EXAMPLE.md       # Ví dụ code cho ESP32
└── package.json           # Dependencies

```

## 🎯 Chức năng chính

### 1. Nhận dữ liệu từ ESP32
- Endpoint: `POST /api/sensor/data`
- ESP32 gửi dữ liệu cảm biến
- Server lưu vào database
- Broadcast real-time qua WebSocket

### 2. Hiển thị Dashboard
- Danh sách thiết bị online/offline
- Dữ liệu cảm biến real-time
- Biểu đồ lịch sử
- Auto-refresh

### 3. Điều khiển ESP32
- Cập nhật WiFi credentials
- Thay đổi chu kỳ gửi dữ liệu
- Đổi ID thiết bị
- Gửi lệnh đến ESP32

### 4. Quản lý thiết bị
- Xem danh sách thiết bị
- Trạng thái online/offline
- Chi tiết từng thiết bị
- Xóa thiết bị

## 📡 Protocol ESP32 ↔️ Server

### ESP32 gửi dữ liệu:

```javascript
POST http://your-ip:3000/api/sensor/data
Content-Type: application/json

{
  "deviceId": "ESP32_001",
  "sensors": [
    {
      "type": "temperature",
      "value": 25.5,
      "unit": "°C",
      "timestamp": "2024-01-15T10:30:00Z"
    },
    {
      "type": "humidity",
      "value": 60.0,
      "unit": "%",
      "timestamp": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### Server response (bao gồm commands):

```javascript
{
  "success": true,
  "dataReceived": true,
  "pendingCommands": [
    {
      "type": "update_config",
      "params": {
        "wifi_ssid": "NewSSID",
        "send_interval": 10000
      }
    }
  ]
}
```

## 🔧 Cấu hình

File: `config/default.json`

```json
{
  "server": {
    "port": 3000,
    "host": "0.0.0.0"
  },
  "database": {
    "type": "file",
    "path": "./data/database.json"
  },
  "esp32": {
    "defaultSendInterval": 5000,
    "commandTimeout": 30000
  }
}
```

## 💡 Lưu ý

1. **Cho nhóm ESP32**: Xem file `ESP32_EXAMPLE.md` để hiểu cách tích hợp
2. **IP Address**: Thay đổi SERVER_URL trong code ESP32 thành IP máy chạy server
3. **Port**: Mặc định port 3000, có thể thay đổi trong config
4. **Database**: Dùng file JSON, tự động tạo khi chạy lần đầu
5. **WebSocket**: Dashboard tự động kết nối qua Socket.IO

## 🐛 Troubleshooting

### Server không chạy được
```bash
# Check port đã được sử dụng
lsof -i :3000

# Hoặc đổi port trong config/default.json
```

### ESP32 không kết nối được
```bash
# Check IP address của server
ifconfig

# Test API từ ESP32
curl http://your-ip:3000/api/device/list
```

### Dashboard không hiển thị dữ liệu
- Check WebSocket connection (icon trạng thái)
- F12 để xem console logs
- Đảm bảo ESP32 đã gửi dữ liệu

## 📚 Tài liệu thêm

- `README.md` - Tổng quan hệ thống
- `DESIGN.md` - Thiết kế chi tiết
- `ESP32_EXAMPLE.md` - Code ví dụ cho ESP32
- `requirement.md` - Yêu cầu đề tài

## 🎓 Yêu cầu đề tài (Review)

✅ **Nhận dữ liệu từ ít nhất 2 cảm biến**
- Server hỗ trợ nhiều loại sensor
- Tự động lưu và hiển thị

✅ **Dashboard (Website)**
- Real-time display
- Biểu đồ lịch sử
- UI đẹp và responsive

✅ **Điều chỉnh thông số ESP32**
- WiFi credentials
- Device ID
- Chu kỳ gửi dữ liệu

✅ **Tích hợp WebSocket**
- Real-time updates
- Auto-refresh dashboard
- Broadcasting sensor data

## 📞 Support

Nếu có vấn đề, check logs ở terminal đang chạy server.

