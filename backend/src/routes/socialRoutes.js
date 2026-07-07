const express = require("express");
const { requireAuth } = require("../middleware/auth");
const {
  sendRequest,
  acceptRequest,
  declineRequest,
  removeFriend,
  getFriends,
  createGroup,
  joinGroup,
  leaveGroup,
  getUserGroups,
  getGroup,
  getStats,
  createChallenge,
  joinChallenge,
  updatePrivacy,
  getPrivacy,
} = require("../controllers/socialController");

const router = express.Router();

router.get("/friends", requireAuth, getFriends);
router.post("/friend/request", requireAuth, sendRequest);
router.post("/friend/accept", requireAuth, acceptRequest);
router.post("/friend/decline", requireAuth, declineRequest);
router.post("/friend/remove", requireAuth, removeFriend);

router.get("/groups", requireAuth, getUserGroups);
router.post("/group/create", requireAuth, createGroup);
router.post("/group/join", requireAuth, joinGroup);
router.post("/group/leave", requireAuth, leaveGroup);
router.get("/group/:groupId", requireAuth, getGroup);
router.get("/group/:groupId/stats", requireAuth, getStats);

router.post("/group/:groupId/challenge", requireAuth, createChallenge);
router.post("/group/:groupId/challenge/join", requireAuth, joinChallenge);

router.get("/privacy", requireAuth, getPrivacy);
router.put("/privacy", requireAuth, updatePrivacy);

module.exports = router;
