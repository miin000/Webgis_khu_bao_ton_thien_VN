# Giai thich code cac chuc nang chinh WebGIS

Tai lieu nay giai thich luong code theo 5 nhom:
1. Hien thi ban do
2. CRUD khu bao ton
3. Tich hop PostGIS + GeoServer
4. Thong ke
5. Logs

---

## 1) Hien thi ban do

### Muc tieu
- Khoi tao ban do Leaflet voi tam nhin Viet Nam.
- Nap lop nen OSM va Esri.
- Nap ranh gioi tinh tu GeoServer (WMS).
- Ho tro dinh vi nguoi dung va tim khu bao ton gan nhat.

### Code chinh
Nguon: js/map-init.js

```js
GIS.initMap = function () {
    var cfg = GIS.config;

    var map = L.map('map', {
        center: cfg.center,
        zoom: 6,
        minZoom: 5,
        maxZoom: 19,
        maxBounds: cfg.bounds,
        maxBoundsViscosity: 1.0
    });

    var osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
    });

    var provincesWms = L.tileLayer.wms(cfg.vnWmsUrl, {
        layers: 'bao_ton_thien_viet_nam:vietnam_provines',
        format: 'image/png',
        transparent: true,
        version: '1.1.1'
    }).addTo(map);

    return { map: map, osm: osm, provincesWms: provincesWms };
};
```

### Giai thich
- `GIS.config` (js/config.js) chua tam ban do, bounds va URL WMS/WFS.
- `L.map(...)` khoi tao doi tuong ban do va khoa gioi han pan/zoom trong pham vi Viet Nam.
- `L.tileLayer.wms(...)` ket noi truc tiep GeoServer de hien thi ranh gioi tinh.
- Ham tra ve object `layers` de cac module khac su dung chung (`controls`, `protected-areas`).

### Luong khoi dong toan ung dung
Nguon: js/map.js

```js
document.addEventListener('DOMContentLoaded', function () {
    var layers = GIS.initMap();
    var map = layers.map;

    GIS.initProtectedAreas(map);
    GIS.initAdmin(map);
    GIS.initStats();
    GIS.initControls(map, layers);
});
```

- Thu tu khoi tao duoc tach module ro rang: Map -> Du lieu khu bao ton -> CRUD/Logs -> Thong ke -> Dieu khien UI.

---

## 2) CRUD khu bao ton

CRUD duoc chia thanh 2 lop:
- Frontend: js/admin.js (form, nut bam, goi API).
- Backend: backend/src/routes/protected-areas.js (API REST + SQL).

### 2.1 Frontend CRUD (admin.js)

#### Goi API co kem ten nguoi thao tac
```js
function apiFetch(path, options) {
    var headers = {
        'Content-Type': 'application/json',
        'x-user-name': (elUser && elUser.value ? elUser.value : 'admin').trim() || 'admin'
    };

    var config = Object.assign({ method: 'GET' }, options || {});
    config.headers = Object.assign(headers, config.headers || {});

    return fetch(cfg.apiBaseUrl + path, config).then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) {
            if (!res.ok) throw new Error(data.message || ('HTTP ' + res.status));
            return data;
        });
    });
}
```

- Header `x-user-name` duoc gui len backend de ghi nhat ky chinh sua.

#### Tao payload tu form
```js
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
```

- `geometry` duoc tao tu kinh do/vi do -> GeoJSON Point.

#### Cac thao tac Create/Update
```js
apiFetch('/protected-areas', {
    method: 'POST',
    body: JSON.stringify(payload)
});

apiFetch('/protected-areas/' + id, {
    method: 'PUT',
    body: JSON.stringify(payload)
});
```

- Sau khi thanh cong: tai lai danh sach, tai lai logs, refresh lop ban do.

### 2.2 Backend CRUD (protected-areas.js)

