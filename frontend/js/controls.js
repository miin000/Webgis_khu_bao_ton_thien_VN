/**
 * controls.js — Các điều khiển UI trên bản đồ.
 *
 * Bao gồm:
 *  - Nút Home (về toàn cảnh Việt Nam)
 *  - Layer switcher (chọn nền + overlay)
 *  - Thước tỉ lệ
 *  - Thanh trạng thái (tọa độ, zoom)
 */

GIS.initControls = function (map, layers) {
    var cfg = GIS.config;

    // ── Nút về toàn cảnh ─────────────────────────────────────────────────────
    var HomeControl = L.Control.extend({
        options: { position: 'topleft' },

        onAdd: function () {
            var container = L.DomUtil.create('div', 'leaflet-bar');
            var button    = L.DomUtil.create('button', 'zoom-home-btn', container);

            button.type = 'button';
            button.title = 'Về toàn cảnh Việt Nam';
            button.setAttribute('aria-label', 'Về toàn cảnh Việt Nam');
            button.innerHTML = '&#8962;';

            L.DomEvent.disableClickPropagation(container);
            L.DomEvent.on(button, 'click', function () {
                map.fitBounds(cfg.bounds.pad(-0.1));
            });

            return container;
        }
    });

    map.addControl(new HomeControl());

    // ── Chọn lớp nền + overlay ────────────────────────────────────────────────
    L.control.layers(
        {
            'Nền OSM':          layers.osm,
            'Nền vệ tinh Esri': layers.esriWorldImagery
        },
        {
            'Ranh giới tỉnh': layers.provincesWms
        },
        { collapsed: false }
    ).addTo(map);

    // ── Thước tỉ lệ ──────────────────────────────────────────────────────────
    L.control.scale({ imperial: false }).addTo(map);

    // ── Thanh trạng thái (tọa độ + zoom) ─────────────────────────────────────
    var statusCoordsEl = document.getElementById('statusCoords');
    var statusZoomEl   = document.getElementById('statusZoom');
    var btnResetView   = document.getElementById('btnResetView');

    function updateStatus(latlng) {
        if (statusZoomEl)
            statusZoomEl.textContent = 'Zoom: ' + map.getZoom();
        if (statusCoordsEl && latlng)
            statusCoordsEl.textContent =
                'Tọa độ: ' + latlng.lat.toFixed(5) + ', ' + latlng.lng.toFixed(5);
    }

    if (btnResetView) {
        btnResetView.addEventListener('click', function () {
            map.fitBounds(cfg.bounds.pad(-0.1));
        });
    }

    updateStatus(L.latLng(cfg.center[0], cfg.center[1]));
    map.on('zoomend',   function ()  { updateStatus(map.getCenter()); });
    map.on('mousemove', function (e) { updateStatus(e.latlng); });
};
