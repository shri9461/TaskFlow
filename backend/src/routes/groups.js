const express = require('express');
const crypto = require('crypto');
const { PrismaClient } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Helper to broadcast WS notification to group members if available
function broadcastToGroupMembers(req, memberIds, payload) {
  try {
    const clients = req.app.locals.wsClients;
    if (!clients) return;
    memberIds.forEach(userId => {
      const ws = clients.get(userId);
      if (ws && ws.readyState === 1 /* OPEN */) {
        ws.send(JSON.stringify(payload));
      }
    });
  } catch (err) {
    console.error('WS broadcast error:', err);
  }
}

// ───────────────────────────────────────────────────────────
// PUBLIC / SEMI-PUBLIC: Preview group by invite code
// ───────────────────────────────────────────────────────────
router.get('/invite/:inviteCode', async (req, res) => {
  try {
    const { inviteCode } = req.params;
    const group = await prisma.group.findUnique({ where: { inviteCode } });
    if (!group) {
      return res.status(404).json({ error: 'Group or invite link not found / invalid' });
    }

    const memberCount = await prisma.groupMember.count({ where: { groupId: group.id } });
    const taskCount = (await prisma.groupTask.findMany({ where: { groupId: group.id } })).length;

    res.json({
      id: group.id,
      name: group.name,
      description: group.description,
      category: group.category,
      icon: group.icon,
      inviteCode: group.inviteCode,
      creatorName: group.creatorName,
      memberCount,
      taskCount,
      createdAt: group.createdAt,
    });
  } catch (err) {
    console.error('Error fetching invite preview:', err);
    res.status(500).json({ error: 'Failed to inspect invite link' });
  }
});

// ───────────────────────────────────────────────────────────
// All other routes require authentication
// ───────────────────────────────────────────────────────────
router.use(authenticateToken);

// GET /api/groups - Get all groups the current user belongs to
router.get('/', async (req, res) => {
  try {
    const userId = req.user.userId;
    const memberships = await prisma.groupMember.findMany({ where: { userId } });
    if (memberships.length === 0) {
      return res.json([]);
    }

    const groupIds = memberships.map(m => m.groupId);
    const groups = await prisma.group.findMany({ where: { id: { in: groupIds } } });

    // Attach membership role, member count, and task count
    const enriched = await Promise.all(
      groups.map(async grp => {
        const mem = memberships.find(m => m.groupId === grp.id);
        const memberCount = await prisma.groupMember.count({ where: { groupId: grp.id } });
        const allTasks = await prisma.groupTask.findMany({ where: { groupId: grp.id } });
        const pendingTasks = allTasks.filter(t => !t.completed).length;
        const completedTasks = allTasks.filter(t => t.completed).length;

        return {
          ...grp,
          role: mem ? mem.role : 'member',
          memberCount,
          pendingTasks,
          completedTasks,
          totalTasks: allTasks.length,
        };
      })
    );

    res.json(enriched);
  } catch (err) {
    console.error('Error fetching user groups:', err);
    res.status(500).json({ error: 'Failed to fetch your groups' });
  }
});

// GET /api/groups/discover - Get public community groups to discover
router.get('/discover', async (req, res) => {
  try {
    const userId = req.user.userId;
    const allPublic = await prisma.group.findMany({ where: { isPublic: true }, limit: 40 });
    const userMemberships = await prisma.groupMember.findMany({ where: { userId } });
    const joinedIds = new Set(userMemberships.map(m => m.groupId));

    const enriched = await Promise.all(
      allPublic.map(async grp => {
        const memberCount = await prisma.groupMember.count({ where: { groupId: grp.id } });
        const tasks = await prisma.groupTask.findMany({ where: { groupId: grp.id } });
        return {
          ...grp,
          isMember: joinedIds.has(grp.id),
          memberCount,
          totalTasks: tasks.length,
          pendingTasks: tasks.filter(t => !t.completed).length,
        };
      })
    );

    res.json(enriched);
  } catch (err) {
    console.error('Error discovering groups:', err);
    res.status(500).json({ error: 'Failed to discover community groups' });
  }
});

