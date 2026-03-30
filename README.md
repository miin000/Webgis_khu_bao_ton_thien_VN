# WebGIS Setup (PostgreSQL/PostGIS)

Du an da duoc nang cap theo huong:

- PostgreSQL/PostGIS la kho du lieu chinh
- Backend API la lop CRUD va truy van du lieu
- Frontend Leaflet uu tien lay GeoJSON tu API
- Neu API khong san sang, frontend fallback sang WFS/WMS

## 1) Chay backend API

Yeu cau: Node.js 18+

1. Mo terminal tai thu muc backend
2. Cai package
3. Tao file .env tu .env.example
4. Chay API

```powershell
cd d:\WebGIS\backend
npm install
Copy-Item .env.example .env
npm run dev
```

Cap nhat file .env:

- DATABASE_URL=chuoi ket noi PostgreSQL/PostGIS cua ban
- DB_SCHEMA=public
- PROTECTED_AREAS_TABLE=protected_area_vn (hoac ten bang ban dang dung)
- EDIT_LOGS_TABLE=edit_logs
- CORS_ORIGIN=http://127.0.0.1:5500

Kiem tra API:

- GET http://localhost:3001/api/v1/health
- GET http://localhost:3001/api/v1/protected-areas/geojson

## 2) Chuan hoa bang PostGIS (neu can)

Co the dung script:

- backend/sql/neon_webgis_setup.sql

Bang chinh backend dang doc la:

- id, name, type, region, founded, area, address, management, layer, geom

geom phai la geometry SRID 4326.

## 3) Chay frontend

Mo frontend/index.html bang Live Server hoac static server.

Frontend se tu dong goi API o host hien tai cong 3001:

- http://<host>:3001/api/v1

Neu API loi, he thong se fallback sang GeoServer WFS/WMS nhu truoc.

## 4) API CRUD san co

- GET /api/v1/protected-areas
- GET /api/v1/protected-areas/geojson
- GET /api/v1/protected-areas/:id
- POST /api/v1/protected-areas
- PUT /api/v1/protected-areas/:id
- DELETE /api/v1/protected-areas/:id
- GET /api/v1/logs

## 5) Giao dien quan tri

Panel ben phai da co 3 tab:

- Ban do: loc theo loai + thong tin chi tiet
- CRUD: tao/sua/xoa khu bao ton
- Logs: xem nhat ky chinh sua nguoi dung

## 6) Tai lieu chi tiet he thong

- docs/SYSTEM_GUIDE.md

Tai lieu nay bao gom:

- flow day du lieu len Neon
- cau hinh GeoServer doc PostGIS
- flow tra du lieu ra WebGIS
- cac buoc van hanh va bao mat

## 7) Bao mat

- Khong commit file backend/.env
- Khong de lo username/password PostgreSQL tren frontend
- Nen rotate password neu da tung chia se cong khai
