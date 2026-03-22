const express = require('express');
const db = require('../db');

const router = express.Router();

const schema = process.env.DB_SCHEMA || 'public';
const table = process.env.PROTECTED_AREAS_TABLE || 'protected_areas';
const logsTable = process.env.EDIT_LOGS_TABLE || 'edit_logs';
const fullTable = `${schema}.${table}`;
const fullLogsTable = `${schema}.${logsTable}`;

function safeIdentifier(input, label) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(input)) {
    throw new Error(`Invalid ${label} identifier: ${input}`);
  }
  return input;
}

safeIdentifier(schema, 'schema');
safeIdentifier(table, 'table');
safeIdentifier(logsTable, 'logsTable');

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

function getActor(req) {
  const bodyUser = req.body && req.body.user_name ? req.body.user_name : '';
  return String(req.headers['x-user-name'] || bodyUser || 'anonymous').trim();
}

function getClientIp(req) {
  return (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').toString();
}

async function getAreaById(id) {
  const sql = `
    SELECT id, name, type, region, founded, area, address, management, layer, status,
           ST_AsGeoJSON(geom)::jsonb AS geometry
    FROM ${fullTable}
    WHERE id = $1
  `;
  const result = await db.query(sql, [id]);
  return result.rowCount ? result.rows[0] : null;
}

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
    // Keep CRUD successful even if logs table is not created yet.
    console.warn('Cannot write edit log:', error.message);
  }
}

function parsePagination(query) {
  const limit = Math.min(Math.max(Number(query.limit) || 300, 1), 2000);
  const offset = Math.max(Number(query.offset) || 0, 0);
  return { limit, offset };
}

function buildFilters(query) {
  const where = [];
  const values = [];

  const statusFilter = String(query.status || 'active').trim();
  if (statusFilter !== 'all') {
    values.push(statusFilter || 'active');
    where.push(`COALESCE(status, 'active') = $${values.length}`);
  }

  if (query.q) {
    values.push(`%${query.q.trim()}%`);
    where.push(`name ILIKE $${values.length}`);
  }

  if (query.type) {
    values.push(query.type.trim());
    where.push(`type = $${values.length}`);
  }

  if (query.address) {
    values.push(query.address.trim());
    where.push(`address ILIKE $${values.length}`);
  }

  return {
    clause: where.length ? `WHERE ${where.join(' AND ')}` : '',
    values,
  };
}