// POST /api/groups - Create a new community/group
router.post('/', async (req, res) => {
  try {
    const { name, description, category, icon, isPublic } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    const inviteCode = 'grp_' + crypto.randomBytes(4).toString('hex');
    const group = await prisma.group.create({
      data: {
        name: name.trim(),
        description: (description || '').trim(),
        category: category || 'Productivity',
        icon: icon || '👥',
        isPublic: isPublic !== undefined ? Boolean(isPublic) : true,
        inviteCode,
        creatorId: req.user.userId,
        creatorName: req.user.name,
      },
    });

    // Add creator as Admin
    await prisma.groupMember.create({
      data: {
        groupId: group.id,
        userId: req.user.userId,
        userName: req.user.name,
        userEmail: req.user.email,
        role: 'admin',
      },
    });

    // Add welcoming message
    await prisma.groupMessage.create({
      data: {
        groupId: group.id,
        userId: req.user.userId,
        userName: 'TaskFlow Bot',
        userEmail: 'bot@taskflow.local',
        text: `Welcome to ${group.name}! 🎉 Share tasks and collaborate with your community.`,
      },
    });

    res.status(201).json({
      ...group,
      role: 'admin',
      memberCount: 1,
      totalTasks: 0,
      pendingTasks: 0,
      completedTasks: 0,
    });
  } catch (err) {
    console.error('Error creating group:', err);
    res.status(500).json({ error: 'Failed to create group' });
  }
});

// POST /api/groups/join - Join group using invite code
router.post('/join', async (req, res) => {
  try {
    let { inviteCode } = req.body;
    if (!inviteCode || !inviteCode.trim()) {
      return res.status(400).json({ error: 'Invite code is required' });
    }

    inviteCode = inviteCode.trim();
    // Support passing full URL e.g. http://localhost:5173/join/grp_abc123
    if (inviteCode.includes('/join/')) {
      inviteCode = inviteCode.split('/join/').pop().split('?')[0].split('/')[0];
    }

    const group = await prisma.group.findUnique({ where: { inviteCode } });
    if (!group) {
      return res.status(404).json({ error: 'Invalid invite code or group does not exist' });
    }

    // Check if already a member
    const existing = await prisma.groupMember.findFirst({
      where: { groupId: group.id, userId: req.user.userId },
    });

    if (existing) {
      return res.json({
        message: 'You are already a member of this group',
        group,
        alreadyMember: true,
      });
    }

    // Join group
    await prisma.groupMember.create({
      data: {
        groupId: group.id,
        userId: req.user.userId,
        userName: req.user.name,
        userEmail: req.user.email,
        role: 'member',
      },
    });

    // Notify community feed
    await prisma.groupMessage.create({
      data: {
        groupId: group.id,
        userId: req.user.userId,
        userName: 'TaskFlow Bot',
        userEmail: 'bot@taskflow.local',
        text: `👋 ${req.user.name} has joined the community!`,
      },
    });

    // Broadcast to existing members
    const allMembers = await prisma.groupMember.findMany({ where: { groupId: group.id } });
    broadcastToGroupMembers(req, allMembers.map(m => m.userId), {
      type: 'GROUP_MEMBER_JOINED',
      groupId: group.id,
      user: { id: req.user.userId, name: req.user.name },
    });

    res.json({
      message: 'Successfully joined group',
      group,
      alreadyMember: false,
    });
  } catch (err) {
    console.error('Error joining group:', err);
    res.status(500).json({ error: 'Failed to join group' });
  }
});

// GET /api/groups/:id - Get group details & members
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const group = await prisma.group.findUnique({ where: { id } });
    if (!group) return res.status(404).json({ error: 'Group not found' });

    // Check membership
    const membership = await prisma.groupMember.findFirst({
      where: { groupId: id, userId: req.user.userId },
    });

    if (!membership && !group.isPublic) {
      return res.status(403).json({ error: 'You are not a member of this private group' });
    }

    const members = await prisma.groupMember.findMany({ where: { groupId: id } });

    res.json({
      ...group,
      role: membership ? membership.role : 'guest',
      isMember: Boolean(membership),
      members,
    });
  } catch (err) {
    console.error('Error fetching group details:', err);
    res.status(500).json({ error: 'Failed to fetch group details' });
  }
});

