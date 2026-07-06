const path = require("path");
const fs = require("fs/promises");
const CourseMaterial = require("../models/CourseMaterial");

const UPLOAD_DIR = path.join(__dirname, "../../uploads");

async function uploadMaterial(req, res) {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const { courseCode, title, type, tags } = req.body;
    const crymsonId = req.user.crymsonId;

    if (!courseCode || !title) {
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({ error: "courseCode and title are required" });
    }

    const material = await CourseMaterial.create({
      crymsonId,
      courseCode: courseCode.toUpperCase().trim(),
      title: title.trim(),
      type: type || "other",
      fileName: req.file.originalname,
      filePath: req.file.path,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      tags: tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
    });

    res.status(201).json(material);
  } catch (error) {
    console.error("Upload error:", error.message);
    res.status(500).json({ error: "Upload failed" });
  }
}

async function listMaterials(req, res) {
  try {
    const { courseCode } = req.params;
    const crymsonId = req.user.crymsonId;

    const filter = { crymsonId, courseCode: courseCode.toUpperCase().trim() };
    if (req.query.type) filter.type = req.query.type;
    if (req.query.tag) filter.tags = req.query.tag;

    const materials = await CourseMaterial.find(filter)
      .sort({ createdAt: -1 })
      .select("-filePath");

    res.json(materials);
  } catch (error) {
    console.error("List error:", error.message);
    res.status(500).json({ error: "Failed to list materials" });
  }
}

async function getMaterial(req, res) {
  try {
    const material = await CourseMaterial.findOne({
      _id: req.params.id,
      crymsonId: req.user.crymsonId,
    });

    if (!material) return res.status(404).json({ error: "Material not found" });

    res.download(material.filePath, material.fileName);
  } catch (error) {
    console.error("Download error:", error.message);
    res.status(500).json({ error: "Download failed" });
  }
}

async function deleteMaterial(req, res) {
  try {
    const material = await CourseMaterial.findOneAndDelete({
      _id: req.params.id,
      crymsonId: req.user.crymsonId,
    });

    if (!material) return res.status(404).json({ error: "Material not found" });

    await fs.unlink(material.filePath).catch(() => {});

    res.json({ ok: true });
  } catch (error) {
    console.error("Delete error:", error.message);
    res.status(500).json({ error: "Delete failed" });
  }
}

async function searchMaterials(req, res) {
  try {
    const crymsonId = req.user.crymsonId;
    const q = req.query.q?.trim();

    if (!q) return res.json([]);

    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

    const materials = await CourseMaterial.find({
      crymsonId,
      $or: [
        { title: regex },
        { courseCode: regex },
        { tags: regex },
        { type: regex },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .select("-filePath");

    res.json(materials);
  } catch (error) {
    console.error("Search error:", error.message);
    res.status(500).json({ error: "Search failed" });
  }
}

module.exports = {
  uploadMaterial,
  listMaterials,
  getMaterial,
  deleteMaterial,
  searchMaterials,
};
