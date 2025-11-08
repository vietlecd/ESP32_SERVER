// ESP32 Improved Code - WITH Server Response Handling
// Add this to your existing code

#include <stdio.h>
#include <string.h>
#include <time.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/event_groups.h"
#include "esp_system.h"
#include "esp_wifi.h"
#include "esp_event.h"
#include "esp_log.h"
#include "esp_netif.h"
#include "nvs_flash.h"
#include "esp_http_client.h"
#include "esp_sntp.h"
#include "cJSON.h"
#include "nvs.h"

static const char *TAG = "WiFi_Lab";

// ============================================
// EXISTING CODE (your current implementation)
// ============================================
// ... (keep all your existing code above) ...

// ============================================
// NEW: Response Handler Functions
// ============================================

/* HTTP Event Handler to capture response */
esp_err_t http_event_handler(esp_http_client_event_t *evt)
{
    static char *output_buffer = NULL;
    static int output_len = 0;

    switch (evt->event_id) {
        case HTTP_EVENT_ERROR:
            ESP_LOGD(TAG, "HTTP_EVENT_ERROR");
            break;

        case HTTP_EVENT_ON_CONNECTED:
            ESP_LOGI(TAG, "HTTP_EVENT_ON_CONNECTED");
            break;

        case HTTP_EVENT_HEADER_SENT:
            ESP_LOGD(TAG, "HTTP_EVENT_HEADER_SENT");
            break;

        case HTTP_EVENT_ON_HEADER:
            ESP_LOGI(TAG, "HTTP_EVENT_ON_HEADER, key=%s, value=%s", evt->header_key, evt->header_value);
            break;

        case HTTP_EVENT_ON_DATA:
            if (!esp_http_client_is_chunked_response(evt->client)) {
                // Allocate buffer for response if not allocated
                if (output_buffer == NULL) {
                    output_buffer = (char *)malloc(esp_http_client_get_content_length(evt->client) + 1);
                    output_len = 0;
                    if (output_buffer == NULL) {
                        ESP_LOGE(TAG, "Failed to allocate memory for output buffer");
                        return ESP_FAIL;
                    }
                }
                
                // Copy response data
                int data_len = evt->data_len;
                if (output_len + data_len < esp_http_client_get_content_length(evt->client)) {
                    memcpy(output_buffer + output_len, evt->data, data_len);
                    output_len += data_len;
                    output_buffer[output_len] = '\0';
                }
            }
            break;

        case HTTP_EVENT_ON_FINISH:
            ESP_LOGD(TAG, "HTTP_EVENT_ON_FINISH");
            if (output_buffer != NULL) {
                ESP_LOGI(TAG, "Server Response: %s", output_buffer);
                
                // Process server response
                process_server_response(output_buffer);
                
                // Free buffer
                free(output_buffer);
                output_buffer = NULL;
                output_len = 0;
            }
            break;

        case HTTP_EVENT_DISCONNECTED:
            ESP_LOGI(TAG, "HTTP_EVENT_DISCONNECTED");
            if (output_buffer != NULL) {
                free(output_buffer);
                output_buffer = NULL;
                output_len = 0;
            }
            break;

        default:
            break;
    }
    return ESP_OK;
}

/* Process server response and handle pending commands */
void process_server_response(const char *response_json)
{
    if (response_json == NULL || strlen(response_json) == 0) {
        ESP_LOGW(TAG, "Empty response from server");
        return;
    }

    // Parse JSON response
    cJSON *root = cJSON_Parse(response_json);
    if (root == NULL) {
        ESP_LOGE(TAG, "Failed to parse server response");
        return;
    }

    // Check if response is successful
    cJSON *success = cJSON_GetObjectItem(root, "success");
    if (success != NULL && cJSON_IsTrue(success)) {
        ESP_LOGI(TAG, "Server confirmed data received successfully");
    }

    // Check for pending commands
    cJSON *pending_commands = cJSON_GetObjectItem(root, "pendingCommands");
    if (pending_commands != NULL && cJSON_IsArray(pending_commands)) {
        int command_count = cJSON_GetArraySize(pending_commands);
        ESP_LOGI(TAG, "Received %d pending command(s) from server", command_count);

        for (int i = 0; i < command_count; i++) {
            cJSON *command = cJSON_GetArrayItem(pending_commands, i);
            if (command != NULL) {
                execute_server_command(command);
            }
        }
    } else {
        ESP_LOGI(TAG, "No pending commands from server");
    }

    cJSON_Delete(root);
}