// DELETE /api/groups/:id/leave - Leave group
router.delete('/:id/leave', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const membership = await prisma.groupMember.findFirst({
      where: { groupId: id, userId },
    });

    if (!membership) {
      return res.status(400).json({ error: 'You are not a member of this group' });
    }

    await prisma.groupMember.delete({ where: { id: membership.id } });

    // Check remaining members count
    const remainingCount = await prisma.groupMember.count({ where: { groupId: id } });
    if (remainingCount === 0) {
      // Clean up orphaned group, tasks, and messages
      await prisma.groupTask.deleteMany({ where: { groupId: id } });
      await prisma.groupMessage.deleteMany({ where: { groupId: id } });
      await prisma.group.delete({ where: { id } });
    } else {
      // If the admin left, promote another member to admin
      if (membership.role === 'admin') {
        const nextMember = (await prisma.groupMember.findMany({ where: { groupId: id } }))[0];
        if (nextMember) {
          await prisma.groupMember.delete({ where: { id: nextMember.id } });
          await prisma.groupMember.create({
            data: {
              groupId: id,
              userId: nextMember.userId,
              userName: nextMember.userName,
              userEmail: nextMember.userEmail,
              role: 'admin',
            },
          });
        }
      }

      await prisma.groupMessage.create({
        data: {
          groupId: id,
          userId,
          userName: 'TaskFlow Bot',
          userEmail: 'bot@taskflow.local',
          text: `👋 ${req.user.name} has left the group.`,
        },
      });
    }

    res.json({ message: 'Left group successfully' });
  } catch (err) {
    console.error('Error leaving group:', err);
    res.status(500).json({ error: 'Failed to leave group' });
  }
});

// ───────────────────────────────────────────────────────────
// Group Tasks Endpoints
// ───────────────────────────────────────────────────────────

// GET /api/groups/:id/tasks - Get tasks shared in group
router.get('/:id/tasks', async (req, res) => {
  try {
    const { id } = req.params;
    const membership = await prisma.groupMember.findFirst({
      where: { groupId: id, userId: req.user.userId },
    });
    if (!membership) return res.status(403).json({ error: 'Access denied: not a group member' });

    const tasks = await prisma.groupTask.findMany({
      where: { groupId: id },
      orderBy: { createdAt: 'desc' },
    });

    res.json(tasks);
  } catch (err) {
    console.error('Error fetching group tasks:', err);
    res.status(500).json({ error: 'Failed to fetch group tasks' });
  }
});

// POST /api/groups/:id/tasks - Create a shared task in group
router.post('/:id/tasks', async (req, res) => {
  try {
    const { id } = req.params;
    const membership = await prisma.groupMember.findFirst({
      where: { groupId: id, userId: req.user.userId },
    });
    if (!membership) return res.status(403).json({ error: 'Access denied: not a group member' });

    const { title, description, importance, dueDate, assignedTo, assignedName } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Task title is required' });
    }

    const task = await prisma.groupTask.create({
      data: {
        groupId: id,
        title: title.trim(),
        description: (description || '').trim(),
        importance: importance || 'medium',
        dueDate: dueDate ? new Date(dueDate) : null,
        creatorId: req.user.userId,
        creatorName: req.user.name,
        assignedTo: assignedTo || null,
        assignedName: assignedName || null,
      },
    });

    // Notify group via WS
    const members = await prisma.groupMember.findMany({ where: { groupId: id } });
    broadcastToGroupMembers(req, members.map(m => m.userId), {
      type: 'GROUP_TASK_CREATED',
      groupId: id,
      task,
    });

    res.status(201).json(task);
  } catch (err) {
    console.error('Error creating group task:', err);
    res.status(500).json({ error: 'Failed to create group task' });
  }
});

