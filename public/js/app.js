// Initialize Socket.IO
const socket = io();

let currentDeviceId = null;
let chartData = {};

// Socket connection status
socket.on('connect', () => {
    updateServerStatus(true);
});

socket.on('disconnect', () => {
    updateServerStatus(false);
});

// Listen for sensor data
socket.on('sensor-data', (data) => {
    console.log('Received sensor data:', data);
    if (data.deviceId === currentDeviceId) {
        displaySensorData(data);
    }
});

// Listen for config updates
socket.on('config-update', (data) => {
    console.log('Config updated:', data);
    if (data.deviceId === currentDeviceId) {
        alert('Cấu hình đã được gửi đến thiết bị!');
    }
});

function updateServerStatus(connected) {
    const indicator = document.getElementById('serverStatus');
    const text = document.getElementById('serverStatusText');
    
    if (connected) {
        indicator.className = 'status-indicator online';
        text.textContent = 'Đã kết nối';
    } else {
        indicator.className = 'status-indicator';
        text.textContent = 'Đang kết nối...';
    }
}

// Load devices on page load
window.addEventListener('load', () => {
    refreshDevices();
});

async function refreshDevices() {
    try {
        const response = await fetch('/api/device/list');
        const data = await response.json();
        
        if (data.success) {
            displayDevices(data.devices);
        }
    } catch (error) {
        console.error('Error loading devices:', error);
    }
}

function displayDevices(devices) {
    const devicesList = document.getElementById('devicesList');
    devicesList.innerHTML = '';
    
    if (devices.length === 0) {
        devicesList.innerHTML = '<p>Chưa có thiết bị nào được đăng ký</p>';
        return;
    }
    
    devices.forEach(device => {
        const card = document.createElement('div');
        card.className = `device-card ${device.isOnline ? '' : 'offline'}`;
        
        card.innerHTML = `
            <div class="device-header">
                <div class="device-name">${device.name || device.deviceId}</div>
                <span class="device-status ${device.isOnline ? 'online' : 'offline'}">
                    ${device.isOnline ? 'Online' : 'Offline'}
                </span>
            </div>
            <div class="device-info">ID: ${device.deviceId}</div>
            <div class="device-info">Firmware: ${device.firmware || 'N/A'}</div>
            <div class="device-info">Last seen: ${formatDate(device.lastSeen)}</div>
            <button class="btn" style="background: #dc3545; color: white; margin-top: 10px; width: 100%;" 
                    onclick="event.stopPropagation(); deleteDevice('${device.deviceId}')">
                🗑️ Xóa thiết bị
            </button>
        `;
        
        card.addEventListener('click', (e) => {
            // Don't select device when clicking delete button
            if (e.target.tagName !== 'BUTTON') {
                selectDevice(device.deviceId);
            }
        });
        devicesList.appendChild(card);
    });
}

function selectDevice(deviceId) {
    currentDeviceId = deviceId;
    socket.emit('subscribe-sensor', { deviceId });
    
    // Update UI
    document.getElementById('sensorSection').style.display = 'block';
    document.getElementById('configSection').style.display = 'block';
    
    document.getElementById('currentDeviceName').textContent = `📊 Dữ liệu cảm biến - ${deviceId}`;
    
    // Load device details and sensor data
    loadDeviceData(deviceId);
    loadSensorData(deviceId);
    loadDeviceConfig(deviceId);
}

async function loadDeviceData(deviceId) {
    try {
        const response = await fetch(`/api/device/${deviceId}`);
        const data = await response.json();
        
        if (data.success && data.device.recentData) {
            displaySensorData(data.device.recentData);
        }
    } catch (error) {
        console.error('Error loading device data:', error);
    }
}

async function loadSensorData(deviceId) {
    try {
        const response = await fetch(`/api/sensor/data/${deviceId}?limit=50`);
        const data = await response.json();
        
        if (data.success && data.data.length > 0) {
            // Get latest data
            const latestData = data.data[data.data.length - 1];
            displaySensorData(latestData);
            
            // Prepare chart data
            prepareChartData(data.data);
        }
    } catch (error) {
        console.error('Error loading sensor data:', error);
    }
}

function displaySensorData(record) {
    const sensorDataDiv = document.getElementById('sensorData');
    sensorDataDiv.innerHTML = '';
    
    if (!record.sensors || record.sensors.length === 0) {
        sensorDataDiv.innerHTML = '<p>Chưa có dữ liệu cảm biến</p>';
        return;
    }
    
    record.sensors.forEach(sensor => {
        const card = document.createElement('div');
        card.className = 'sensor-card';
        
        card.innerHTML = `
            <h3>${getSensorTypeName(sensor.type)}</h3>
            <div class="value">${sensor.value.toFixed(1)}</div>
            <div class="unit">${sensor.unit}</div>
            <div style="margin-top: 10px; font-size: 0.8em; opacity: 0.8;">
                ${formatDate(record.timestamp)}
            </div>
        `;
        
        sensorDataDiv.appendChild(card);
    });
}

