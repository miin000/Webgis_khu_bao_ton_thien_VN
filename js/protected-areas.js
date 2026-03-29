/**
 * protected-areas.js — Lớp khu bảo tồn thiên nhiên.
 *
 * Chức năng:
 * - Tải dữ liệu GeoJSON từ GeoServer WFS
 * - Vẽ circleMarker với màu theo loại khu bảo tồn
 * - Xây dựng bộ lọc checkbox theo loại
 * - Hiển thị bảng thông tin chi tiết khi click vào điểm
 * - Fallback sang WMS nếu WFS bị lỗi CORS
 */

GIS.initProtectedAreas = function (map) {
    var cfg = GIS.config;

    // ── Trạng thái nội bộ ────────────────────────────────────────────────────
    var rawData = null;   // toàn bộ GeoJSON nhận được từ WFS
    var activeTypes = {};     // { 'Vườn quốc gia': true/false, ... }
    var geoJsonLayer = null;   // layer đang hiển thị trên bản đồ
    var selectedLayer = null;  // điểm đang được chọn (highlight)
    var searchTerm = ''; // Lưu từ khóa tìm kiếm tên
    var selectedProvince = ''; // Lưu tỉnh được chọn
    var searchYear = '';// luu nam

    var wfsUrl = cfg.wfsUrl
        + '?service=WFS&version=1.0.0&request=GetFeature'
        + '&typeName=baoton_vn:protected_area_vn&outputFormat=application/json';
    var apiGeoJsonUrl = cfg.apiBaseUrl + '/protected-areas/geojson';

    // ─────────────────────────────────────────────────────────────────────────
    // Bảng chi tiết
    // ─────────────────────────────────────────────────────────────────────────

    function showDetail(props) {
        var el = document.getElementById('detailContent');
        if (!el) return;

        var keys = ['name', 'type', 'region', 'founded', 'area', 'address', 'management'];
        var rows = '';

        keys.forEach(function (k) {
            var val = props[k];
            if (val === null || val === undefined || val === '') return;
            if (k === 'area') val = Number(val).toLocaleString('vi-VN');
            var label = cfg.FIELD_LABELS[k] || k;
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

    // ─────────────────────────────────────────────────────────────────────────
    // Highlight điểm được chọn
    // ─────────────────────────────────────────────────────────────────────────

    function highlightLayer(layer) {
        if (selectedLayer) {
            selectedLayer.setStyle({ weight: 1, opacity: 0.7 });
            selectedLayer.setRadius(7);
        }
        selectedLayer = layer;
        layer.setStyle({ weight: 3, opacity: 1 });
        layer.setRadius(10);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Render lớp GeoJSON lên bản đồ
    // ─────────────────────────────────────────────────────────────────────────

    function renderLayer() {
        if (geoJsonLayer) { map.removeLayer(geoJsonLayer); geoJsonLayer = null; }
        if (!rawData) return;

        selectedLayer = null;
        clearDetail();

        geoJsonLayer = L.geoJSON(rawData, {

            // Vẽ mỗi feature dạng circleMarker, màu theo loại
            pointToLayer: function (feature, latlng) {
                var color = GIS.getColor(feature.properties && feature.properties.type);
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
                var p = feature.properties || {};

                //  Lọc theo checkbox Loại
                var t = String(p.type || '').trim();
                var typeMatch = activeTypes[t] !== false;

                //  Lọc theo từ khóa Tìm kiếm Tên
                var nameMatch = true;
                if (searchTerm) {
                    nameMatch = (p.name || '').toLowerCase().includes(searchTerm);
                }

                // Lọc theo Tỉnh/Địa chỉ
                var provinceMatch = true;
                if (selectedProvince) {
                    provinceMatch = (p.address || '').includes(selectedProvince);
                }
                // Lọc theo Năm thành lập 
                var yearMatch = true;
                if (searchYear) {

                    yearMatch = String(p.founded || '').includes(searchYear);
                }

                return typeMatch && nameMatch && provinceMatch && yearMatch;;
            },

            onEachFeature: function (feature, layer) {
                layer.on('click', function () {
                    highlightLayer(layer);
                    showDetail(feature.properties || {});
                });
            }
        }).addTo(map);
        window.protectedAreasLayer = geoJsonLayer;
    }

    function updateProvinceList(data) {
        var provinceSet = new Set();
        (data.features || []).forEach(function (f) {
            var addr = f.properties && f.properties.address;
            if (addr) provinceSet.add(addr.trim());
        });

        var datalist = document.getElementById('provinceList');
        if (!datalist) return;

        var sorted = Array.from(provinceSet).sort();
        datalist.innerHTML = sorted.map(function (t) {
            return '<option value="' + t + '">';
        }).join('');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Bộ lọc checkbox theo loại khu bảo tồn
    // ─────────────────────────────────────────────────────────────────────────

    function buildFilter(types) {
        var container = document.getElementById('filterContainer');
        if (!container) return;

        var html = '';
        types.forEach(function (t) {
            var color = GIS.getColor(t);
            var safe = t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
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

    function processData(data) {
        rawData = data;

        // Thu thập các loại khu bảo tồn có trong dữ liệu
        var types = {};
        (data.features || []).forEach(function (f) {
            var t = String((f.properties && f.properties.type) || '').trim();
            if (t) { types[t] = true; activeTypes[t] = true; }
        });

        updateProvinceList(data);
        buildFilter(Object.keys(types).sort());
        renderLayer();
    }

    function loadFromWfs() {
        return fetch(wfsUrl)
            .then(function (r) {
                if (!r.ok) throw new Error('WFS HTTP ' + r.status);
                return r.json();
            })
            .then(processData);
    }

    function loadPreferredSource() {
        fetch(apiGeoJsonUrl)
            .then(function (r) {
                if (!r.ok) throw new Error('API HTTP ' + r.status);
                return r.json();
            })
            .then(processData)
            .catch(function (apiErr) {
                console.warn('API thất bại, chuyển sang WFS:', apiErr);
                loadFromWfs().catch(function (wfsErr) {
                    // WFS bị lỗi (thường do CORS) → dùng WMS làm fallback
                    console.warn('WFS thất bại, dùng WMS fallback:', wfsErr);

                    var el = document.getElementById('filterContainer');
                    if (el) el.innerHTML =
                        '<p class="filter-error">Không tải được API/WFS.<br>Vui lòng kiểm tra backend hoặc CORS GeoServer.</p>';

                    L.tileLayer.wms(cfg.wmsUrl, {
                        layers: 'baoton_vn:protected_area_vn',
                        format: 'image/png',
                        transparent: true,
                        version: '1.1.1'
                    }).addTo(map);
                });
            });
    }

    // Expose for admin CRUD so map can be refreshed after create/update/delete.
    GIS.refreshProtectedAreas = loadPreferredSource;


    var inputSearch = document.getElementById('mapSearchInput');
    if (inputSearch) {
        inputSearch.addEventListener('input', function () {
            searchTerm = this.value.toLowerCase().trim();
            renderLayer();

            // Zoom đến khu bảo tồn tìm được
            if (!searchTerm || !geoJsonLayer) return;

            var found = false;

            geoJsonLayer.eachLayer(function (l) {
                if (found) return;

                let ten = (l.feature.properties.name || '').toLowerCase();

                if (ten.includes(searchTerm)) {
                    map.setView(l.getLatLng(), 12); // zoom đúng điểm
                    highlightLayer(l);              // highlight
                    found = true;
                }
            });
        });
    }

    var inputProv = document.getElementById('filterProvince');
    if (inputProv) {
        inputProv.addEventListener('input', function () {
            selectedProvince = this.value.trim();
            renderLayer();
        });
    }
    var inputYear = document.getElementById('filterYear');
    if (inputYear) {
        inputYear.addEventListener('input', function () {
            searchYear = this.value.trim();
            renderLayer();
        });
    }
    // ─────────────────────────────────────────────────────────────────────────
    // Tải dữ liệu API (ưu tiên) -> WFS -> WMS
    // ─────────────────────────────────────────────────────────────────────────
    loadPreferredSource();
};