/* Execute command received from server */
void execute_server_command(cJSON *command)
{
    if (command == NULL) {
        return;
    }

    // Get command type
    cJSON *type = cJSON_GetObjectItem(command, "type");
    if (type == NULL || !cJSON_IsString(type)) {
        ESP_LOGW(TAG, "Invalid command format");
        return;
    }

    const char *command_type = type->valuestring;
    ESP_LOGI(TAG, "Executing command: %s", command_type);

    // Get command parameters
    cJSON *params = cJSON_GetObjectItem(command, "params");
    if (params == NULL) {
        ESP_LOGW(TAG, "Command has no parameters");
        return;
    }

    // Handle different command types
    if (strcmp(command_type, "update_config") == 0) {
        handle_update_config(params);
    } else {
        ESP_LOGW(TAG, "Unknown command type: %s", command_type);
    }
}

/* Handle update_config command */
void handle_update_config(cJSON *params)
{
    ESP_LOGI(TAG, "Processing update_config command...");

    nvs_handle_t nvs_handle;
    esp_err_t err;

    // Open NVS namespace
    err = nvs_open("config", NVS_READWRITE, &nvs_handle);
    if (err != ESP_OK) {
        ESP_LOGE(TAG, "Error opening NVS: %s", esp_err_to_name(err));
        return;
    }

    // Update WiFi SSID
    cJSON *wifi_ssid = cJSON_GetObjectItem(params, "wifi_ssid");
    if (wifi_ssid != NULL && cJSON_IsString(wifi_ssid)) {
        const char *new_ssid = wifi_ssid->valuestring;
        ESP_LOGI(TAG, "Updating WiFi SSID to: %s", new_ssid);
        nvs_set_str(nvs_handle, "wifi_ssid", new_ssid);
        // Note: WiFi will reconnect on next reboot with new SSID
    }

    // Update WiFi Password
    cJSON *wifi_password = cJSON_GetObjectItem(params, "wifi_password");
    if (wifi_password != NULL && cJSON_IsString(wifi_password)) {
        const char *new_password = wifi_password->valuestring;
        ESP_LOGI(TAG, "Updating WiFi password (hidden for security)");
        nvs_set_str(nvs_handle, "wifi_password", new_password);
    }

    // Update send interval
    cJSON *send_interval = cJSON_GetObjectItem(params, "send_interval");
    if (send_interval != NULL && cJSON_IsNumber(send_interval)) {
        int new_interval = send_interval->valueint;
        ESP_LOGI(TAG, "Updating send interval to: %d ms", new_interval);
        nvs_set_i32(nvs_handle, "send_interval", new_interval);
        // Update global SEND_INTERVAL if needed (will take effect after restart or task update)
        // extern int g_send_interval;
        // g_send_interval = new_interval;
    }

    // Update device ID
    cJSON *device_id = cJSON_GetObjectItem(params, "device_id");
    if (device_id != NULL && cJSON_IsString(device_id)) {
        const char *new_device_id = device_id->valuestring;
        ESP_LOGI(TAG, "Updating device ID to: %s", new_device_id);
        nvs_set_str(nvs_handle, "device_id", new_device_id);
        // Note: Device ID change will take effect after reboot
    }

    // Commit changes
    err = nvs_commit(nvs_handle);
    if (err != ESP_OK) {
        ESP_LOGE(TAG, "Error committing NVS: %s", esp_err_to_name(err));
    } else {
        ESP_LOGI(TAG, "Configuration updated successfully!");
        ESP_LOGI(TAG, "Note: WiFi changes will take effect after reboot");
    }

    nvs_close(nvs_handle);
}

// ============================================
// MODIFIED: send_sensor_data_to_server with response handling
// ============================================

