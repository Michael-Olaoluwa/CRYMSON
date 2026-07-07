const UserState = require("../models/UserState");
const Group = require("../models/Group");
const crypto = require("crypto");

function generateId(prefix = "SOC") {
  const num = String(Date.now()).slice(-6) + String(Math.floor(Math.random() * 1000)).padStart(3, "0");
  return `${prefix}${num}`;
}

function generateInviteCode() {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

/* ── Friends ── */

async function sendFriendRequest(userId, targetCrymsonId) {
  if (userId === targetCrymsonId) {
    throw { status: 400, message: "Cannot friend yourself" };
  }

  const [user, target] = await Promise.all([
    UserState.findOne({ userId }),
    UserState.findOne({ userId: targetCrymsonId }),
  ]);

  if (!user) throw { status: 404, message: "User not found" };
  if (!target) throw { status: 404, message: "Target user not found" };

  const friends = user.social?.friends || [];
  if (friends.includes(targetCrymsonId)) {
    throw { status: 409, message: "Already friends" };
  }

  const requests = user.social?.friendRequests || [];
  if (requests.some((r) => r.from === targetCrymsonId && r.status === "pending")) {
    throw { status: 409, message: "Pending request from this user" };
  }

  const targetRequests = target.social?.friendRequests || [];
  if (targetRequests.some((r) => r.from === userId && r.status === "pending")) {
    throw { status: 409, message: "Friend request already sent" };
  }

  const request = { from: userId, status: "pending", createdAt: new Date().toISOString() };

  target.social = target.social || {};
  target.social.friendRequests = [...(target.social.friendRequests || []), request];
  await target.save();

  return { message: "Friend request sent" };
}

async function acceptFriendRequest(userId, fromUserId) {
  const user = await UserState.findOne({ userId });
  if (!user) throw { status: 404, message: "User not found" };

  const requests = user.social?.friendRequests || [];
  const idx = requests.findIndex((r) => r.from === fromUserId && r.status === "pending");
  if (idx === -1) throw { status: 404, message: "No pending request from this user" };

  requests[idx].status = "accepted";
  user.social.friendRequests = requests;
  user.social.friends = [...new Set([...(user.social.friends || []), fromUserId])];
  await user.save();

  const friend = await UserState.findOne({ userId: fromUserId });
  if (friend) {
    friend.social = friend.social || {};
    friend.social.friends = [...new Set([...(friend.social.friends || []), userId])];
    await friend.save();
  }

  return { message: "Friend request accepted" };
}

async function declineFriendRequest(userId, fromUserId) {
  const user = await UserState.findOne({ userId });
  if (!user) throw { status: 404, message: "User not found" };

  const requests = user.social?.friendRequests || [];
  const idx = requests.findIndex((r) => r.from === fromUserId && r.status === "pending");
  if (idx === -1) throw { status: 404, message: "No pending request from this user" };

  requests.splice(idx, 1);
  user.social.friendRequests = requests;
  await user.save();

  return { message: "Friend request declined" };
}

async function removeFriend(userId, friendId) {
  const user = await UserState.findOne({ userId });
  if (!user) throw { status: 404, message: "User not found" };

  user.social.friends = (user.social.friends || []).filter((f) => f !== friendId);
  await user.save();

  const friend = await UserState.findOne({ userId: friendId });
  if (friend) {
    friend.social.friends = (friend.social.friends || []).filter((f) => f !== userId);
    await friend.save();
  }

  return { message: "Friend removed" };
}

async function getFriendsList(userId) {
  const user = await UserState.findOne({ userId });
  if (!user) throw { status: 404, message: "User not found" };

  const friends = user.social?.friends || [];
  const friendRequests = (user.social?.friendRequests || []).filter((r) => r.status === "pending");

  return { friends, friendRequests };
}

/* ── Groups ── */

async function createGroup(userId, name, description = "") {
  const user = await UserState.findOne({ userId });
  if (!user) throw { status: 404, message: "User not found" };

  const group = await Group.create({
    id: generateId("GRP"),
    name,
    description,
    createdBy: userId,
    members: [userId],
    inviteCode: generateInviteCode(),
    challenges: [],
  });

  user.social = user.social || {};
  user.social.groups = [...new Set([...(user.social.groups || []), group.id])];
  await user.save();

  return group.toObject();
}

async function joinGroup(userId, inviteCode) {
  const group = await Group.findOne({ inviteCode });
  if (!group) throw { status: 404, message: "Group not found" };

  if (group.members.includes(userId)) {
    throw { status: 409, message: "Already a member" };
  }

  if (group.members.length >= 50) {
    throw { status: 400, message: "Group is full" };
  }

  group.members.push(userId);
  await group.save();

  const user = await UserState.findOne({ userId });
  if (user) {
    user.social = user.social || {};
    user.social.groups = [...new Set([...(user.social.groups || []), group.id])];
    await user.save();
  }

  return { id: group.id, name: group.name, inviteCode: group.inviteCode };
}

async function leaveGroup(userId, groupId) {
  const group = await Group.findOne({ id: groupId });
  if (!group) throw { status: 404, message: "Group not found" };
  if (!group.members.includes(userId)) throw { status: 400, message: "Not a member" };

  group.members = group.members.filter((m) => m !== userId);
  await group.save();

  const user = await UserState.findOne({ userId });
  if (user) {
    user.social.groups = (user.social.groups || []).filter((g) => g !== groupId);
    await user.save();
  }

  return { message: "Left group" };
}

async function getUserGroups(userId) {
  const user = await UserState.findOne({ userId });
  if (!user) throw { status: 404, message: "User not found" };

  const groupIds = user.social?.groups || [];
  if (groupIds.length === 0) return [];

  const groups = await Group.find({ id: { $in: groupIds } });
  return groups.map((g) => g.toObject());
}

async function getGroupById(groupId) {
  const group = await Group.findOne({ id: groupId });
  if (!group) throw { status: 404, message: "Group not found" };
  return group.toObject();
}

/* ── Stats / Leaderboard ── */

async function getGroupStats(groupId) {
  const group = await Group.findOne({ id: groupId });
  if (!group) throw { status: 404, message: "Group not found" };

  const memberStates = await UserState.find({ userId: { $in: group.members } });

  const stats = memberStates.map((us) => {
    const sessions = Array.isArray(us.timeSessions) ? us.timeSessions : [];
    const tasks = Array.isArray(us.tasks) ? us.tasks : [];
    const privacy = us.social?.privacy || {};

    const totalSeconds = sessions.reduce((sum, s) => sum + (Number(s.durationSeconds) || 0), 0);
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.completed).length;
    const taskRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const today = new Date().toISOString().slice(0, 10);
    const todaySessions = sessions.filter((s) => {
      const d = s.startedAt || s.date;
      return d && d.slice(0, 10) === today;
    });
    const todaySeconds = todaySessions.reduce((sum, s) => sum + (Number(s.durationSeconds) || 0), 0);

    const result = { userId: us.userId };

    if (privacy.showStudyHours !== false) {
      result.totalHours = Math.round((totalSeconds / 3600) * 10) / 10;
      result.todayHours = Math.round((todaySeconds / 3600) * 10) / 10;
    }
    if (privacy.showTaskRate !== false) {
      result.taskCompletionRate = taskRate;
    }
    if (privacy.showStreak !== false) {
      result.streak = 0;
    }

    return result;
  });

  return stats;
}