function prepareChartData(data) {
    // Group data by sensor type
    const sensorsByType = {};
    
    data.forEach(record => {
        record.sensors.forEach(sensor => {
            if (!sensorsByType[sensor.type]) {
                sensorsByType[sensor.type] = [];
            }
            sensorsByType[sensor.type].push({
                value: sensor.value,
                timestamp: new Date(record.timestamp)
            });
        });
    });
    
    chartData = sensorsByType;
    drawChart();
}

function drawChart() {
    const canvas = document.getElementById('sensorChart');
    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = 300;
    
    if (Object.keys(chartData).length === 0) {
        return;
    }
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw chart for each sensor type
    const types = Object.keys(chartData);
    types.forEach((type, index) => {
        const data = chartData[type];
        const color = getColorForSensorType(type, index);
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        const padding = 40;
        const maxValue = Math.max(...data.map(d => d.value));
        const minValue = Math.min(...data.map(d => d.value));
        const range = maxValue - minValue || 1;
        
        data.forEach((point, i) => {
            const x = padding + (i / (data.length - 1)) * (canvas.width - padding * 2);
            const y = canvas.height - padding - ((point.value - minValue) / range) * (canvas.height - padding * 2);
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();
    });
}

function getColorForSensorType(type, index) {
    const colors = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#00f2fe', '#43e97b'];
    return colors[index % colors.length];
}

function getSensorTypeName(type) {
    const names = {
        'temperature': '🌡️ Nhiệt độ',
        'humidity': '💧 Độ ẩm',
        'pressure': '🌊 Áp suất',
        'light': '💡 Ánh sáng',
        'motion': '👤 Chuyển động',
        'distance': '📏 Khoảng cách'
    };
    return names[type] || type;
}

async function loadDeviceConfig(deviceId) {
    try {
        console.log('Loading config for device:', deviceId);
        const response = await fetch(`/api/config/${deviceId}`);
        const data = await response.json();
        console.log('Config data received:', data);
        
        if (data.success) {
            const config = data.config;
            document.getElementById('wifiSSID').value = config.wifi_ssid || '';
            document.getElementById('wifiPassword').value = config.wifi_password || '';
            document.getElementById('sendInterval').value = config.send_interval || 5000;
            document.getElementById('deviceId').value = config.device_id || deviceId;
            console.log('Config loaded successfully');
        }
    } catch (error) {
        console.error('Error loading device config:', error);
    }
}

async function saveConfig() {
    console.log('saveConfig called, currentDeviceId:', currentDeviceId);
    
    if (!currentDeviceId) {
        alert('Vui lòng chọn thiết bị trước');
        return;
    }
    
    const config = {
        wifi_ssid: document.getElementById('wifiSSID').value,
        wifi_password: document.getElementById('wifiPassword').value,
        send_interval: parseInt(document.getElementById('sendInterval').value),
        device_id: document.getElementById('deviceId').value
    };
    
    console.log('Saving config:', config);
    
    try {
        const response = await fetch(`/api/config/${currentDeviceId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(config)
        });
        
        const data = await response.json();
        console.log('Save response:', data);
        
        if (data.success) {
            alert('✅ Cấu hình đã được lưu và gửi đến thiết bị!\n\nESP32 sẽ nhận config trong lần gửi data tiếp theo.');
        } else {
            alert('❌ Lỗi khi lưu cấu hình: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error saving config:', error);
        alert('❌ Lỗi kết nối đến server: ' + error.message);
    }
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN');
}

async function deleteDevice(deviceId) {
    if (!confirm(`⚠️ Bạn có chắc muốn xóa thiết bị "${deviceId}"?\n\nTất cả dữ liệu cảm biến của thiết bị này sẽ bị xóa!`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/device/${deviceId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert(`✅ Đã xóa thiết bị ${deviceId}`);
            refreshDevices();
            
            // Clear current device display if deleted device was selected
            if (currentDeviceId === deviceId) {
                document.getElementById('sensorSection').style.display = 'none';
                document.getElementById('configSection').style.display = 'none';
                currentDeviceId = null;
            }
        } else {
            alert('❌ Lỗi khi xóa thiết bị');
        }
    } catch (error) {
        console.error('Error deleting device:', error);
        alert('❌ Lỗi kết nối đến server');
    }
}

