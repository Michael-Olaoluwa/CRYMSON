const fs = require("fs/promises");
const path = require("path");
const mongoose = require("mongoose");

const offlineDbPath = path.join(__dirname, "../../data/offline-db.json");

let storeCache = null;
let writeQueue = Promise.resolve();

function useOfflineDb() {
  return (
    process.env.CRYMSON_OFFLINE_DB === "1" ||
    mongoose.connection.readyState !== 1
  );
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeCollectionName(name) {
  return String(name || "").trim();
}

async function loadStore() {
  if (storeCache) {
    return deepClone(storeCache);
  }

  try {
    const raw = await fs.readFile(offlineDbPath, "utf8");
    storeCache = JSON.parse(raw || "{}");
  } catch (error) {
    storeCache = {};
  }

  return deepClone(storeCache);
}

async function saveStore(store) {
  storeCache = deepClone(store);
  await fs.mkdir(path.dirname(offlineDbPath), { recursive: true });
  await fs.writeFile(
    offlineDbPath,
    `${JSON.stringify(storeCache, null, 2)}\n`,
    "utf8",
  );
}

function enqueueWrite(task) {
  writeQueue = writeQueue.then(task, task);
  return writeQueue;
}

function matchesCondition(docValue, filterValue) {
  if (filterValue instanceof RegExp) {
    return filterValue.test(String(docValue || ""));
  }

  if (
    filterValue &&
    typeof filterValue === "object" &&
    !Array.isArray(filterValue)
  ) {
    if (Object.prototype.hasOwnProperty.call(filterValue, "$regex")) {
      const pattern = filterValue.$regex;
      const flags = filterValue.$options || "";
      const regex =
        pattern instanceof RegExp
          ? pattern
          : new RegExp(String(pattern), flags);
      return regex.test(String(docValue || ""));
    }

    if (
      Object.prototype.hasOwnProperty.call(filterValue, "$in") &&
      Array.isArray(filterValue.$in)
    ) {
      return filterValue.$in.some((item) => String(item) === String(docValue));
    }
  }

  return String(docValue ?? "") === String(filterValue ?? "");
}

function matchesFilter(doc, filter = {}) {
  const entries = Object.entries(filter || {});
  if (entries.length === 0) {
    return true;
  }

  for (const [key, value] of entries) {
    if (key === "$or" && Array.isArray(value)) {
      if (value.some((item) => matchesFilter(doc, item))) {
        continue;
      }
      return false;
    }

    if (!matchesCondition(doc[key], value)) {
      return false;
    }
  }

  return true;
}

function applyProjection(doc, projection) {
  if (!projection || Object.keys(projection).length === 0) {
    return deepClone(doc);
  }

  const includeKeys = Object.entries(projection)
    .flatMap(([key, value]) => value === 1 || value === true ? [key] : []);
  const excludeKeys = Object.entries(projection)
    .flatMap(([key, value]) => value === 0 || value === false ? [key] : []);

  let projected = deepClone(doc);

  if (includeKeys.length > 0) {
    projected = includeKeys.reduce((acc, key) => {
      if (Object.prototype.hasOwnProperty.call(doc, key)) {
        acc[key] = deepClone(doc[key]);
      }
      return acc;
    }, {});
  }

  for (const key of excludeKeys) {
    delete projected[key];
  }

  return projected;
}

function applySort(docs, sortSpec) {
  if (!sortSpec || typeof sortSpec !== "object") {
    return docs;
  }

  const [[key, direction]] = Object.entries(sortSpec);
  if (!key) {
    return docs;
  }

  const factor = Number(direction) < 0 ? -1 : 1;
  return docs.slice().sort((left, right) => {
    const leftValue = left?.[key];
    const rightValue = right?.[key];

    if (leftValue === rightValue) {
      return 0;
    }

    if (leftValue === undefined || leftValue === null) {
      return -1 * factor;
    }

    if (rightValue === undefined || rightValue === null) {
      return 1 * factor;
    }

    const leftTime = new Date(leftValue).getTime();
    const rightTime = new Date(rightValue).getTime();
    if (!Number.isNaN(leftTime) && !Number.isNaN(rightTime)) {
      return (leftTime - rightTime) * factor;
    }

    if (leftValue < rightValue) return -1 * factor;
    if (leftValue > rightValue) return 1 * factor;
    return 0;
  });
}

function wrapDocument(collectionName, primaryKey, document) {
  if (!document) {
    return null;
  }

  const wrapped = deepClone(document);

  Object.defineProperty(wrapped, "save", {
    enumerable: false,
    value: async function save() {
      const payload = deepClone(this);
      return enqueueWrite(async () => {
        const store = await loadStore();
        const collection = Array.isArray(store[collectionName])
          ? store[collectionName]
          : [];
        const idValue = payload[primaryKey];
        const index = collection.findIndex(
          (item) => String(item?.[primaryKey]) === String(idValue),
        );

        if (index === -1) {
          collection.unshift(payload);
        } else {
          collection[index] = payload;
        }

        store[collectionName] = collection;
        await saveStore(store);
        return wrapDocument(collectionName, primaryKey, payload);
      });
    },
  });

  Object.defineProperty(wrapped, "toObject", {
    enumerable: false,
    value: function toObject() {
      return deepClone(this);
    },
  });

  return wrapped;
}

function createOfflineQuery(
  collectionName,
  primaryKey,
  filter,
  projection,
  single,
) {
  const state = {
    filter: filter || {},
    projection: projection || null,
    sortSpec: null,
    skipCount: 0,
    limitCount: null,
    leanMode: false,
    single: Boolean(single),
  };

  const query = {
    sort(sortSpec) {
      state.sortSpec = sortSpec;
      return query;
    },
    skip(count) {
      state.skipCount = Math.max(0, Number(count) || 0);
      return query;
    },
    limit(count) {
      state.limitCount = Math.max(0, Number(count) || 0);
      return query;
    },
    lean() {
      state.leanMode = true;
      return query;
    },
    async exec() {
      const store = await loadStore();
      const collection = Array.isArray(store[collectionName])
        ? store[collectionName]
        : [];
      let results = collection.filter((doc) =>
        matchesFilter(doc, state.filter),
      );
      results = applySort(results, state.sortSpec);

      if (state.skipCount > 0) {
        results = results.slice(state.skipCount);
      }

      if (state.limitCount !== null) {
        results = results.slice(0, state.limitCount);
      }

      results = results.map((doc) => applyProjection(doc, state.projection));

      if (state.single) {
        const item = results[0] || null;
        return state.leanMode
          ? item
          : wrapDocument(collectionName, primaryKey, item);
      }

      if (state.leanMode) {
        return results;
      }

      return results.map((item) =>
        wrapDocument(collectionName, primaryKey, item),
      );
    },
    then(resolve, reject) {
      return query.exec().then(resolve, reject);
    },
    catch(reject) {
      return query.exec().catch(reject);
    },
  };

  return query;
}

async function getCollection(collectionName) {
  const store = await loadStore();
  if (!Array.isArray(store[collectionName])) {
    store[collectionName] = [];
    await saveStore(store);
  }

  return store;
}

function getPrimaryKey(config) {
  return config.primaryKey || "id";
}

function createOfflineModelProxy(realModel, config) {
  const collectionName = normalizeCollectionName(config.collectionName);
  const primaryKey = getPrimaryKey(config);

  async function createDocument(payload) {
    const store = await getCollection(collectionName);
    const collection = store[collectionName];
    const document = deepClone(payload || {});
    const idValue = document[primaryKey];

    if (
      idValue === undefined ||
      idValue === null ||
      String(idValue).trim() === ""
    ) {
      throw new Error(`Missing required key: ${primaryKey}`);
    }

    const existingIndex = collection.findIndex(
      (item) => String(item?.[primaryKey]) === String(idValue),
    );
    if (existingIndex !== -1) {
      const error = new Error("Duplicate key error");
      error.code = 11000;
      throw error;
    }

    collection.unshift(document);
    await saveStore(store);
    return wrapDocument(collectionName, primaryKey, document);
  }

  async function deleteMatching(filter) {
    const store = await getCollection(collectionName);
    const collection = store[collectionName];
    const index = collection.findIndex((item) => matchesFilter(item, filter));
    if (index === -1) {
      return { deletedCount: 0 };
    }

    collection.splice(index, 1);
    await saveStore(store);
    return { deletedCount: 1 };
  }

  async function findOneAndDeleteMatching(filter) {
    const store = await getCollection(collectionName);
    const collection = store[collectionName];
    const index = collection.findIndex((item) => matchesFilter(item, filter));
    if (index === -1) {
      return null;
    }

    const [removed] = collection.splice(index, 1);
    await saveStore(store);
    return wrapDocument(collectionName, primaryKey, removed);
  }

  function applyUpdatePayload(target, update, options = {}) {
    const nextTarget = target || {};
    const setPayload =
      update?.$set && typeof update.$set === "object" ? update.$set : {};
    const setOnInsertPayload =
      update?.$setOnInsert && typeof update.$setOnInsert === "object"
        ? update.$setOnInsert
        : {};

    Object.assign(nextTarget, setPayload);
    if (options.isInsert) {
      Object.assign(nextTarget, setOnInsertPayload);
    }

    return nextTarget;
  }

  async function updateMatching(filter, update, options = {}) {
    const store = await getCollection(collectionName);
    const collection = store[collectionName];
    const index = collection.findIndex((item) => matchesFilter(item, filter));

    if (index === -1) {
      if (!options.upsert) {
        return { matchedCount: 0, modifiedCount: 0, upsertedCount: 0 };
      }

      const inserted = applyUpdatePayload(
        { ...extractEqualityFields(filter), ...update?.$setOnInsert },
        update,
        { isInsert: true },
      );
      collection.unshift(inserted);
      await saveStore(store);
      return { matchedCount: 0, modifiedCount: 0, upsertedCount: 1 };
    }

    collection[index] = applyUpdatePayload(collection[index], update, {
      isInsert: false,
    });
    await saveStore(store);
    return { matchedCount: 1, modifiedCount: 1, upsertedCount: 0 };
  }

  async function findOneAndUpdateMatching(filter, update, options = {}) {
    const store = await getCollection(collectionName);
    const collection = store[collectionName];
    const index = collection.findIndex((item) => matchesFilter(item, filter));

    if (index === -1) {
      if (!options.upsert) {
        return null;
      }

      const inserted = applyUpdatePayload(
        { ...extractEqualityFields(filter), ...update?.$setOnInsert },
        update,
        { isInsert: true },
      );
      collection.unshift(inserted);
      await saveStore(store);
      return options.new === false
        ? null
        : wrapDocument(collectionName, primaryKey, inserted);
    }

    collection[index] = applyUpdatePayload(collection[index], update, {
      isInsert: false,
    });
    await saveStore(store);
    return wrapDocument(collectionName, primaryKey, collection[index]);
  }

  async function bulkWrite(operations = []) {
    const results = await Promise.all(
      operations
        .flatMap((operation) => {
          if (!operation || !operation.updateOne) return [];
          const {
            filter = {},
            update = {},
            upsert = false,
          } = operation.updateOne;
          return [updateMatching(filter, update, { upsert })];
        }),
    );

    const upsertedCount = results.reduce(
      (sum, result) => sum + (result.upsertedCount || 0),
      0,
    );

    return { upsertedCount };
  }

  function extractEqualityFields(filter = {}) {
    const result = {};
    for (const [key, value] of Object.entries(filter)) {
      if (key.startsWith("$")) {
        continue;
      }

      if (value instanceof RegExp) {
        continue;
      }

      if (value && typeof value === "object") {
        continue;
      }

      result[key] = value;
    }

    return result;
  }

  const offlineMethods = {
    find(filter = {}, projection = null) {
      return createOfflineQuery(
        collectionName,
        primaryKey,
        filter,
        projection,
        false,
      );
    },
    findOne(filter = {}, projection = null) {
      return createOfflineQuery(
        collectionName,
        primaryKey,
        filter,
        projection,
        true,
      );
    },
    async create(payload) {
      return createDocument(payload);
    },
    async exists(filter = {}) {
      const store = await loadStore();
      const collection = Array.isArray(store[collectionName])
        ? store[collectionName]
        : [];
      return collection.some((item) => matchesFilter(item, filter));
    },
    async countDocuments(filter = {}) {
      const store = await loadStore();
      const collection = Array.isArray(store[collectionName])
        ? store[collectionName]
        : [];
      return collection.filter((item) => matchesFilter(item, filter)).length;
    },
    async deleteOne(filter = {}) {
      return deleteMatching(filter);
    },
    async findOneAndDelete(filter = {}) {
      return findOneAndDeleteMatching(filter);
    },
    async updateOne(filter = {}, update = {}, options = {}) {
      return updateMatching(filter, update, options);
    },
    async findOneAndUpdate(filter = {}, update = {}, options = {}) {
      return findOneAndUpdateMatching(filter, update, options);
    },
    async bulkWrite(operations = [], options = {}) {
      return bulkWrite(operations, options);
    },
  };

  return new Proxy(realModel, {
    get(target, prop, receiver) {
      if (!useOfflineDb()) {
        const value = Reflect.get(target, prop, receiver);
        return typeof value === "function" ? value.bind(target) : value;
      }

      if (Object.prototype.hasOwnProperty.call(offlineMethods, prop)) {
        return offlineMethods[prop];
      }

      const value = Reflect.get(target, prop, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}

module.exports = {
  createOfflineModelProxy,
};
