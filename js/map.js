document.addEventListener('DOMContentLoaded', function () {
    var vietnamBounds = L.latLngBounds(
        L.latLng(7.5, 101.0),
        L.latLng(24.0, 115.0)
    );
    var vietnamCenter = [16.047079, 108.206230];

    var geoserverHost = window.location.hostname || 'localhost';
    var geoserverWmsUrl = 'http://' + geoserverHost + ':8080/geoserver/baoton_vn/wms';
    var geoserverWfsUrl = 'http://' + geoserverHost + ':8080/geoserver/baoton_vn/wfs';
    var vnWmsUrl = 'http://' + geoserverHost + ':8080/geoserver/bao_ton_thien_viet_nam/wms';

    var map = L.map('map', {
        center: vietnamCenter,
        zoom: 6,
        minZoom: 5,
        maxZoom: 19,
        maxBounds: vietnamBounds,
        maxBoundsViscosity: 1.0
    });

    map.fitBounds(vietnamBounds.pad(-0.1));

    // ── Nền bản đồ ────────────────────────────────────────────────────────────
    var osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    });

    var esriWorldImagery = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 19, attribution: 'Tiles &copy; Esri' }
    );

    osm.addTo(map);

    // ── Ranh giới tỉnh (WMS – workspace riêng) ──────────────────────────────
    var provincesWms = L.tileLayer.wms(vnWmsUrl, {
        layers: 'bao_ton_thien_viet_nam:vietnam_provines',
        format: 'image/png',
        transparent: true,
        version: '1.1.1',
        attribution: 'GeoServer'
    }).addTo(map);

    // ── Màu theo loại khu bảo tồn ────────────────────────────────────────────
    var TYPE_COLORS = {
        'Vườn quốc gia':                 '#1a7a2e',
        'Khu bảo tồn thiên nhiên':       '#0f7b6c',
        'Khu dự trữ thiên nhiên':        '#0d8a9e',
        'Khu bảo tồn loài và sinh cảnh': '#e07b00',
        'Khu bảo vệ cảnh quan':          '#7b5ea7',
        'Khu dự trữ sinh quyển':         '#2c6fbf'
    };

    function getColor(type) {
        return TYPE_COLORS[String(type || '').trim()] || '#888888';
    }

    // ── WFS – khu bảo tồn (colored circleMarker + filterable) ────────────────
    var rawData    = null;
    var activeTypes = {};
    var geoJsonLayer = null;
    var selectedLayer = null;

    var FIELD_LABELS = {
        name: 'Tên khu bảo tồn', type: 'Loại hình', region: 'Vùng',
        founded: 'Năm thành lập', area: 'Diện tích (ha)', address: 'Địa chỉ',
        management: 'Cơ quan quản lý'
    };

    var wfsUrl = geoserverWfsUrl +
        '?service=WFS&version=1.0.0&request=GetFeature' +
        '&typeName=baoton_vn:protected_area_vn&outputFormat=application/json';

    function showDetail(props) {
        var el = document.getElementById('detailContent');
        if (!el) return;
        var keys = ['name','type','region','founded','area','address','management'];
        var rows = '';
        keys.forEach(function (k) {
            var val = props[k];
            if (val === null || val === undefined || val === '') return;
            if (k === 'area') val = Number(val).toLocaleString('vi-VN');
            var label = FIELD_LABELS[k] || k;
            rows += '<tr><th>' + label + '</th><td>' + String(val) + '</td></tr>';
        });
        el.innerHTML = rows
            ? '<table class="detail-table">' + rows + '</table>'
            : '<p>Không có dữ liệu.</p>';
        var wrap = document.getElementById('detailPanel');
        if (wrap) wrap.hidden = false;
    }

    function clearDetail() {
        var wrap = document.getElementById('detailPanel');
        if (wrap) wrap.hidden = true;
    }

    function highlightLayer(layer) {
        if (selectedLayer) {
            selectedLayer.setStyle({ weight: 1, opacity: 0.7 });
            selectedLayer.setRadius(7);
        }
        selectedLayer = layer;
        layer.setStyle({ weight: 3, opacity: 1 });
        layer.setRadius(10);
    }

    function renderLayer() {
        if (geoJsonLayer) { map.removeLayer(geoJsonLayer); geoJsonLayer = null; }
        if (!rawData) return;
        selectedLayer = null;
        clearDetail();
        geoJsonLayer = L.geoJSON(rawData, {
            pointToLayer: function (feature, latlng) {
                var color = getColor(feature.properties && feature.properties.type);
                return L.circleMarker(latlng, {
                    radius: 7,
                    fillColor: color,
                    color: '#fff',
                    weight: 1,
                    opacity: 0.7,
                    fillOpacity: 0.85
                });
            },
            filter: function (feature) {
                var t = String((feature.properties && feature.properties.type) || '').trim();
                return activeTypes[t] !== false;
            },
            onEachFeature: function (feature, layer) {
                layer.on('click', function () {
                    highlightLayer(layer);
                    showDetail(feature.properties || {});
                });
            }
        }).addTo(map);
    }

    function buildFilter(types) {
        var container = document.getElementById('filterContainer');
        if (!container) return;
        var html = '';
        types.forEach(function (t) {
            var color = getColor(t);
            var safe  = t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
            html +=
                '<label class="legend-item">' +
                '<input type="checkbox" checked data-type="' + safe + '">' +
                '<span class="legend-dot" style="background:' + color + '"></span>' +
                '<span>' + safe + '</span>' +
                '</label>';
        });
        container.innerHTML = html;
        container.querySelectorAll('input[type=checkbox]').forEach(function (cb) {
            cb.addEventListener('change', function () {
                activeTypes[this.dataset.type] = this.checked;
                renderLayer();
            });
        });
    }

    fetch(wfsUrl)
        .then(function (r) {
            if (!r.ok) throw new Error('WFS HTTP ' + r.status);
            return r.json();
        })
        .then(function (data) {
            rawData = data;
            var types = {};
            (data.features || []).forEach(function (f) {
                var t = String((f.properties && f.properties.type) || '').trim();
                if (t) { types[t] = true; activeTypes[t] = true; }
            });
            buildFilter(Object.keys(types).sort());
            renderLayer();
        })
        .catch(function (err) {
            console.warn('WFS thất bại, dùng WMS fallback:', err);
            var el = document.getElementById('filterContainer');
            if (el) el.innerHTML =
                '<p class="filter-error">Không tải được WFS.<br>' +
                'Vui lòng bật CORS trên GeoServer.</p>';
            L.tileLayer.wms(geoserverWmsUrl, {
                layers: 'baoton_vn:protected_area_vn',
                format: 'image/png',
                transparent: true,
                version: '1.1.1'
            }).addTo(map);
        });

    // ── Layer control ─────────────────────────────────────────────────────────
    L.control.layers(
        { 'Nền OSM': osm, 'Nền vệ tinh Esri': esriWorldImagery },
        { 'Ranh giới tỉnh': provincesWms },
        { collapsed: false }
    ).addTo(map);

    L.control.scale({ imperial: false }).addTo(map);

    var homeControl = L.Control.extend({
        options: { position: 'topleft' },
        onAdd: function () {
            var container = L.DomUtil.create('div', 'leaflet-bar');
            var button = L.DomUtil.create('button', 'zoom-home-btn', container);
            button.type = 'button';
            button.title = 'Về toàn cảnh Việt Nam';
            button.setAttribute('aria-label', 'Về toàn cảnh Việt Nam');
            button.innerHTML = '&#8962;';

            L.DomEvent.disableClickPropagation(container);
            L.DomEvent.on(button, 'click', function () {
                map.fitBounds(vietnamBounds.pad(-0.1));
            });

            return container;
        }
    });

    map.addControl(new homeControl());

    var statusCoordsEl = document.getElementById('statusCoords');
    var statusZoomEl   = document.getElementById('statusZoom');
    var btnResetView   = document.getElementById('btnResetView');

    if (btnResetView) {
        btnResetView.addEventListener('click', function () {
            map.fitBounds(vietnamBounds.pad(-0.1));
        });
    }

    function updateStatus(latlng) {
        if (statusZoomEl) statusZoomEl.textContent = 'Zoom: ' + map.getZoom();
        if (statusCoordsEl && latlng)
            statusCoordsEl.textContent = 'Tọa độ: ' + latlng.lat.toFixed(5) + ', ' + latlng.lng.toFixed(5);
    }

    updateStatus(L.latLng(vietnamCenter[0], vietnamCenter[1]));
    map.on('zoomend',  function ()  { updateStatus(map.getCenter()); });
    map.on('mousemove', function (e) { updateStatus(e.latlng); });
});