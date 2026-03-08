/**
 * map-init.js — Khởi tạo bản đồ Leaflet và các lớp nền.
 *
 * Trả về object { map, osm, esriWorldImagery, provincesWms }
 * để các module khác (controls, protected-areas) sử dụng.
 */

GIS.initMap = function () {
    var cfg = GIS.config;

    // ── Khởi tạo bản đồ ──────────────────────────────────────────────────────
    var map = L.map('map', {
        center:             cfg.center,
        zoom:               6,
        minZoom:            5,
        maxZoom:            19,
        maxBounds:          cfg.bounds,
        maxBoundsViscosity: 1.0
    });

    map.fitBounds(cfg.bounds.pad(-0.1));

    // ── Lớp nền ───────────────────────────────────────────────────────────────
    var osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    });

    var esriWorldImagery = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 19, attribution: 'Tiles &copy; Esri' }
    );

    osm.addTo(map);

    // ── Ranh giới tỉnh (WMS) ─────────────────────────────────────────────────
    var provincesWms = L.tileLayer.wms(cfg.vnWmsUrl, {
        layers:      'bao_ton_thien_viet_nam:vietnam_provines',
        format:      'image/png',
        transparent: true,
        version:     '1.1.1',
        attribution: 'GeoServer'
    }).addTo(map);

    return { map: map, osm: osm, esriWorldImagery: esriWorldImagery, provincesWms: provincesWms };
};
