/**
 * map-init.js — Khởi tạo bản đồ Leaflet và các lớp nền.
 */

GIS.initMap = function () {
    var cfg = GIS.config;

    // ── Khởi tạo bản đồ ─────────────────────────────
    var map = L.map('map', {
        center: cfg.center,
        zoom: 6,
        minZoom: 5,
        maxZoom: 19,
        maxBounds: cfg.bounds,
        maxBoundsViscosity: 1.0
    });

    map.fitBounds(cfg.bounds.pad(-0.1));

    // Lấy vị trí người dùng 
    var locateButton = L.control({ position: 'topleft' });

    locateButton.onAdd = function () {
        var div = L.DomUtil.create('div', 'leaflet-bar');

        var btn = L.DomUtil.create('button', '', div);
        btn.innerHTML = '🧭';
        btn.style.padding = '5px';

        L.DomEvent.on(btn, 'click', function (e) {
            L.DomEvent.stopPropagation(e);

            map.locate({
                setView: true,
                maxZoom: 13,
                enableHighAccuracy: true
            });
        });

        return div;
    };

    locateButton.addTo(map);

    // Tìm khu gần nhất 

    var nearestButton = L.control({ position: 'topleft' });

    nearestButton.onAdd = function () {
        var div = L.DomUtil.create('div', 'leaflet-bar');

        var btn = L.DomUtil.create('button', '', div);
        btn.innerHTML = '🌿';
        btn.style.padding = '5px';

        L.DomEvent.on(btn, 'click', function (e) {
            L.DomEvent.stopPropagation(e);

            map.locate();

            map.once('locationfound', function (e) {
                findNearestReserve(map, e.latlng);
            });
        });

        return div;
    };

    nearestButton.addTo(map);

    // Hiện thị vị trí người dùng 
    var userMarker = null;
    var userCircle = null;

    map.on('locationfound', function (e) {

        var userLatLng = e.latlng;

        if (userMarker) map.removeLayer(userMarker);
        if (userCircle) map.removeLayer(userCircle);

        userMarker = L.marker(userLatLng)
            .addTo(map)
            .bindPopup("📍 Bạn đang ở đây")
            .openPopup();

        userCircle = L.circle(userLatLng, e.accuracy).addTo(map);
    });

    // LỚP NỀN
    var osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap'
    });

    var esriWorldImagery = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 19 }
    );

    osm.addTo(map);

    // Ranh giới tỉnh 

    var provincesWms = L.tileLayer.wms(cfg.vnWmsUrl, {
        layers: 'bao_ton_thien_viet_nam:vietnam_provines',
        format: 'image/png',
        transparent: true,
        version: '1.1.1'
    }).addTo(map);

    return { map, osm, esriWorldImagery, provincesWms };
};
─
// Hàm tìm khu gần nhất 
function findNearestReserve(map, userLatLng){

    if(!window.protectedAreasLayer){
        alert("Chưa có dữ liệu khu bảo tồn!");
        return;
    }

    var nearest = null;
    var minDistance = Infinity;

    window.protectedAreasLayer.eachLayer(function(layer){

        var reserveLatLng = layer.getLatLng();
        var distance = map.distance(userLatLng, reserveLatLng);

        if(distance < minDistance){
            minDistance = distance;
            nearest = layer;
        }

    });

    if(nearest){

        var km = (minDistance/1000).toFixed(2);
        var name = nearest.feature.properties.name || "Không rõ";

        map.setView(nearest.getLatLng(), 13);

        nearest.bindPopup(
            "<b>🌿 " + name + "</b><br>" +
            "Khoảng cách: <b>" + km + " km</b>"
        ).openPopup();
    }
}