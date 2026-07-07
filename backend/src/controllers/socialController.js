const social = require("../services/social");

async function sendRequest(req, res) {
  try {
    const { targetCrymsonId } = req.body;
    if (!targetCrymsonId) return res.status(400).json({ error: "targetCrymsonId required" });
    const result = await social.sendFriendRequest(req.auth.crymsonId, targetCrymsonId);
    res.json(result);
  } catch (error) {
    console.error("Send friend request error:", error.message);
    res.status(error.status || 500).json({ error: error.message || "Failed to send friend request" });
  }
}

async function acceptRequest(req, res) {
  try {
    const { fromUserId } = req.body;
    if (!fromUserId) return res.status(400).json({ error: "fromUserId required" });
    const result = await social.acceptFriendRequest(req.auth.crymsonId, fromUserId);
    res.json(result);
  } catch (error) {
    console.error("Accept friend request error:", error.message);
    res.status(error.status || 500).json({ error: error.message || "Failed to accept friend request" });
  }
}

async function declineRequest(req, res) {
  try {
    const { fromUserId } = req.body;
    if (!fromUserId) return res.status(400).json({ error: "fromUserId required" });
    const result = await social.declineFriendRequest(req.auth.crymsonId, fromUserId);
    res.json(result);
  } catch (error) {
    console.error("Decline friend request error:", error.message);
    res.status(error.status || 500).json({ error: error.message || "Failed to decline friend request" });
  }
}

async function removeFriend(req, res) {
  try {
    const { friendId } = req.body;
    if (!friendId) return res.status(400).json({ error: "friendId required" });
    const result = await social.removeFriend(req.auth.crymsonId, friendId);
    res.json(result);
  } catch (error) {
    console.error("Remove friend error:", error.message);
    res.status(error.status || 500).json({ error: error.message || "Failed to remove friend" });
  }
}

async function getFriends(req, res) {
  try {
    const result = await social.getFriendsList(req.auth.crymsonId);
    res.json(result);
  } catch (error) {
    console.error("Get friends error:", error.message);
    res.status(error.status || 500).json({ error: error.message || "Failed to get friends" });
  }
}

async function createGroup(req, res) {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: "Group name required" });
    const result = await social.createGroup(req.auth.crymsonId, name, description);
    res.json(result);
  } catch (error) {
    console.error("Create group error:", error.message);
    res.status(error.status || 500).json({ error: error.message || "Failed to create group" });
  }
}

async function joinGroup(req, res) {
  try {
    const { inviteCode } = req.body;
    if (!inviteCode) return res.status(400).json({ error: "inviteCode required" });
    const result = await social.joinGroup(req.auth.crymsonId, inviteCode);
    res.json(result);
  } catch (error) {
    console.error("Join group error:", error.message);
    res.status(error.status || 500).json({ error: error.message || "Failed to join group" });
  }
}

async function leaveGroup(req, res) {
  try {
    const { groupId } = req.body;
    if (!groupId) return res.status(400).json({ error: "groupId required" });
    const result = await social.leaveGroup(req.auth.crymsonId, groupId);
    res.json(result);
  } catch (error) {
    console.error("Leave group error:", error.message);
    res.status(error.status || 500).json({ error: error.message || "Failed to leave group" });
  }
}

async function getUserGroups(req, res) {
  try {
    const result = await social.getUserGroups(req.auth.crymsonId);
    res.json(result);
  } catch (error) {
    console.error("Get groups error:", error.message);
    res.status(error.status || 500).json({ error: error.message || "Failed to get groups" });
  }
}

async function getGroup(req, res) {
  try {
    const result = await social.getGroupById(req.params.groupId);
    res.json(result);
  } catch (error) {
    console.error("Get group error:", error.message);
    res.status(error.status || 500).json({ error: error.message || "Failed to get group" });
  }
}

async function getStats(req, res) {
  try {
    const result = await social.getGroupStats(req.params.groupId);
    res.json(result);
  } catch (error) {
    console.error("Get group stats error:", error.message);
    res.status(error.status || 500).json({ error: error.message || "Failed to get group stats" });
  }
}

async function createChallenge(req, res) {
  try {
    const result = await social.createChallenge(req.params.groupId, req.auth.crymsonId, req.body);
    res.json(result);
  } catch (error) {
    console.error("Create challenge error:", error.message);
    res.status(error.status || 500).json({ error: error.message || "Failed to create challenge" });
  }
}

async function joinChallenge(req, res) {
  try {
    const { challengeId } = req.body;
    if (!challengeId) return res.status(400).json({ error: "challengeId required" });
    const result = await social.joinChallenge(req.params.groupId, challengeId, req.auth.crymsonId);
    res.json(result);
  } catch (error) {
    console.error("Join challenge error:", error.message);
    res.status(error.status || 500).json({ error: error.message || "Failed to join challenge" });
  }
}

async function updatePrivacy(req, res) {
  try {
    const result = await social.updatePrivacy(req.auth.crymsonId, req.body);
    res.json(result);
  } catch (error) {
    console.error("Update privacy error:", error.message);
    res.status(error.status || 500).json({ error: error.message || "Failed to update privacy" });
  }
}

async function getPrivacy(req, res) {
  try {
    const result = await social.getPrivacy(req.auth.crymsonId);
    res.json(result);
  } catch (error) {
    console.error("Get privacy error:", error.message);
    res.status(error.status || 500).json({ error: error.message || "Failed to get privacy settings" });
  }
}

module.exports = {
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
};