#### Create
```js
router.post('/protected-areas', async (req, res) => {
  const { name, geometry } = req.body;
  if (!name || !geometry) {
    return res.status(400).json({ message: 'name and geometry are required' });
  }

  const sql = `
    INSERT INTO ${fullTable} (id, name, type, region, founded, area, address, management, layer, status, geom)
    SELECT COALESCE(MAX(id), 0) + 1, $1, $2, $3, $4, $5, $6, $7, $8, $9, ${geometryFromGeoJsonParam('$10')}
    FROM ${fullTable}
    RETURNING id
  `;
});
```

- Bat buoc co `name` va `geometry`.
- `geometryFromGeoJsonParam(...)` chuyen GeoJSON thanh geometry PostGIS dung SRID 4326.

#### Read danh sach + filter
```js
router.get('/protected-areas', async (req, res) => {
  const { limit, offset } = parsePagination(req.query);
  const { clause, values } = buildFilters(req.query);
  // ... SELECT ... FROM table WHERE ... LIMIT/OFFSET
});
```

- Ho tro filter theo `status`, `q` (ten), `type`, `address`.
- Co phan trang de tranh tai qua lon.

#### Read chi tiet theo ID
```js
router.get('/protected-areas/:id', async (req, res) => {
  const row = await getAreaById(id);
  if (!row) return res.status(404).json({ message: 'Not found' });
  return res.json(row);
});
```

#### Update
```js
router.put('/protected-areas/:id', async (req, res) => {
  // lay du lieu cu (before)
  // UPDATE cac truong + cap nhat geom neu co geometry moi
  // ghi log action = 'update'
});
```

- Neu frontend khong gui geometry moi, backend giu nguyen `geom`.

#### Delete mem (soft delete)
```js
router.delete('/protected-areas/:id', async (req, res) => {
  const sql = `
    UPDATE ${fullTable}
    SET status = 'hidden'
    WHERE id = $1
    RETURNING id
  `;
});
```

- Khong xoa vat ly ban ghi, chi danh dau `status='hidden'`.

---

## 3) Tich hop PostGIS va GeoServer

### 3.1 PostGIS
Nguon: backend/sql/neon_webgis_setup.sql

```sql
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS public.protected_area_vn (
    id BIGINT PRIMARY KEY,
    name TEXT NOT NULL,
    ...
    geom geometry(Point, 4326) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_protected_area_vn_geom
ON public.protected_area_vn USING GIST (geom);
```

- `geometry(Point, 4326)` giup luu toa do khong gian chuan WGS84.
- GIST index toi uu truy van khong gian.

### 3.2 Chuyen GeoJSON -> Geometry trong API
Nguon: backend/src/routes/protected-areas.js

```js
function geometryFromGeoJsonParam(paramRef) {
  return `
    CASE
      WHEN COALESCE((
        SELECT gc.coord_dimension
        FROM geometry_columns gc
        WHERE gc.f_table_schema = '${schema}'
          AND gc.f_table_name = '${table}'
          AND gc.f_geometry_column = 'geom'
        LIMIT 1
      ), 2) >= 3
      THEN ST_Force3D(ST_SetSRID(ST_GeomFromGeoJSON(${paramRef}), 4326), 0)
      ELSE ST_Force2D(ST_SetSRID(ST_GeomFromGeoJSON(${paramRef}), 4326))
    END
  `;
}
```

- Neu cot geom la 3D thi force 3D; neu 2D thi force 2D.
- Dam bao du lieu frontend gui len luon dong bo kieu hinh hoc.

### 3.3 GeoServer
Nguon: js/config.js

```js
wmsUrl:   'http://' + host + ':8080/geoserver/baoton_vn/wms',
wfsUrl:   'http://' + host + ':8080/geoserver/baoton_vn/wfs',
vnWmsUrl: 'http://' + host + ':8080/geoserver/bao_ton_thien_viet_nam/wms',
```

Nguon: js/protected-areas.js

```js
var wfsUrl = cfg.wfsUrl
  + '?service=WFS&version=1.0.0&request=GetFeature'
  + '&typeName=baoton_vn:protected_area_vn&outputFormat=application/json';

var apiGeoJsonUrl = cfg.apiBaseUrl + '/protected-areas/geojson';
```

