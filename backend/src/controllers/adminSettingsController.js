const Setting = require("../models/Setting");

async function getSettings(req, res) {
  try {
    const settings = await Setting.find({}).lean();
    const payload = settings.reduce((acc, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {});
    return res.status(200).json({ settings: payload });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load settings." });
  }
}

async function updateSettings(req, res) {
  try {
    const updates = req.body || {};
    const keys = Object.keys(updates);

    await Promise.all(
      keys.map((key) =>
        Setting.findOneAndUpdate(
          { key },
          { value: updates[key] },
          { upsert: true, new: true },
        ),
      ),
    );

    const settings = await Setting.find({}).lean();
    const payload = settings.reduce((acc, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {});

    return res.status(200).json({ settings: payload });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update settings." });
  }
}

module.exports = {
  getSettings,
  updateSettings,
};