router.get('/protected-areas', async (req, res) => {
  try {
    const { limit, offset } = parsePagination(req.query);
    const { clause, values } = buildFilters(req.query);

    values.push(limit);
    values.push(offset);

    const sql = `
      SELECT id, name, type, region, founded, area, address, management, layer, COALESCE(status, 'active') AS status
      FROM ${fullTable}
      ${clause}
      ORDER BY id DESC
      LIMIT $${values.length - 1} OFFSET $${values.length}
    `;

    const result = await db.query(sql, values);
    res.json({
      items: result.rows,
      pagination: { limit, offset, count: result.rowCount },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/protected-areas/geojson', async (req, res) => {
  try {
    const { clause, values } = buildFilters(req.query);

    const sql = `
      SELECT jsonb_build_object(
        'type', 'FeatureCollection',
        'features', COALESCE(jsonb_agg(feature), '[]'::jsonb)
      ) AS geojson
      FROM (
        SELECT jsonb_build_object(
          'type', 'Feature',
          'id', t.id,
          'geometry', ST_AsGeoJSON(t.geom)::jsonb,
          'properties', (to_jsonb(t) - 'geom') || jsonb_build_object('status', COALESCE(t.status, 'active'))
        ) AS feature
        FROM ${fullTable} t
        ${clause}
        ORDER BY t.id
      ) f
    `;

    const result = await db.query(sql, values);
    res.json(result.rows[0].geojson);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/metadata/options', async (_req, res) => {
  try {
    const sql = `
      SELECT
        COALESCE(array_agg(DISTINCT type) FILTER (WHERE type IS NOT NULL AND type <> ''), '{}') AS types,
        COALESCE(array_agg(DISTINCT region) FILTER (WHERE region IS NOT NULL AND region <> ''), '{}') AS regions,
        COALESCE(array_agg(DISTINCT address) FILTER (WHERE address IS NOT NULL AND address <> ''), '{}') AS addresses,
        COALESCE(array_agg(DISTINCT layer) FILTER (WHERE layer IS NOT NULL AND layer <> ''), '{}') AS layers
      FROM ${fullTable}
      WHERE COALESCE(status, 'active') = 'active'
    `;

    const result = await db.query(sql);
    const row = result.rows[0] || {};

    res.json({
      types: (row.types || []).sort(),
      regions: (row.regions || []).sort(),
      addresses: (row.addresses || []).sort(),
      layers: (row.layers || []).sort(),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/statistics/types', async (_req, res) => {
  try {
    const sql = `
      SELECT COALESCE(type, 'Khong xac dinh') AS type, COUNT(*)::int AS total
      FROM ${fullTable}
      WHERE COALESCE(status, 'active') = 'active'
      GROUP BY COALESCE(type, 'Khong xac dinh')
      ORDER BY total DESC, type ASC
    `;

    const result = await db.query(sql);
    const total = result.rows.reduce((acc, row) => acc + Number(row.total || 0), 0);

    res.json({
      total,
      items: result.rows,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/protected-areas/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: 'Invalid id' });
    }

    const row = await getAreaById(id);

    if (!row) {
      return res.status(404).json({ message: 'Not found' });
    }

    return res.json(row);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post('/protected-areas', async (req, res) => {
  try {
    const { name, type, region, founded, area, address, management, layer, status, geometry } = req.body;

    if (!name || !geometry) {
      return res.status(400).json({ message: 'name and geometry are required' });
    }

    const sql = `
      INSERT INTO ${fullTable} (id, name, type, region, founded, area, address, management, layer, status, geom)
      SELECT COALESCE(MAX(id), 0) + 1, $1, $2, $3, $4, $5, $6, $7, $8, $9, ${geometryFromGeoJsonParam('$10')}
      FROM ${fullTable}
      RETURNING id
    `;

    const values = [
      name,
      type || null,
      region || null,
      founded || null,
      area || null,
      address || null,
      management || null,
      layer || null,
      status === 'hidden' ? 'hidden' : 'active',
      JSON.stringify(geometry),
    ];

    const result = await db.query(sql, values);
    const createdId = result.rows[0].id;
    const created = await getAreaById(createdId);
    await writeEditLog(req, 'create', createdId, null, created);
    return res.status(201).json({ id: createdId });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.put('/protected-areas/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: 'Invalid id' });
    }

    const before = await getAreaById(id);
    if (!before) {
      return res.status(404).json({ message: 'Not found' });
    }

    const { name, type, region, founded, area, address, management, layer, status, geometry } = req.body;

    const sql = `
      UPDATE ${fullTable}
      SET name = $1,
          type = $2,
          region = $3,
          founded = $4,
          area = $5,
          address = $6,
          management = $7,
          layer = $8,
          status = $9,
          geom = CASE
            WHEN $10::text IS NULL THEN geom
            ELSE ${geometryFromGeoJsonParam('$10')}
          END
      WHERE id = $11
      RETURNING id
    `;

    const values = [
      name || null,
      type || null,
      region || null,
      founded || null,
      area || null,
      address || null,
      management || null,
      layer || null,
      status === 'hidden' ? 'hidden' : 'active',
      geometry ? JSON.stringify(geometry) : null,
      id,
    ];

    const result = await db.query(sql, values);
    const updatedId = result.rows[0].id;
    const after = await getAreaById(updatedId);
    await writeEditLog(req, 'update', updatedId, before, after);

    return res.json({ id: updatedId });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.delete('/protected-areas/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: 'Invalid id' });
    }

    const before = await getAreaById(id);
    if (!before) {
      return res.status(404).json({ message: 'Not found' });
    }

    const sql = `
      UPDATE ${fullTable}
      SET status = 'hidden'
      WHERE id = $1
      RETURNING id
    `;
    const result = await db.query(sql, [id]);

    const deletedId = result.rows[0].id;
    await writeEditLog(req, 'delete', deletedId, before, null);

    return res.json({ id: deletedId });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get('/logs', async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 200, 1), 2000);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    const sql = `
      SELECT id, entity_type, entity_id, action, user_name, client_ip,
             before_data, after_data, created_at
      FROM ${fullLogsTable}
      ORDER BY created_at DESC, id DESC
      LIMIT $1 OFFSET $2
    `;

    const result = await db.query(sql, [limit, offset]);
    res.json({
      items: result.rows,
      pagination: { limit, offset, count: result.rowCount },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
