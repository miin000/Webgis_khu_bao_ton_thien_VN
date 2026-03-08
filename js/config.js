/**
 * config.js — Cấu hình toàn cục
 * URLs GeoServer, phạm vi bản đồ, bảng màu theo loại khu bảo tồn, nhãn field.
 */

var GIS = {};

GIS.config = (function () {
    var host = window.location.hostname || 'localhost';
    return {
        center: [16.047079, 108.206230],
        bounds: L.latLngBounds(L.latLng(7.5, 101.0), L.latLng(24.0, 115.0)),

        // GeoServer endpoints
        wmsUrl:   'http://' + host + ':8080/geoserver/baoton_vn/wms',
        wfsUrl:   'http://' + host + ':8080/geoserver/baoton_vn/wfs',
        vnWmsUrl: 'http://' + host + ':8080/geoserver/bao_ton_thien_viet_nam/wms',

        // Màu theo loại khu bảo tồn
        TYPE_COLORS: {
            'Vườn quốc gia':                 '#1a7a2e',
            'Khu bảo tồn thiên nhiên':       '#0f7b6c',
            'Khu dự trữ thiên nhiên':        '#0d8a9e',
            'Khu bảo tồn loài và sinh cảnh': '#e07b00',
            'Khu bảo vệ cảnh quan':          '#7b5ea7',
            'Khu dự trữ sinh quyển':         '#2c6fbf'
        },

        // Nhãn hiển thị cho từng trường trong bảng chi tiết
        FIELD_LABELS: {
            name:       'Tên khu bảo tồn',
            type:       'Loại hình',
            region:     'Vùng',
            founded:    'Năm thành lập',
            area:       'Diện tích (ha)',
            address:    'Địa chỉ',
            management: 'Cơ quan quản lý'
        }
    };
}());

/** Trả về mã màu hex tương ứng với loại khu bảo tồn. */
GIS.getColor = function (type) {
    return GIS.config.TYPE_COLORS[String(type || '').trim()] || '#888888';
};
