/**
 * Frontend batch sync system
 * Combines multiple PUT requests into a single /api/user-state/all call
 * Reduces network overhead and improves reliability
 */

class BatchSync {
  constructor(debounceMs = 500, maxBatchSize = 10) {
    this.debounceMs = debounceMs;
    this.maxBatchSize = maxBatchSize;
    this.queue = [];
    this.timeout = null;
    this.isProcessing = false;
  }

  /**
   * Queue a sync operation
   */
  queueSync(dataType, data, metadata = {}) {
    this.queue.push({
      dataType, // tasks, cgpaState, timeSessions, finance
      data,
      metadata,
      timestamp: Date.now(),
    });

    // Deduplicate: if same dataType exists, replace it
    this.queue = this.queue.filter(
      (item, idx) =>
        item.dataType !== dataType ||
        idx === this.queue.findIndex((i) => i.dataType === dataType)
    );

    // Flush if batch size reached
    if (this.queue.length >= this.maxBatchSize) {
      this.flush();
    } else {
      this.resetTimeout();
    }
  }

  /**
   * Reset debounce timer
   */
  resetTimeout() {
    if (this.timeout) clearTimeout(this.timeout);
    this.timeout = setTimeout(() => this.flush(), this.debounceMs);
  }

  /**
   * Flush all queued items in a single request
   */
  async flush() {
    if (this.queue.length === 0 || this.isProcessing) return;

    this.isProcessing = true;
    if (this.timeout) clearTimeout(this.timeout);

    const batch = this.queue;
    this.queue = [];

    try {
      const payload = {
        data: {},
        metadata: {
          batchSize: batch.length,
          timestamp: new Date().toISOString(),
          deviceId: localStorage.getItem("crymson_device_id"),
        },
      };

      // Organize by dataType
      batch.forEach(({ dataType, data, metadata }) => {
        payload.data[dataType] = data;
        if (metadata.version) {
          if (!payload.metadata.versions) payload.metadata.versions = {};
          payload.metadata.versions[dataType] = metadata.version;
        }
      });

      const token = JSON.parse(
        localStorage.getItem("crymson_auth_session") || "{}"
      ).token;

      if (!token) {
        console.warn("No auth token for batch sync");
        this.isProcessing = false;
        return;
      }

      const response = await fetch(
        "http://localhost:5000/api/user-state/batch-sync",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        console.error("Batch sync failed:", response.status);
      } else {
        console.log("Batch sync successful:", batch.length, "items");
      }
    } catch (error) {
      console.error("Batch sync error:", error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Immediate flush (for critical operations)
   */
  async forceFlush() {
    if (this.timeout) clearTimeout(this.timeout);
    return this.flush();
  }

  /**
   * Get queue size
   */
  getQueueSize() {
    return this.queue.length;
  }

  /**
   * Clear queue without syncing
   */
  clear() {
    this.queue = [];
    if (this.timeout) clearTimeout(this.timeout);
  }
}

// Global singleton
export const batchSync = new BatchSync(500);

export default BatchSync;
