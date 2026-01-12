document.addEventListener('DOMContentLoaded', function() {
    
    // Set Việt Nam bounds khi tải bản đồ (mở rộng để bao gồm các đảo Hoàng Sa, Trường Sa)
    var vietnamBounds = L.latLngBounds(
        L.latLng(7.5, 101.0),   // Góc Tây Nam (mở rộng)
        L.latLng(24.0, 115.0)   // Góc Đông Bắc (bao gồm đảo)
    );
    var vietnamCenter = [16.047079, 108.206230]; // Tọa độ trung tâm Việt Nam (Đà Nẵng)

    // Khởi tạo bản đồ với các tùy chọn ghim Việt Nam
    var map = L.map('map', {
        center: vietnamCenter,
        zoom: 6,
        minZoom: 5,           // Zoom tối thiểu để không zoom ra quá xa
        maxZoom: 19,          // Zoom tối đa
        maxBounds: vietnamBounds,        // Giới hạn vùng xem trong lãnh thổ Việt Nam
        maxBoundsViscosity: 1.0          // Không cho kéo ra ngoài vùng giới hạn (1.0 = cứng hoàn toàn)
    });
    
    // Fit map vào bounds Việt Nam khi lần đầu tải
    map.fitBounds(vietnamBounds.pad(-0.1)); // pad(-0.1) để có khoảng trống nhỏ

    // Thêm tile layer từ OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);


});