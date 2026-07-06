const express = require("express");
const multer = require("multer");
const path = require("path");
const { requireAuth } = require("../middleware/auth");
const {
  uploadMaterial,
  listMaterials,
  getMaterial,
  deleteMaterial,
  searchMaterials,
} = require("../controllers/courseMaterialController");
const {
  createNote,
  listNotes,
  getNote,
  updateNote,
  deleteNote,
  searchNotes,
} = require("../controllers/courseNoteController");

const storage = multer.diskStorage({
  destination: path.join(__dirname, "../../uploads"),
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/webp",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "text/plain",
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("File type not supported"));
    }
  },
});

const router = express.Router();

router.use(requireAuth);

router.get("/materials/search", searchMaterials);
router.get("/notes/search", searchNotes);

router.get("/:courseCode/materials", listMaterials);
router.post("/:courseCode/materials", upload.single("file"), uploadMaterial);
router.get("/materials/:id", getMaterial);
router.delete("/materials/:id", deleteMaterial);

router.get("/:courseCode/notes", listNotes);
router.post("/:courseCode/notes", createNote);
router.get("/notes/:id", getNote);
router.put("/notes/:id", updateNote);
router.delete("/notes/:id", deleteNote);

module.exports = router;
