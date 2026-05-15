const mongoose = require('mongoose');
const { createOfflineModelProxy } = require('../utils/offlineModel');

const settingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    value: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true, versionKey: false }
);

const Setting = mongoose.models.Setting || mongoose.model('Setting', settingSchema);

module.exports = createOfflineModelProxy(Setting, {
  collectionName: 'settings',
  primaryKey: 'key',
});
