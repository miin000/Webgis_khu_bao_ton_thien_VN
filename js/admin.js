/**
 * admin.js — Giao diện CRUD + logs cho khu bao ton.
 */

GIS.initAdmin = function (map) {
    var cfg = GIS.config;
    var fixed = cfg.FIXED_OPTIONS || {};

    var elUser = document.getElementById('crudUserName');
    var elId = document.getElementById('crudId');
    var elName = document.getElementById('crudName');
    var elType = document.getElementById('crudType');
    var elRegion = document.getElementById('crudRegion');
    var elFounded = document.getElementById('crudFounded');
    var elArea = document.getElementById('crudArea');
    var elAddress = document.getElementById('crudAddress');
    var elManagement = document.getElementById('crudManagement');
    var elLayer = document.getElementById('crudLayer');
    var elStatus = document.getElementById('crudStatus');
    var elLng = document.getElementById('crudLng');
    var elLat = document.getElementById('crudLat');

    var btnLoad = document.getElementById('btnCrudLoad');
    var btnCreate = document.getElementById('btnCrudCreate');
    var btnUpdate = document.getElementById('btnCrudUpdate');
    var btnReloadLogs = document.getElementById('btnReloadLogs');
    var btnListPrev = document.getElementById('btnListPrev');
    var btnListNext = document.getElementById('btnListNext');
    var elListPageInfo = document.getElementById('listPageInfo');

    var elCrudMessage = document.getElementById('crudMessage');
    var elLogsMessage = document.getElementById('logsMessage');
    var elApiStatusCrud = document.getElementById('apiStatusCrud');

    var listBody = document.querySelector('#crudListTable tbody');
    var logsBody = document.querySelector('#logsTable tbody');
    var listPage = 1;
    var listPageSize = 50;
    var listLastCount = 0;

    function setCrudMessage(text, isError) {
        if (!elCrudMessage) return;
        elCrudMessage.textContent = text || '';
        elCrudMessage.classList.toggle('error', !!isError);
    }

    function setLogsMessage(text, isError) {
        if (!elLogsMessage) return;
        elLogsMessage.textContent = text || '';
        elLogsMessage.classList.toggle('error', !!isError);
    }

    function setApiStatus(text, isError) {
        if (!elApiStatusCrud) return;
        elApiStatusCrud.textContent = text || '';
        elApiStatusCrud.classList.toggle('error', !!isError);
    }

    function apiFetch(path, options) {
        var headers = {
            'Content-Type': 'application/json',
            'x-user-name': (elUser && elUser.value ? elUser.value : 'admin').trim() || 'admin'
        };

        var config = Object.assign({ method: 'GET' }, options || {});
        config.headers = Object.assign(headers, config.headers || {});

        return fetch(cfg.apiBaseUrl + path, config).then(function (res) {
            return res.json().catch(function () { return {}; }).then(function (data) {
                if (!res.ok) {
                    throw new Error(data.message || ('HTTP ' + res.status));
                }
                return data;
            });
        });
    }

    function uniqueSorted(list) {
        return Array.from(new Set((list || []).filter(Boolean).map(function (v) { return String(v).trim(); })))
            .filter(Boolean)
            .sort();
    }

    function renderSelectOptions(selectEl, options, placeholder) {
        if (!selectEl) return;
        var list = uniqueSorted(options);
        var html = '<option value="">' + (placeholder || 'Chon') + '</option>';
        html += list.map(function (item) {
            var safe = item
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;');
            return '<option value="' + safe + '">' + safe + '</option>';
        }).join('');
        selectEl.innerHTML = html;
    }

    function loadSelectMetadata() {
        renderSelectOptions(elType, fixed.types || [], 'Chon loai khu bao ton');
        renderSelectOptions(elRegion, fixed.regions || [], 'Chon vung');
        renderSelectOptions(elAddress, [], 'Chon tinh/thanh');
        renderSelectOptions(elLayer, fixed.layers || [], 'Chon layer');
        renderSelectOptions(elStatus, ['active', 'hidden'], 'Chon trang thai');
        if (elStatus) elStatus.value = 'active';

        apiFetch('/metadata/options')
            .then(function (data) {
                renderSelectOptions(elType, (fixed.types || []).concat(data.types || []), 'Chon loai khu bao ton');
                renderSelectOptions(elRegion, (fixed.regions || []).concat(data.regions || []), 'Chon vung');
                renderSelectOptions(elAddress, data.addresses || [], 'Chon tinh/thanh');
                renderSelectOptions(elLayer, (fixed.layers || []).concat(data.layers || []), 'Chon layer');
            })
            .catch(function () {
                // Keep fixed dropdown values if metadata endpoint is unavailable.
            });
    }

    function clearForm(keepId) {
        if (!keepId && elId) elId.value = '';
        if (elName) elName.value = '';
        if (elType) elType.value = '';
        if (elRegion) elRegion.value = '';
        if (elFounded) elFounded.value = '';
        if (elArea) elArea.value = '';
        if (elAddress) elAddress.value = '';
        if (elManagement) elManagement.value = '';
        if (elLayer) elLayer.value = '';
        if (elStatus) elStatus.value = 'active';
        if (elLng) elLng.value = '';
        if (elLat) elLat.value = '';
    }

    function fillForm(data) {
        if (elId) elId.value = data.id || '';
        if (elName) elName.value = data.name || '';
        if (elType) elType.value = data.type || '';
        if (elRegion) elRegion.value = data.region || '';
        if (elFounded) elFounded.value = data.founded || '';
        if (elArea) elArea.value = data.area == null ? '' : data.area;
        if (elAddress) elAddress.value = data.address || '';
        if (elManagement) elManagement.value = data.management || '';
        if (elLayer) elLayer.value = data.layer || '';
        if (elStatus) elStatus.value = (data.status || 'active');

        var geom = data.geometry;
        if (geom && geom.type === 'Point' && Array.isArray(geom.coordinates)) {
            if (elLng) elLng.value = Number(geom.coordinates[0]).toFixed(6);
            if (elLat) elLat.value = Number(geom.coordinates[1]).toFixed(6);
        }
    }

    function getGeometryFromForm() {
        var lng = Number(elLng && elLng.value);
        var lat = Number(elLat && elLat.value);

        if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
            throw new Error('Vui long nhap dung kinh do va vi do.');
        }

        return {
            type: 'Point',
            coordinates: [lng, lat]
        };
    }

    function buildPayload() {
        return {
            name: elName ? elName.value.trim() : '',
            type: elType ? elType.value.trim() : null,
            region: elRegion ? elRegion.value.trim() : null,
            founded: elFounded ? elFounded.value.trim() : null,
            area: elArea && elArea.value ? Number(elArea.value) : null,
            address: elAddress ? elAddress.value.trim() : null,
            management: elManagement ? elManagement.value.trim() : null,
            layer: elLayer ? elLayer.value.trim() : null,
            status: elStatus ? (elStatus.value || 'active') : 'active',
            geometry: getGeometryFromForm()
        };
    }

    function refreshMapLayer() {
        if (typeof GIS.refreshProtectedAreas === 'function') {
            GIS.refreshProtectedAreas();
        }
    }

    function renderList(items) {
        if (!listBody) return;

        if (!items.length) {
            listBody.innerHTML = '<tr><td colspan="5">Khong co du lieu</td></tr>';
            return;
        }

        listBody.innerHTML = items.map(function (item) {
            return '<tr data-id="' + item.id + '">' +
                '<td>' + item.id + '</td>' +
                '<td>' + (item.name || '') + '</td>' +
                '<td>' + (item.type || '') + '</td>' +
                '<td>' + (item.address || '') + '</td>' +
                '<td>' + (item.status || 'active') + '</td>' +
                '</tr>';
        }).join('');

        listBody.querySelectorAll('tr[data-id]').forEach(function (tr) {
            tr.addEventListener('click', function () {
                if (elId) elId.value = tr.dataset.id;
                setCrudMessage('Da chon ID ' + tr.dataset.id + '. Bam "Nap theo ID" de tai day du thong tin.', false);
            });
        });
    }

    function renderLogs(items) {
        if (!logsBody) return;

        if (!items.length) {
            logsBody.innerHTML = '<tr><td colspan="4">Chua co logs</td></tr>';
            return;
        }

        logsBody.innerHTML = items.map(function (item) {
            var created = item.created_at ? new Date(item.created_at).toLocaleString('vi-VN') : '';
            return '<tr>' +
                '<td>' + created + '</td>' +
                '<td>' + (item.user_name || '') + '</td>' +
                '<td>' + (item.action || '') + '</td>' +
                '<td>' + (item.entity_id || '') + '</td>' +
                '</tr>';
        }).join('');
    }

    function loadList() {
        var offset = (listPage - 1) * listPageSize;
        apiFetch('/protected-areas?limit=' + listPageSize + '&offset=' + offset + '&status=all')
            .then(function (data) {
                listLastCount = (data.items || []).length;
                renderList(data.items || []);
                if (elListPageInfo) {
                    elListPageInfo.textContent = 'Trang ' + listPage + ' - ' + listPageSize + ' khu/trang';
                }
                if (btnListPrev) btnListPrev.disabled = listPage <= 1;
                if (btnListNext) btnListNext.disabled = listLastCount < listPageSize;
            })
            .catch(function (error) {
                renderList([]);
                setCrudMessage('Khong tai duoc danh sach: ' + error.message, true);
            });
    }

    function loadLogs() {
        setLogsMessage('Dang tai logs...', false);
        apiFetch('/logs?limit=100')
            .then(function (data) {
                renderLogs(data.items || []);
                setLogsMessage('Da tai logs thanh cong.', false);
            })
            .catch(function (error) {
                renderLogs([]);
                setLogsMessage('Khong tai duoc logs: ' + error.message, true);
            });
    }

    function checkApiHealth() {
        setApiStatus('Dang kiem tra backend API...', false);
        apiFetch('/health')
            .then(function () {
                setApiStatus('Backend API dang hoat dong: ' + cfg.apiBaseUrl, false);
            })
            .catch(function (error) {
                setApiStatus('Backend API loi/khong chay: ' + error.message, true);
            });
    }

    btnLoad && btnLoad.addEventListener('click', function () {
        var id = Number(elId && elId.value);
        if (!Number.isFinite(id)) {
            setCrudMessage('Vui long nhap ID hop le de nap.', true);
            return;
        }

        apiFetch('/protected-areas/' + id)
            .then(function (data) {
                fillForm(data);
                setCrudMessage('Da nap du lieu ID ' + id + '.', false);
            })
            .catch(function (error) {
                setCrudMessage('Nap that bai: ' + error.message, true);
            });
    });

    btnCreate && btnCreate.addEventListener('click', function () {
        var payload;
        try {
            payload = buildPayload();
        } catch (error) {
            setCrudMessage(error.message, true);
            return;
        }

        if (!payload.name) {
            setCrudMessage('Ten khu bao ton la bat buoc.', true);
            return;
        }

        apiFetch('/protected-areas', {
            method: 'POST',
            body: JSON.stringify(payload)
        })
            .then(function (data) {
                if (elId) elId.value = data.id;
                setCrudMessage('Da tao moi thanh cong. ID: ' + data.id, false);
                listPage = 1;
                loadList();
                loadLogs();
                refreshMapLayer();
            })
            .catch(function (error) {
                setCrudMessage('Tao moi that bai: ' + error.message, true);
            });
    });

    btnUpdate && btnUpdate.addEventListener('click', function () {
        var id = Number(elId && elId.value);
        if (!Number.isFinite(id)) {
            setCrudMessage('Vui long nhap ID hop le de cap nhat.', true);
            return;
        }

        var payload;
        try {
            payload = buildPayload();
        } catch (error) {
            setCrudMessage(error.message, true);
            return;
        }

        apiFetch('/protected-areas/' + id, {
            method: 'PUT',
            body: JSON.stringify(payload)
        })
            .then(function () {
                setCrudMessage('Da cap nhat ID ' + id + ' thanh cong.', false);
                loadList();
                loadLogs();
                refreshMapLayer();
            })
            .catch(function (error) {
                setCrudMessage('Cap nhat that bai: ' + error.message, true);
            });
    });

    btnReloadLogs && btnReloadLogs.addEventListener('click', loadLogs);

    btnListPrev && btnListPrev.addEventListener('click', function () {
        if (listPage <= 1) return;
        listPage -= 1;
        loadList();
    });

    btnListNext && btnListNext.addEventListener('click', function () {
        if (listLastCount < listPageSize) return;
        listPage += 1;
        loadList();
    });

    map.on('click', function (e) {
        if (elLng) elLng.value = e.latlng.lng.toFixed(6);
        if (elLat) elLat.value = e.latlng.lat.toFixed(6);
    });

    checkApiHealth();
    loadSelectMetadata();
    loadList();
    loadLogs();
};
