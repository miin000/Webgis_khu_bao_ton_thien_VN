/**
 * map.js — Điểm khởi đầu ứng dụng WebGIS.
 *
 * Sau khi DOM sẵn sàng, khởi chạy lần lượt:
 *  1. GIS.initMap()              → tạo bản đồ + lớp nền
 *  2. GIS.initProtectedAreas()   → lớp khu bảo tồn (WFS + filter + detail)
 *  3. GIS.initControls()         → nút Home, layer switcher, status bar
 *
 * Mỗi module được định nghĩa trong file riêng:
 *  config.js            – cấu hình chung (URLs, màu, nhãn)
 *  map-init.js          – khởi tạo Leaflet và lớp nền
 *  protected-areas.js   – lớp khu bảo tồn
 *  controls.js          – các điều khiển UI
 */

document.addEventListener('DOMContentLoaded', function () {
    // Bước 1 – tạo bản đồ, trả về { map, osm, esriWorldImagery, provincesWms }
    var layers = GIS.initMap();
    var map    = layers.map;

    // Bước 2 – tải và hiển thị khu bảo tồn
    GIS.initProtectedAreas(map);

    // Bước 3 – gắn các điều khiển UI
    GIS.initControls(map, layers);
});