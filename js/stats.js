/**
 * stats.js — Thong ke so luong khu bao ton theo loai.
 */

GIS.initStats = function () {
    var cfg = GIS.config;
    var btnReloadStats = document.getElementById('btnReloadStats');
    var statsBody = document.querySelector('#statsTypeTable tbody');
    var statsRegionBody = document.querySelector('#statsRegionTable tbody');
    var statsMessage = document.getElementById('statsMessage');

    function setMessage(text, isError) {
        if (!statsMessage) return;
        statsMessage.textContent = text || '';
        statsMessage.classList.toggle('error', !!isError);
    }

    function apiFetch(path) {
        return fetch(cfg.apiBaseUrl + path).then(function (res) {
            return res.json().catch(function () { return {}; }).then(function (data) {
                if (!res.ok) throw new Error(data.message || ('HTTP ' + res.status));
                return data;
            });
        });
    }

    function render(items) {
        if (!statsBody) return;
        if (!items || !items.length) {
            statsBody.innerHTML = '<tr><td colspan="2">Chua co du lieu thong ke</td></tr>';
            return;
        }

        statsBody.innerHTML = items.map(function (item) {
            return '<tr><td>' + (item.type || '') + '</td><td>' + Number(item.total || 0).toLocaleString('vi-VN') + '</td></tr>';
        }).join('');
    }
    function renderRegion(items) {
        if (!statsRegionBody) return;
        if (!items || !items.length) {
            statsRegionBody.innerHTML = '<tr><td colspan="2">Chua co du lieu thong ke</td></tr>';
            return;
        }

        statsRegionBody.innerHTML = items.map(function (item) {
            return '<tr><td>' + (item.region || '') + '</td><td>' + Number(item.total || 0).toLocaleString('vi-VN') + '</td></tr>';
        }).join('');
    }
    function loadStats() {
        setMessage('Đang tải dữ liệu...', false);

        // Tải thống kê Loại
        apiFetch('/statistics/types')
            .then(function (data) {
                render(data.items || []);
                // Chỉ hiện tổng số khi tải thành công Loại
                setMessage('Tổng số đối tượng: ' + Number(data.total || 0).toLocaleString('vi-VN'), false);
            })
            .catch(function (error) {
                render([]);
                setMessage('Lỗi tải Loại: ' + error.message, true); // Ghi rõ lỗi ở đâu
            });

        // Tải thống kê Vùng
        apiFetch('/statistics/regions')
            .then(function (data) {
                renderRegion(data.items || []);
            })
            .catch(function (error) {
                console.error('Lỗi vùng:', error.message);
                renderRegion([]);
                // Không dùng setMessage ở đây để tránh đè lên thông báo của bảng Loại
            });
    }

    if (btnReloadStats) {
        btnReloadStats.addEventListener('click', loadStats);
    }

    loadStats();
};
