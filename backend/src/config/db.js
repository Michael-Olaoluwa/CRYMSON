const path = require('path');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');

const dbFile = path.join(__dirname, '../../data/db.json');
const adapter = new JSONFile(dbFile);
const db = new Low(adapter, { users: [], academicEvents: [] });

async function initDb() {
  await db.read();
  db.data = db.data || { users: [], academicEvents: [] };
  db.data.users = Array.isArray(db.data.users) ? db.data.users : [];
  db.data.academicEvents = Array.isArray(db.data.academicEvents) ? db.data.academicEvents : [];
  await db.write();
}

module.exports = {
  db,
  initDb
};
