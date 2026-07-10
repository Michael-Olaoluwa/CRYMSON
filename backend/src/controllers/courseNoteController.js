const CourseNote = require("../models/CourseNote");

async function createNote(req, res) {
  try {
    const { courseCode, title, content, tags } = req.body;
    const crymsonId = req.auth.crymsonId;

    if (!courseCode || !title) {
      return res.status(400).json({ error: "courseCode and title are required" });
    }

    const note = await CourseNote.create({
      crymsonId,
      courseCode: courseCode.toUpperCase().trim(),
      title: title.trim(),
      content: content || "",
      tags: Array.isArray(tags) ? tags : [],
    });

    res.status(201).json(note);
  } catch (error) {
    console.error("Create note error:", error.message);
    res.status(500).json({ error: "Failed to create note" });
  }
}

async function listNotes(req, res) {
  try {
    const { courseCode } = req.params;
    const crymsonId = req.auth.crymsonId;

    const notes = await CourseNote.find({
      crymsonId,
      courseCode: courseCode.toUpperCase().trim(),
    }).sort({ updatedAt: -1 });

    res.json(notes);
  } catch (error) {
    console.error("List notes error:", error.message);
    res.status(500).json({ error: "Failed to list notes" });
  }
}

async function getNote(req, res) {
  try {
    const note = await CourseNote.findOne({
      _id: req.params.id,
      crymsonId: req.auth.crymsonId,
    });

    if (!note) return res.status(404).json({ error: "Note not found" });

    res.json(note);
  } catch (error) {
    console.error("Get note error:", error.message);
    res.status(500).json({ error: "Failed to get note" });
  }
}

async function updateNote(req, res) {
  try {
    const { title, content, tags } = req.body;

    const note = await CourseNote.findOneAndUpdate(
      { _id: req.params.id, crymsonId: req.auth.crymsonId },
      {
        $set: {
          ...(title !== undefined && { title: title.trim() }),
          ...(content !== undefined && { content }),
          ...(tags !== undefined && { tags }),
          updatedAt: new Date(),
        },
      },
      { new: true },
    );

    if (!note) return res.status(404).json({ error: "Note not found" });

    res.json(note);
  } catch (error) {
    console.error("Update note error:", error.message);
    res.status(500).json({ error: "Failed to update note" });
  }
}

async function deleteNote(req, res) {
  try {
    const note = await CourseNote.findOneAndDelete({
      _id: req.params.id,
      crymsonId: req.auth.crymsonId,
    });

    if (!note) return res.status(404).json({ error: "Note not found" });

    res.json({ ok: true });
  } catch (error) {
    console.error("Delete note error:", error.message);
    res.status(500).json({ error: "Failed to delete note" });
  }
}

async function searchNotes(req, res) {
  try {
    const crymsonId = req.auth.crymsonId;
    const q = req.query.q?.trim();

    if (!q) return res.json([]);

    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

    const notes = await CourseNote.find({
      crymsonId,
      $or: [
        { title: regex },
        { content: regex },
        { courseCode: regex },
        { tags: regex },
      ],
    })
      .sort({ updatedAt: -1 })
      .limit(50);

    res.json(notes);
  } catch (error) {
    console.error("Search notes error:", error.message);
    res.status(500).json({ error: "Search failed" });
  }
}

module.exports = {
  createNote,
  listNotes,
  getNote,
  updateNote,
  deleteNote,
  searchNotes,
};
