/**
 * stats.js — Thong ke so luong khu bao ton theo loai va theo vung.
 */

GIS.initStats = function () {
    var cfg = GIS.config;
    var btnReloadStats = document.getElementById('btnReloadStats');
    var statsTypeBody = document.querySelector('#statsTypeTable tbody');
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

    function renderType(items) {
        if (!statsTypeBody) return;
        if (!items || !items.length) {
            statsTypeBody.innerHTML = '<tr><td colspan="2">Chua co du lieu thong ke</td></tr>';
            return;
        }

        statsTypeBody.innerHTML = items.map(function (item) {
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
        setMessage('Dang tai thong ke...', false);

        apiFetch('/statistics/types')
            .then(function (data) {
                renderType(data.items || []);
                setMessage('Tong so doi tuong: ' + Number(data.total || 0).toLocaleString('vi-VN'), false);
            })
            .catch(function (error) {
                renderType([]);
                setMessage('Loi tai thong ke theo loai: ' + error.message, true);
            });

        apiFetch('/statistics/regions')
            .then(function (data) {
                renderRegion(data.items || []);
            })
            .catch(function () {
                renderRegion([]);
            });
    }

    if (btnReloadStats) {
        btnReloadStats.addEventListener('click', loadStats);
    }

    loadStats();
};
