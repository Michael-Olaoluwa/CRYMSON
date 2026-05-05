/**
 * IndexedDB wrapper for CRYMSON
 * Handles large datasets: tasks, sessions, finance entries, academic events
 * Falls back to localStorage for small/critical data (auth token, CGPA state)
 */

const DB_NAME = "crymson_db";
const DB_VERSION = 1;

// Store names
const STORES = {
  TASKS: "tasks",
  TIME_SESSIONS: "time_sessions",
  FINANCE_ENTRIES: "finance_entries",
  RECURRING_PLANS: "recurring_plans",
  ACADEMIC_EVENTS: "academic_events",
};

let db = null;

/**
 * Initialize IndexedDB
 */
export async function initIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error("IndexedDB init failed:", request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      console.log("IndexedDB initialized");
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const idb = event.target.result;

      // Create object stores with indices
      if (!idb.objectStoreNames.contains(STORES.TASKS)) {
        const taskStore = idb.createObjectStore(STORES.TASKS, {
          keyPath: "id",
        });
        taskStore.createIndex("userId_dueAt", ["userId", "dueAt"]);
        taskStore.createIndex("userId_completed", ["userId", "completed"]);
      }

      if (!idb.objectStoreNames.contains(STORES.TIME_SESSIONS)) {
        const sessionStore = idb.createObjectStore(STORES.TIME_SESSIONS, {
          keyPath: "id",
        });
        sessionStore.createIndex("userId_date", [
          "userId",
          "startedAt_dateKey",
        ]);
      }

      if (!idb.objectStoreNames.contains(STORES.FINANCE_ENTRIES)) {
        const financeStore = idb.createObjectStore(STORES.FINANCE_ENTRIES, {
          keyPath: "id",
        });
        financeStore.createIndex("userId_date", ["userId", "date"]);
        financeStore.createIndex("userId_kind", ["userId", "kind"]);
      }

      if (!idb.objectStoreNames.contains(STORES.RECURRING_PLANS)) {
        const planStore = idb.createObjectStore(STORES.RECURRING_PLANS, {
          keyPath: "id",
        });
        planStore.createIndex("userId", "userId");
      }

      if (!idb.objectStoreNames.contains(STORES.ACADEMIC_EVENTS)) {
        const eventStore = idb.createObjectStore(STORES.ACADEMIC_EVENTS, {
          keyPath: "id",
        });
        eventStore.createIndex("userId_dueAt", ["userId", "dueAt"]);
      }
    };
  });
}

/**
 * Batch put records
 */
export async function putBatch(storeName, records) {
  if (!db) await initIndexedDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], "readwrite");
    const store = transaction.objectStore(storeName);

    records.forEach((record) => {
      store.put(record);
    });

    transaction.onerror = () => reject(transaction.error);
    transaction.oncomplete = () => resolve(records.length);
  });
}

/**
 * Get all records for a user in a store
 */
export async function getAllByUserId(storeName, userId) {
  if (!db) await initIndexedDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], "readonly");
    const store = transaction.objectStore(storeName);
    const index = store.index("userId") || store.index("userId_dueAt") || store.index("userId_date") || store.index("userId_kind") || store.index("userId_completed");

    const request = index.getAll([userId]);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * Clear store
 */
export async function clearStore(storeName) {
  if (!db) await initIndexedDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.clear();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Get single record
 */
export async function getRecord(storeName, id) {
  if (!db) await initIndexedDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], "readonly");
    const store = transaction.objectStore(storeName);
    const request = store.get(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * Delete record
 */
export async function deleteRecord(storeName, id) {
  if (!db) await initIndexedDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export { STORES };
