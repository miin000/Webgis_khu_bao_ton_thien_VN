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

        // Backend API endpoint
        apiBaseUrl: 'http://' + host + ':3001/api/v1',

        // GeoServer endpoints
        wmsUrl:   'http://' + host + ':8080/geoserver/baoton_vn/wms',
        wfsUrl:   'http://' + host + ':8080/geoserver/baoton_vn/wfs',
        vnWmsUrl: 'http://' + host + ':8080/geoserver/bao_ton_thien_viet_nam/wms',

        // Lop khu bao ton tren GeoServer (uu tien postgis)
        protectedAreasLayerName: 'baoton_vn:protected_area_vn_postgis',
        protectedAreasLayerFallbackName: 'baoton_vn:protected_area_vn',

        // Màu theo loại khu bảo tồn
        TYPE_COLORS: {
            'Vườn quốc gia':                 '#00aa25',
            'Khu bảo tồn thiên nhiên':       '#00ffdd',
            'Khu dự trữ thiên nhiên':        '#006e7f',
            'Khu bảo tồn loài và sinh cảnh': '#ed8bba',
            'Khu bảo vệ cảnh quan':          '#7b5ea7',
            'Khu dự trữ sinh quyển':         '#70a6e7'
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
        },

        // Giá trị cố định gợi ý cho form CRUD (sẽ được merge với metadata từ backend)
        FIXED_OPTIONS: {
            types: [
                'Khu bảo tồn loài và sinh cảnh',
                'Khu bảo tồn thiên nhiên',
                'Khu dự trữ sinh quyển',
                'Khu dự trữ thiên nhiên',
                'Khu bảo vệ cảnh quan',
                'Vườn quốc gia'
            ],
            regions: [
                'Trung du và miền núi phía Bắc',
                'Đồng bằng Bắc Bộ',
                'Bắc Trung Bộ',
                'Nam Trung Bộ',
                'Tây Nguyên',
                'Đông Nam Bộ',
                'Tây Nam Bộ'
            ],
            layers: [
                'bao_ton_loai_du_tru_sinh_quyen',
                'du_tru_thien_nhien',
                'khu_bao_ve_canh_quan',
                'khu_vuon_quoc_gia'
            ]
        }
    };
}());

/** Trả về mã màu hex tương ứng với loại khu bảo tồn. */
GIS.getColor = function (type) {
    return GIS.config.TYPE_COLORS[String(type || '').trim()] || '#888888';
};
