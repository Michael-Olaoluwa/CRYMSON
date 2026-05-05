/**
 * Data versioning and intelligent merge system
 * Handles timestamps, version tracking, and conflict resolution for multi-device sync
 */

/**
 * Wrapper for versioned data
 * Every piece of user data gets a timestamp and version
 */
export class VersionedData {
  constructor(data, userId) {
    this.data = data;
    this.userId = userId;
    this.version = 1;
    this.lastModified = new Date().toISOString();
    this.deviceId = this.getOrCreateDeviceId();
  }

  getOrCreateDeviceId() {
    let deviceId = localStorage.getItem("crymson_device_id");
    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem("crymson_device_id", deviceId);
    }
    return deviceId;
  }

  update(newData) {
    this.data = newData;
    this.version += 1;
    this.lastModified = new Date().toISOString();
  }

  toJSON() {
    return {
      data: this.data,
      metadata: {
        version: this.version,
        lastModified: this.lastModified,
        userId: this.userId,
        deviceId: this.deviceId,
      },
    };
  }

  static fromJSON(json) {
    const instance = new VersionedData(json.data, json.metadata.userId);
    instance.version = json.metadata.version;
    instance.lastModified = json.metadata.lastModified;
    instance.deviceId = json.metadata.deviceId;
    return instance;
  }
}

/**
 * Three-way merge logic: local, remote, and base (original)
 * Returns merged data and conflict status
 */
export function intelligentMerge(local, remote, base) {
  // Scenario 1: Remote is newer
  if (remote.metadata.lastModified > local.metadata.lastModified) {
    return {
      merged: remote.data,
      conflicted: false,
      source: "remote",
    };
  }

  // Scenario 2: Local is newer
  if (local.metadata.lastModified > remote.metadata.lastModified) {
    return {
      merged: local.data,
      conflicted: false,
      source: "local",
    };
  }

  // Scenario 3: Same timestamp (conflict)
  if (
    remote.metadata.lastModified === local.metadata.lastModified &&
    local.deviceId !== remote.deviceId
  ) {
    // Device A vs Device B with same timestamp - merge arrays
    if (Array.isArray(local.data) && Array.isArray(remote.data)) {
      const merged = mergeArrays(local.data, remote.data, base?.data || []);
      return {
        merged,
        conflicted: true,
        source: "merged",
        strategy: "array_union",
      };
    }

    // For objects, deep merge with remote taking precedence for scalar conflicts
    if (typeof local.data === "object" && typeof remote.data === "object") {
      const merged = mergeObjects(local.data, remote.data);
      return {
        merged,
        conflicted: true,
        source: "merged",
        strategy: "object_deep_merge",
      };
    }
  }

  // Default: local wins
  return {
    merged: local.data,
    conflicted: false,
    source: "local",
  };
}

/**
 * Merge two arrays by deduplicating by ID
 */
function mergeArrays(local, remote, base) {
  const baseIds = new Set(base.map((item) => item.id));
  const merged = [];
  const seenIds = new Set();

  // Add items from both arrays
  [...remote, ...local].forEach((item) => {
    if (!seenIds.has(item.id)) {
      merged.push(item);
      seenIds.add(item.id);
    }
  });

  return merged;
}

/**
 * Deep merge two objects
 */
function mergeObjects(local, remote) {
  const merged = { ...local };

  Object.keys(remote).forEach((key) => {
    if (
      typeof remote[key] === "object" &&
      remote[key] !== null &&
      typeof merged[key] === "object" &&
      merged[key] !== null &&
      !Array.isArray(remote[key])
    ) {
      merged[key] = mergeObjects(merged[key], remote[key]);
    } else {
      merged[key] = remote[key]; // Remote takes precedence
    }
  });

  return merged;
}

/**
 * Track sync conflict history
 */
export class ConflictLog {
  constructor() {
    this.conflicts = [];
  }

  addConflict(dataType, local, remote, merged, resolution) {
    this.conflicts.push({
      timestamp: new Date().toISOString(),
      dataType,
      localVersion: local.metadata.version,
      remoteVersion: remote.metadata.version,
      localModified: local.metadata.lastModified,
      remoteModified: remote.metadata.lastModified,
      resolution,
    });

    // Keep only last 100 conflicts
    if (this.conflicts.length > 100) {
      this.conflicts.shift();
    }
  }

  toPersistentStorage() {
    localStorage.setItem(
      "crymson_conflict_log",
      JSON.stringify(this.conflicts)
    );
  }

  static fromPersistentStorage() {
    const log = new ConflictLog();
    const stored = localStorage.getItem("crymson_conflict_log");
    if (stored) {
      log.conflicts = JSON.parse(stored);
    }
    return log;
  }
}