// PATCH /api/groups/:id/tasks/:taskId - Update/complete a shared task
router.patch('/:id/tasks/:taskId', async (req, res) => {
  try {
    const { id, taskId } = req.params;
    const membership = await prisma.groupMember.findFirst({
      where: { groupId: id, userId: req.user.userId },
    });
    if (!membership) return res.status(403).json({ error: 'Access denied: not a group member' });

    const existing = await prisma.groupTask.findFirst({
      where: { id: taskId, groupId: id },
    });
    if (!existing) return res.status(404).json({ error: 'Group task not found' });

    const { title, description, completed, importance, dueDate, assignedTo, assignedName } = req.body;

    const updatePayload = {};
    if (title !== undefined) updatePayload.title = title.trim();
    if (description !== undefined) updatePayload.description = description.trim();
    if (importance !== undefined) updatePayload.importance = importance;
    if (dueDate !== undefined) updatePayload.dueDate = dueDate ? new Date(dueDate) : null;
    if (assignedTo !== undefined) updatePayload.assignedTo = assignedTo;
    if (assignedName !== undefined) updatePayload.assignedName = assignedName;

    if (completed !== undefined) {
      updatePayload.completed = completed;
      if (completed) {
        updatePayload.completedBy = req.user.name;
        updatePayload.completedAt = new Date();
      } else {
        updatePayload.completedBy = null;
        updatePayload.completedAt = null;
      }
    }

    const updated = await prisma.groupTask.update({
      where: { id: taskId, groupId: id },
      data: updatePayload,
    });

    // Broadcast to group members
    const members = await prisma.groupMember.findMany({ where: { groupId: id } });
    broadcastToGroupMembers(req, members.map(m => m.userId), {
      type: 'GROUP_TASK_UPDATED',
      groupId: id,
      task: updated,
    });

    res.json(updated);
  } catch (err) {
    console.error('Error updating group task:', err);
    res.status(500).json({ error: 'Failed to update group task' });
  }
});

// DELETE /api/groups/:id/tasks/:taskId - Delete a shared task
router.delete('/:id/tasks/:taskId', async (req, res) => {
  try {
    const { id, taskId } = req.params;
    const membership = await prisma.groupMember.findFirst({
      where: { groupId: id, userId: req.user.userId },
    });
    if (!membership) return res.status(403).json({ error: 'Access denied: not a group member' });

    const existing = await prisma.groupTask.findFirst({
      where: { id: taskId, groupId: id },
    });
    if (!existing) return res.status(404).json({ error: 'Group task not found' });

    // Allow task creator, assigned person, or admin to delete
    const canDelete =
      membership.role === 'admin' ||
      existing.creatorId === req.user.userId ||
      existing.assignedTo === req.user.userId;

    if (!canDelete) {
      return res.status(403).json({ error: 'Only group admins or task creators can delete this task' });
    }

    await prisma.groupTask.delete({ where: { id: taskId, groupId: id } });

    // Broadcast delete
    const members = await prisma.groupMember.findMany({ where: { groupId: id } });
    broadcastToGroupMembers(req, members.map(m => m.userId), {
      type: 'GROUP_TASK_DELETED',
      groupId: id,
      taskId,
    });

    res.json({ message: 'Task deleted successfully' });
  } catch (err) {
    console.error('Error deleting group task:', err);
    res.status(500).json({ error: 'Failed to delete group task' });
  }
});

// ───────────────────────────────────────────────────────────
// Community Discussion Feed Endpoints
// ───────────────────────────────────────────────────────────

// GET /api/groups/:id/messages - Get discussion messages
router.get('/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    const membership = await prisma.groupMember.findFirst({
      where: { groupId: id, userId: req.user.userId },
    });
    if (!membership) return res.status(403).json({ error: 'Access denied: not a group member' });

    const messages = await prisma.groupMessage.findMany({
      where: { groupId: id },
      limit: 100,
    });

    res.json(messages);
  } catch (err) {
    console.error('Error fetching group messages:', err);
    res.status(500).json({ error: 'Failed to fetch community messages' });
  }
});

// POST /api/groups/:id/messages - Post discussion message
router.post('/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    const membership = await prisma.groupMember.findFirst({
      where: { groupId: id, userId: req.user.userId },
    });
    if (!membership) return res.status(403).json({ error: 'Access denied: not a group member' });

    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }

    const message = await prisma.groupMessage.create({
      data: {
        groupId: id,
        userId: req.user.userId,
        userName: req.user.name,
        userEmail: req.user.email,
        text: text.trim(),
      },
    });

    // Broadcast to group members
    const members = await prisma.groupMember.findMany({ where: { groupId: id } });
    broadcastToGroupMembers(req, members.map(m => m.userId), {
      type: 'GROUP_MESSAGE_NEW',
      groupId: id,
      message,
    });

    res.status(201).json(message);
  } catch (err) {
    console.error('Error posting message:', err);
    res.status(500).json({ error: 'Failed to post community message' });
  }
});

module.exports = router;