/* Send sensor data to server via HTTP POST - IMPROVED VERSION */
esp_err_t send_sensor_data_to_server_improved(void)
{
    ESP_LOGI(TAG, "Sending sensor data to server...");

    // Update simulated sensor values
    update_simulated_sensors();

    // Create JSON payload
    cJSON *root = cJSON_CreateObject();
    cJSON *sensors = cJSON_CreateArray();

    // Temperature sensor
    cJSON *temp_sensor = cJSON_CreateObject();
    cJSON_AddStringToObject(temp_sensor, "type", "temperature");
    cJSON_AddNumberToObject(temp_sensor, "value", simulated_temperature);
    cJSON_AddStringToObject(temp_sensor, "unit", "°C");
    cJSON_AddStringToObject(temp_sensor, "timestamp", get_current_timestamp());
    cJSON_AddItemToArray(sensors, temp_sensor);

    // Humidity sensor
    cJSON *humidity_sensor = cJSON_CreateObject();
    cJSON_AddStringToObject(humidity_sensor, "type", "humidity");
    cJSON_AddNumberToObject(humidity_sensor, "value", simulated_humidity);
    cJSON_AddStringToObject(humidity_sensor, "unit", "%");
    cJSON_AddStringToObject(humidity_sensor, "timestamp", get_current_timestamp());
    cJSON_AddItemToArray(sensors, humidity_sensor);

    // Add device ID and sensors array to root
    cJSON_AddStringToObject(root, "deviceId", DEVICE_ID);
    cJSON_AddItemToObject(root, "sensors", sensors);

    // Optional: Add firmware and MAC address
    uint8_t mac[6];
    esp_wifi_get_mac(WIFI_IF_STA, mac);
    char mac_str[18];
    snprintf(mac_str, sizeof(mac_str), "%02x:%02x:%02x:%02x:%02x:%02x",
             mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
    cJSON_AddStringToObject(root, "firmware", "1.0.0");
    cJSON_AddStringToObject(root, "macAddress", mac_str);

    // Convert to string
    char *json_payload = cJSON_Print(root);
    ESP_LOGI(TAG, "JSON Payload: %s", json_payload);

    // Configure HTTP client WITH event handler
    esp_http_client_config_t config = {
        .url = SERVER_URL,
        .method = HTTP_METHOD_POST,
        .timeout_ms = 10000,
        .event_handler = http_event_handler,  // ← ADD THIS to capture response
    };

    esp_http_client_handle_t client = esp_http_client_init(&config);

    // Set headers
    esp_http_client_set_header(client, "Content-Type", "application/json");
    esp_http_client_set_header(client, "User-Agent", "ESP32/1.0");

    // Set POST data
    esp_http_client_set_post_field(client, json_payload, strlen(json_payload));

    // Perform HTTP request (now with response handling)
    esp_err_t err = esp_http_client_perform(client);

    if (err == ESP_OK) {
        int status_code = esp_http_client_get_status_code(client);
        ESP_LOGI(TAG, "HTTP POST Status = %d", status_code);

        if (status_code == 200) {
            ESP_LOGI(TAG, "Sensor data sent successfully!");
            // Response will be handled by http_event_handler
        } else {
            ESP_LOGW(TAG, "Server returned status code: %d", status_code);
            // Try to read error response
            int content_length = esp_http_client_get_content_length(client);
            if (content_length > 0) {
                char *error_buffer = (char *)malloc(content_length + 1);
                if (error_buffer != NULL) {
                    int data_read = esp_http_client_read_response(client, error_buffer, content_length);
                    if (data_read > 0) {
                        error_buffer[data_read] = '\0';
                        ESP_LOGE(TAG, "Error response: %s", error_buffer);
                    }
                    free(error_buffer);
                }
            }
        }
    } else {
        ESP_LOGE(TAG, "HTTP POST request failed: %s", esp_err_to_name(err));
    }

    // Cleanup
    esp_http_client_cleanup(client);
    cJSON_Delete(root);
    free(json_payload);

    return err;
}

// ============================================
// INSTRUCTIONS
// ============================================

/*
 * TO UPDATE YOUR CODE:
 * 
 * 1. Replace your send_sensor_data_to_server() function with 
 *    send_sensor_data_to_server_improved() above
 * 
 * 2. Add these function prototypes at the top:
 *    void process_server_response(const char *response_json);
 *    void execute_server_command(cJSON *command);
 *    void handle_update_config(cJSON *params);
 *    esp_err_t http_event_handler(esp_http_client_event_t *evt);
 * 
 * 3. Update sensor_data_sender_task() to call:
 *    send_sensor_data_to_server_improved();
 *    instead of send_sensor_data_to_server();
 * 
 * 4. Now ESP32 will:
 *    ✅ Send sensor data
 *    ✅ Receive server response
 *    ✅ Parse pending commands
 *    ✅ Execute commands (update WiFi, device ID, interval)
 *    ✅ Save config to NVS
 */

