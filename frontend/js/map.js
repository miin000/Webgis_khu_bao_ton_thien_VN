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
    var map = layers.map;

    // Bước 2 – tải và hiển thị khu bảo tồn
    GIS.initProtectedAreas(map);

    // Bước 2b – bật giao diện CRUD và logs
    GIS.initAdmin(map);

    // Bước 2c – tải thống kê theo loại khu bảo tồn
    GIS.initStats();

    // Bước 3 – gắn các điều khiển UI
    GIS.initControls(map, layers);

    GIS.onMainTabChanged = function (tabId) {
        if (tabId === 'pageMap') {
            setTimeout(function () {
                map.invalidateSize();
            }, 50);
        }
    };

    var drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);

    var drawControl = new L.Control.Draw({
        draw: {
            polyline: true,
            polygon: true,
            rectangle: true,
            circle: false,
            marker: false
        },
        edit: {
            featureGroup: drawnItems
        }
    });
    map.addControl(drawControl);

    map.on(L.Draw.Event.CREATED, function (e) {
        var layer = e.layer;
        drawnItems.addLayer(layer);

        var geojson = layer.toGeoJSON();

        if (e.layerType === 'polyline') {
            let length = turf.length(geojson, { units: 'kilometers' });
            layer.bindPopup("Khoảng cách: " + length.toFixed(2) + " km").openPopup();
        }

        if (e.layerType === 'polygon' || e.layerType === 'rectangle') {
            let area = turf.area(geojson);
            layer.bindPopup("Diện tích: " + (area / 1000000).toFixed(2) + " km²").openPopup();
        }
    });

    // ================= IN BẢN ĐỒ =================
    L.control.browserPrint({
        position: 'topleft',
        title: 'In bản đồ',
        documentTitle: 'Ban_do_khu_bao_ton'
    }).addTo(map);

    GIS.onMainTabChanged = function (tabId) {
        if (tabId === 'pageMap') {
            setTimeout(function () {
                map.invalidateSize();
            }, 50);
        }
    };
});

