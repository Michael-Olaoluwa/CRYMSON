const path = require('path');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');

const dbFile = path.join(__dirname, '../../data/db.json');
const adapter = new JSONFile(dbFile);
const db = new Low(adapter, { users: [] });

async function initDb() {
  await db.read();
  db.data = db.data || { users: [] };
  db.data.users = Array.isArray(db.data.users) ? db.data.users : [];
  await db.write();
}

module.exports = {
  db,
  initDb
};
