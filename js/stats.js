/**
 * stats.js — Thong ke so luong khu bao ton theo loai.
 */

GIS.initStats = function () {
    var cfg = GIS.config;
    var btnReloadStats = document.getElementById('btnReloadStats');
    var statsBody = document.querySelector('#statsTypeTable tbody');
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

    function loadStats() {
        setMessage('Dang tai thong ke...', false);
        apiFetch('/statistics/types')
            .then(function (data) {
                render(data.items || []);
                setMessage('Tong so doi tuong: ' + Number(data.total || 0).toLocaleString('vi-VN'), false);
            })
            .catch(function (error) {
                render([]);
                setMessage('Khong tai duoc thong ke: ' + error.message, true);
            });
    }

    if (btnReloadStats) {
        btnReloadStats.addEventListener('click', loadStats);
    }

    loadStats();
};
