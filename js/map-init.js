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


    // Quay trở lại vị trí

var locateButton = L.control({position:'topleft'});

locateButton.onAdd = function(map){

    var div = L.DomUtil.create('div','leaflet-bar');

    div.innerHTML = '<button id="locateBtn" style="padding:5px">🧭</button>';

    return div;
};

locateButton.addTo(map);


document.addEventListener("click", function(e){

    if(e.target && e.target.id === "locateBtn"){

        map.locate();

    }

});

// lấy vị trí người dùng 

map.locate();

map.on('locationfound', function(e){

    var userLatLng = e.latlng;   // lưu vị trí của bạn

    map.setView(userLatLng, 13);

    L.marker(userLatLng)
        .addTo(map)
        .bindPopup(" Bạn đang ở đây")
        .openPopup();

    L.circle(userLatLng, e.accuracy).addTo(map);

    findNearestReserve(userLatLng);   // gọi hàm tìm khu bảo tồn gần nhất
});

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



function findNearestReserve(userLatLng){

    var nearest = null;
    var minDistance = Infinity;

    protectedAreasLayer.eachLayer(function(layer){

        var reserveLatLng = layer.getLatLng();

        var distance = map.distance(userLatLng, reserveLatLng);

        if(distance < minDistance){
            minDistance = distance;
            nearest = layer;
        }

    });

    if(nearest){

        nearest.openPopup();

        alert("Khu bảo tồn gần nhất cách bạn " + 
              (minDistance/1000).toFixed(2) + " km");

    }
}



