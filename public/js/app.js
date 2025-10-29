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
        `;
        
        card.addEventListener('click', () => selectDevice(device.deviceId));
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
        const response = await fetch(`/api/config/${deviceId}`);
        const data = await response.json();
        
        if (data.success) {
            const config = data.config;
            document.getElementById('wifiSSID').value = config.wifi_ssid || '';
            document.getElementById('wifiPassword').value = config.wifi_password || '';
            document.getElementById('sendInterval').value = config.send_interval || 5000;
            document.getElementById('deviceId').value = config.device_id || deviceId;
        }
    } catch (error) {
        console.error('Error loading device config:', error);
    }
}

async function saveConfig() {
    if (!currentDeviceId) {
        alert('Vui lòng chọn thiết bị trước');
        return;
    }
    
    const config = {
        wifi_ssid: document.getElementById('wifiSSID').value,
        wifi_password: document.getElementById('wifiPassword').value,
        send_interval: document.getElementById('sendInterval').value,
        device_id: document.getElementById('deviceId').value
    };
    
    try {
        const response = await fetch(`/api/config/${currentDeviceId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(config)
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('✅ Cấu hình đã được lưu và gửi đến thiết bị!');
        } else {
            alert('❌ Lỗi khi lưu cấu hình');
        }
    } catch (error) {
        console.error('Error saving config:', error);
        alert('❌ Lỗi kết nối đến server');
    }
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN');
}

// ========================================
// Mock Data Functions
// ========================================

let autoGenerateInterval = null;

async function seedMockData() {
    try {
        updateMockStatus('Đang tạo mock data...');
        
        const response = await fetch('/api/mock/seed', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                numDevices: 2,
                numDataPoints: 30
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            updateMockStatus(`✅ Đã tạo ${data.devicesCreated} thiết bị và ${data.dataPointsCreated} điểm dữ liệu!`);
            refreshDevices();
        } else {
            updateMockStatus('❌ Lỗi khi tạo mock data');
        }
    } catch (error) {
        console.error('Error seeding mock data:', error);
        updateMockStatus('❌ Lỗi kết nối đến server');
    }
}

async function generateMockData() {
    try {
        updateMockStatus('Đang generate dữ liệu...');
        
        const response = await fetch('/api/mock/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            updateMockStatus('✅ Đã generate dữ liệu mới!');
            refreshDevices();
            
            // Nếu đang xem device, refresh data
            if (currentDeviceId) {
                loadSensorData(currentDeviceId);
            }
        } else {
            updateMockStatus('❌ Lỗi khi generate dữ liệu');
        }
    } catch (error) {
        console.error('Error generating mock data:', error);
        updateMockStatus('❌ Lỗi kết nối đến server');
    }
}

async function clearMockData() {
    if (!confirm('⚠️ Bạn có chắc muốn xóa TẤT CẢ dữ liệu không?')) {
        return;
    }
    
    try {
        const response = await fetch('/api/mock/clear', {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            updateMockStatus('🗑️ Đã xóa tất cả dữ liệu');
            refreshDevices();
            
            // Clear current device display
            document.getElementById('sensorSection').style.display = 'none';
            document.getElementById('configSection').style.display = 'none';
            currentDeviceId = null;
        } else {
            updateMockStatus('❌ Lỗi khi xóa dữ liệu');
        }
    } catch (error) {
        console.error('Error clearing data:', error);
        updateMockStatus('❌ Lỗi kết nối đến server');
    }
}

function startAutoGenerate() {
    if (autoGenerateInterval) {
        updateMockStatus('⚠️ Auto generate đã đang chạy');
        return;
    }
    
    updateMockStatus('▶️ Bắt đầu auto generate mỗi 5 giây...');
    
    // Generate ngay lập tức
    generateMockData();
    
    // Setup interval
    autoGenerateInterval = setInterval(() => {
        generateMockData();
    }, 5000);
}

function stopAutoGenerate() {
    if (autoGenerateInterval) {
        clearInterval(autoGenerateInterval);
        autoGenerateInterval = null;
        updateMockStatus('⏹️ Đã dừng auto generate');
    } else {
        updateMockStatus('⚠️ Auto generate không đang chạy');
    }
}

function updateMockStatus(message) {
    const statusDiv = document.getElementById('mockStatus');
    if (statusDiv) {
        statusDiv.textContent = message;
        
        // Auto clear sau 3 giây
        setTimeout(() => {
            if (statusDiv.textContent === message) {
                statusDiv.textContent = '';
            }
        }, 5000);
    }
}

