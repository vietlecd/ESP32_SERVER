// ESP32 Configuration File
// Update these values for your environment

#ifndef ESP32_CONFIG_H
#define ESP32_CONFIG_H

// ============================================
// WiFi Configuration
// ============================================
const char* WIFI_SSID = "YourWiFiName";        // ← Đổi tên WiFi của bạn
const char* WIFI_PASSWORD = "YourWiFiPassword";  // ← Đổi password WiFi

// ============================================
// Server Configuration
// ============================================
// Thay 10.230.140.237 bằng IP thực tế của máy chạy server
const String SERVER_IP = "10.230.140.237";      // ← YOUR SERVER IP HERE
const int SERVER_PORT = 3000;
const String SERVER_URL = "http://" + SERVER_IP + ":" + String(SERVER_PORT);
// Final URL: http://10.230.140.237:3000

// ============================================
// Device Configuration
// ============================================
const String DEVICE_ID = "ESP32_001";            // ← Unique ID cho device này

// ============================================
// Sensor Configuration
// ============================================
const unsigned long SEND_INTERVAL = 5000;        // Gửi dữ liệu mỗi 5 giây (ms)

// Sensor pins (adjust based on your setup)
#define TEMP_SENSOR_PIN 4
#define HUMIDITY_SENSOR_PIN 4
#define LIGHT_SENSOR_PIN A0

#endif


