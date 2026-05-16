/**
 * idGenerator.js
 *
 * Produces human-readable IDs like C001, P001, ORD001.
 */

function generateId(prefix, lastId) {
  if (!lastId) return `${prefix}001`;
  const nextNum = parseInt(lastId.slice(prefix.length), 10) + 1;
  return `${prefix}${String(nextNum).padStart(3, '0')}`;
}

async function getNextId(pool, table, idColumn, prefix) {
  const sql = `SELECT ${idColumn} AS "maxId" FROM ${table} WHERE ${idColumn} LIKE $1 ORDER BY ${idColumn} DESC LIMIT 1`;
  const { rows } = await pool.query(sql, [`${prefix}%`]);
  return generateId(prefix, rows.length > 0 ? rows[0].maxId : null);
}

module.exports = { generateId, getNextId };