/* ── Challenges ── */

async function createChallenge(groupId, userId, data) {
  const group = await Group.findOne({ id: groupId });
  if (!group) throw { status: 404, message: "Group not found" };
  if (!group.members.includes(userId)) throw { status: 403, message: "Not a group member" };

  const challenge = {
    id: generateId("CHL"),
    title: data.title,
    description: data.description || "",
    type: data.type,
    target: Number(data.target),
    unit: data.unit || "",
    startDate: data.startDate || new Date().toISOString(),
    endDate: data.endDate,
    createdBy: userId,
    participants: [],
    createdAt: new Date().toISOString(),
  };

  group.challenges = [...(group.challenges || []), challenge];
  await group.save();

  return challenge;
}

async function joinChallenge(groupId, challengeId, userId) {
  const group = await Group.findOne({ id: groupId });
  if (!group) throw { status: 404, message: "Group not found" };

  const challenge = (group.challenges || []).find((c) => c.id === challengeId);
  if (!challenge) throw { status: 404, message: "Challenge not found" };

  if (challenge.participants.some((p) => p.userId === userId)) {
    throw { status: 409, message: "Already joined" };
  }

  challenge.participants.push({ userId, progress: 0, completed: false });
  await group.save();

  return challenge;
}

/* ── Privacy ── */

async function updatePrivacy(userId, privacy) {
  const user = await UserState.findOne({ userId });
  if (!user) throw { status: 404, message: "User not found" };

  user.social = user.social || {};
  user.social.privacy = { ...(user.social.privacy || {}), ...privacy };
  await user.save();

  return user.social.privacy;
}

async function getPrivacy(userId) {
  const user = await UserState.findOne({ userId });
  if (!user) throw { status: 404, message: "User not found" };

  return user.social?.privacy || { showStudyHours: true, showTaskRate: true, showScore: false, showFinance: false, showStreak: true };
}

module.exports = {
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  removeFriend,
  getFriendsList,
  createGroup,
  joinGroup,
  leaveGroup,
  getUserGroups,
  getGroupById,
  getGroupStats,
  createChallenge,
  joinChallenge,
  updatePrivacy,
  getPrivacy,
};