- Frontend uu tien lay du lieu tu API backend (`/protected-areas/geojson`).
- Neu API loi thi fallback sang WFS GeoServer.
- Neu WFS tiep tuc loi (thuong CORS), fallback tiep sang WMS de van hien thi duoc lop ban do.

---

## 4) Thong ke

Thong ke theo loai khu bao ton duoc lam o backend + frontend.

### 4.1 API thong ke
Nguon: backend/src/routes/protected-areas.js

```js
router.get('/statistics/types', async (_req, res) => {
  const sql = `
    SELECT COALESCE(type, 'Khong xac dinh') AS type, COUNT(*)::int AS total
    FROM ${fullTable}
    WHERE COALESCE(status, 'active') = 'active'
    GROUP BY COALESCE(type, 'Khong xac dinh')
    ORDER BY total DESC, type ASC
  `;

  const result = await db.query(sql);
  const total = result.rows.reduce((acc, row) => acc + Number(row.total || 0), 0);

  res.json({ total, items: result.rows });
});
```

- Chi thong ke cac doi tuong dang `active`.
- Tra ve tong so + danh sach nhom theo type.

### 4.2 Frontend hien thi thong ke
Nguon: js/stats.js

```js
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
```

- Goi API, render bang, hien thong bao tong so.
- Co xu ly loi de tranh man hinh trang.

---

## 5) Logs (nhat ky tao/sua/xoa)

### 5.1 Cau truc bang log
Nguon: backend/sql/neon_webgis_setup.sql

```sql
CREATE TABLE IF NOT EXISTS public.edit_logs (
    id BIGSERIAL PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id BIGINT,
    action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete')),
    user_name TEXT NOT NULL DEFAULT 'anonymous',
    client_ip TEXT,
    before_data JSONB,
    after_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

- Luu duoc ai thao tac, thao tac gi, truoc/sau thay doi.

### 5.2 Ghi log trong backend
Nguon: backend/src/routes/protected-areas.js

```js
async function writeEditLog(req, action, entityId, beforeData, afterData) {
  const sql = `
    INSERT INTO ${fullLogsTable}
      (entity_type, entity_id, action, user_name, client_ip, before_data, after_data)
    VALUES
      ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb)
  `;

  try {
    await db.query(sql, [
      'protected_area',
      entityId,
      action,
      getActor(req),
      getClientIp(req),
      beforeData ? JSON.stringify(beforeData) : null,
      afterData ? JSON.stringify(afterData) : null,
    ]);
  } catch (error) {
    console.warn('Cannot write edit log:', error.message);
  }
}
```

- Ham nay duoc goi sau create/update/delete.
- Neu bang logs chua ton tai, CRUD van thanh cong (chi canh bao `console.warn`).

### 5.3 API + UI logs
Nguon backend: backend/src/routes/protected-areas.js

```js
router.get('/logs', async (req, res) => {
  const sql = `
    SELECT id, entity_type, entity_id, action, user_name, client_ip,
           before_data, after_data, created_at
    FROM ${fullLogsTable}
    ORDER BY created_at DESC, id DESC
    LIMIT $1 OFFSET $2
  `;
});
```

Nguon frontend: js/admin.js

```js
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
```

- Frontend hien thi top logs moi nhat de quan sat nhanh lich su thao tac.

---

## Tong ket luong du lieu (end-to-end)

1. Nguoi dung mo ung dung -> `map.js` khoi tao ban do va cac module.
2. Frontend lay GeoJSON tu backend (`/protected-areas/geojson`) de ve diem khu bao ton.
3. Nguoi dung tao/sua/xoa trong giao dien admin -> frontend goi API CRUD.
4. Backend luu geometry vao PostGIS, dong thoi ghi nhat ky vao `edit_logs`.
5. Frontend goi lai danh sach/logs/thong ke va refresh layer de thay doi hien thi ngay lap tuc.
6. Neu kenh API/WFS co su co, lop WMS tu GeoServer van duoc dung lam fallback de dam bao kha nang hien thi.

Tai lieu nay co the dung lam nen cho:
- Viet bao cao do an
- Trinh bay voi giang vien/khach hang
- Chuyen giao he thong cho thanh vien moi
