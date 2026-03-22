# WebGIS System Guide (Neon Postgres + GeoServer + Web Frontend)

Tai lieu nay mo ta day du flow he thong va cac buoc trien khai.

## 1. Kien truc tong the

- PostGIS (Neon): kho du lieu goc cho khu bao ton va logs.
- GeoServer: publish layer ban do (WMS/WFS) doc truc tiep tu PostGIS.
- Backend API (Node/Express): CRUD + logs + API GeoJSON.
- Frontend WebGIS (Leaflet): hien thi ban do, thao tac CRUD, xem logs.

Flow tong quat:

1. Du lieu nguon -> import vao Neon PostGIS.
2. GeoServer ket noi PostGIS -> publish WMS/WFS.
3. Backend API ket noi PostGIS -> CRUD/logs.
4. Frontend goi API va GeoServer de hien thi va quan tri.

## 2. Chuan bi Neon Postgres

1. Tao database tren Neon.
2. Lay connection string (DATABASE_URL).
3. Chay SQL khoi tao:
   - backend/sql/neon_webgis_setup.sql

## 3. Nap du lieu vao Neon

### Cach A: Nap tu file JSON co EWKB hex (nhu protected_area_vn.json)

1. Import JSON vao bang staging public.protected_area_vn_staging.
2. Chay cau lenh UPSERT trong file SQL de convert geom:
   - ST_GeomFromEWKB(decode(geom, 'hex'))
   - ST_SetSRID(..., 4326)

### Cach B: Nap tu shapefile

Dung ogr2ogr hoac shp2pgsql de dua du lieu vao protected_area_vn.

Vi du shp2pgsql:

```powershell
shp2pgsql -I -s 4326 data\protected_area_vn.shp public.protected_area_vn | psql "<DATABASE_URL>"
```

## 4. Cau hinh backend API

1. Tao file backend/.env tu backend/.env.example.
2. Dien cac bien:
   - PORT=3001
   - CORS_ORIGIN=http://127.0.0.1:5500
   - DATABASE_URL=<chuoi Neon>
   - DB_SCHEMA=public
   - PROTECTED_AREAS_TABLE=protected_area_vn
   - EDIT_LOGS_TABLE=edit_logs
3. Chay backend:

```powershell
npm --prefix d:\WebGIS\backend install
npm --prefix d:\WebGIS\backend run dev
```

4. Test API:
   - GET http://localhost:3001/api/v1/health
   - GET http://localhost:3001/api/v1/protected-areas/geojson
   - GET http://localhost:3001/api/v1/logs

## 5. Cau hinh GeoServer doc tu Neon

1. Tao Workspace trong GeoServer (vi du: baoton_vn).
2. Tao Store loai PostGIS:
   - host: endpoint Neon
   - database: neondb
   - user/password: thong tin Neon
   - schema: public
3. Publish layer:
   - public.protected_area_vn
   - public.vietnam_provines (neu da import vao PostGIS)
4. Chon CRS: EPSG:4326.
5. Bat WMS/WFS va test endpoint.

## 6. Cau hinh frontend WebGIS

Frontend hien tai co 3 tab trong panel phai:

- Ban do: filter + thong tin chi tiet
- CRUD: them/sua/xoa khu bao ton
- Logs: xem nhat ky chinh sua

Quy tac lay du lieu:

1. Khu bao ton: uu tien API backend /protected-areas/geojson
2. Neu API loi: fallback sang GeoServer WFS
3. Neu WFS loi: fallback sang WMS
4. Ranh gioi tinh: dang doc tu GeoServer WMS

## 7. CRUD va Logs

### CRUD API

- GET /api/v1/protected-areas
- GET /api/v1/protected-areas/:id
- POST /api/v1/protected-areas
- PUT /api/v1/protected-areas/:id
- DELETE /api/v1/protected-areas/:id

### Logs API

- GET /api/v1/logs?limit=100

Backend ghi log vao edit_logs cho moi hanh dong create/update/delete.

## 8. Quy trinh day du lieu va lay du lieu de hien thi map

1. Du lieu duoc dua vao PostGIS (protected_area_vn).
2. GeoServer doc protected_area_vn -> publish WMS/WFS.
3. Backend doc/ghi protected_area_vn va ghi edit_logs.
4. Frontend:
   - Goi backend de hien thi va quan tri du lieu.
   - Goi GeoServer de hien thi map nen/overlay.
5. Sau CRUD, frontend refresh layer de thay doi cap nhat ngay.

## 9. Van hanh va bao mat

1. Khong commit file .env.
2. Neu lo DATABASE_URL, doi password Neon ngay.
3. Gioi han CORS_ORIGIN theo domain thuc te.
4. Nen dat reverse proxy (Nginx) cho production.
5. Nen bo sung auth JWT va phan quyen admin/editor/viewer o buoc tiep theo.
