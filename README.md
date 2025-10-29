# ESP32 IoT Server

## Tổng quan

Server cho hệ thống IoT quan trắc cảm biến ESP32 với các chức năng chính:
- Nhận dữ liệu từ ESP32
- Dashboard real-time hiển thị dữ liệu cảm biến
- Điều khiển ESP32 (cấu hình WiFi, ID thiết bị, chu kỳ gửi dữ liệu)

## Kiến trúc hệ thống

```
ESP32 (WiFi) <--> HTTP/REST API + WebSocket <--> Node.js Server
                                                      |
                                                      v
                                                   MongoDB/SQLite
                                                      |
                                                      v
                                                  Frontend Dashboard
```

## Cấu trúc thư mục

```
esp32_server/
├── server/
│   ├── index.js           # Server chính
│   ├── routes/            # API routes
│   │   ├── sensor.js      # API nhận dữ liệu sensor
│   │   ├── device.js      # API quản lý thiết bị
│   │   └── config.js      # API cấu hình ESP32
│   ├── models/            # Database models
│   │   ├── sensor.js      # Model dữ liệu sensor
│   │   └── device.js      # Model thiết bị
│   ├── database.js        # Database connection
│   └── socketHandler.js   # WebSocket handler
├── public/                # Frontend
│   ├── index.html         # Dashboard
│   ├── css/
│   │   └── style.css
│   └── js/
│       └── app.js
├── config/
│   └── default.json       # Cấu hình mặc định
└── package.json

```

## API Endpoints

### 1. Sensor Data (Nhận dữ liệu từ ESP32)
- `POST /api/sensor/data` - Nhận dữ liệu từ ESP32
- `GET /api/sensor/data` - Lấy lịch sử dữ liệu
- `GET /api/sensor/data/:deviceId` - Lấy dữ liệu theo deviceId

### 2. Device Management (Quản lý thiết bị)
- `GET /api/device/list` - Danh sách thiết bị
- `POST /api/device/register` - Đăng ký thiết bị mới
- `PUT /api/device/:deviceId` - Cập nhật thông tin thiết bị
- `DELETE /api/device/:deviceId` - Xóa thiết bị

### 3. Configuration (Điều khiển ESP32)
- `GET /api/config/:deviceId` - Lấy cấu hình hiện tại
- `PUT /api/config/:deviceId` - Cập nhật cấu hình (WiFi, ID, chu kỳ)
- `GET /api/config/:deviceId/commands` - Lấy lệnh điều khiển

## Protocol ESP32 <-> Server

### Gửi dữ liệu từ ESP32
```json
POST /api/sensor/data
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

### Nhận lệnh từ Server
```json
GET /api/config/{deviceId}/commands
Response: {
  "commands": [
    {
      "type": "update_config",
      "params": {
        "wifi_ssid": "NewSSID",
        "wifi_password": "NewPassword",
        "send_interval": 5000
      }
    }
  ]
}
```

## Setup và chạy

```bash
# Install dependencies
npm install

# Cài thêm MongoDB (optional) hoặc sử dụng SQLite
# Sử dụng file database đơn giản

# Chạy server
npm start
```

Server sẽ chạy tại: `http://localhost:3000`

## WebSocket Events

- `sensor-data` - Gửi dữ liệu real-time từ ESP32
- `config-update` - Gửi cập nhật cấu hình cho ESP32
- `device-status` - Trạng thái thiết bị online/offline

