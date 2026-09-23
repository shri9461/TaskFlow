const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.DATABASE_URL || 'mongodb://localhost:27017/taskflow';
const client = new MongoClient(uri);

let db = null;

async function getDb() {
  if (!db) {
    await client.connect();
    let dbName = 'taskflow';
    try {
      const parsed = new URL(uri.startsWith('mongodb://') || uri.startsWith('mongodb+srv://') ? uri : `mongodb://${uri}`);
      dbName = (parsed.pathname || '').replace(/^\//, '') || 'taskflow';
    } catch {
      dbName = 'taskflow';
    }
    db = client.db(dbName);

    // Create indexes safely in background
    db.collection('users').createIndex({ email: 1 }, { unique: true }).catch(() => {});
    db.collection('tasks').createIndex({ userId: 1 }).catch(() => {});
    db.collection('groups').createIndex({ inviteCode: 1 }, { unique: true }).catch(() => {});
    db.collection('group_members').createIndex({ groupId: 1, userId: 1 }, { unique: true }).catch(() => {});
    db.collection('group_tasks').createIndex({ groupId: 1 }).catch(() => {});
    db.collection('group_messages').createIndex({ groupId: 1, createdAt: 1 }).catch(() => {});
  }
  return db;
}

function formatDoc(doc) {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return { id: _id.toString(), ...rest };
}

function toObjectId(id) {
  if (!id) return id;
  if (id instanceof ObjectId) return id;
  try {
    return new ObjectId(id);
  } catch {
    return id;
  }
}

const user = {
  async findUnique({ where }) {
    const database = await getDb();
    const query = {};
    if (where.email) query.email = where.email;
    if (where.id) query._id = toObjectId(where.id);
    const doc = await database.collection('users').findOne(query);
    return formatDoc(doc);
  },

  async create({ data }) {
    const database = await getDb();
    const now = new Date();
    const docToInsert = {
      ...data,
      status: data.status || 'Available',
      createdAt: now,
      updatedAt: now,
    };
    const result = await database.collection('users').insertOne(docToInsert);
    return { id: result.insertedId.toString(), ...docToInsert };
  },

  async count() {
    const database = await getDb();
    return await database.collection('users').countDocuments();
  },

  async delete({ where }) {
    const database = await getDb();
    const query = {};
    if (where.id) query._id = toObjectId(where.id);
    return await database.collection('users').deleteOne(query);
  }
};

const task = {
  async findMany({ where = {}, orderBy, include } = {}) {
    const database = await getDb();
    const query = {};

    if (where.userId) query.userId = where.userId;
    if (where.reminderSent !== undefined) query.reminderSent = where.reminderSent;
    if (where.completed !== undefined) query.completed = where.completed;
    if (where.reminderAt) {
      query.reminderAt = {};
      if (where.reminderAt.gte) query.reminderAt.$gte = new Date(where.reminderAt.gte);
      if (where.reminderAt.lte) query.reminderAt.$lte = new Date(where.reminderAt.lte);
    }

    let cursor = database.collection('tasks').find(query);
    if (orderBy && orderBy.createdAt === 'desc') {
      cursor = cursor.sort({ createdAt: -1 });
    }

    const docs = await cursor.toArray();
    let tasks = docs.map(formatDoc);

    if (include && include.user) {
      const userIds = [...new Set(tasks.map(t => t.userId).filter(Boolean))];
      const objectIds = userIds.map(toObjectId);
      const users = await database.collection('users').find({ _id: { $in: objectIds } }).toArray();
      const userMap = new Map();
      users.forEach(u => {
        userMap.set(u._id.toString(), { id: u._id.toString(), name: u.name, email: u.email });
      });

      tasks = tasks.map(t => ({
        ...t,
        user: userMap.get(t.userId) || null,
      }));
    }

    return tasks;
  },

  async findFirst({ where }) {
    const database = await getDb();
    const query = {};
    if (where.id) query._id = toObjectId(where.id);
    if (where.userId) query.userId = where.userId;
    const doc = await database.collection('tasks').findOne(query);
    return formatDoc(doc);
  },

  async create({ data }) {
    const database = await getDb();
    const now = new Date();
    const docToInsert = {
      completed: false,
      department: null,
      category: null,
      estimatedHours: null,
      actualHours: null,
      assignee: null,
      subtasks: null,
      notes: null,
      impact: null,
      reminderSent: false,
      focusMode: false,
      ...data,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      reminderAt: data.reminderAt ? new Date(data.reminderAt) : null,
      createdAt: now,
      updatedAt: now,
    };
    const result = await database.collection('tasks').insertOne(docToInsert);
    return { id: result.insertedId.toString(), ...docToInsert };
  },

  async update({ where, data }) {
    const database = await getDb();
    const query = {};
    if (where.id) query._id = toObjectId(where.id);
    const updateData = { ...data, updatedAt: new Date() };
    if (updateData.dueDate !== undefined) {
      updateData.dueDate = updateData.dueDate ? new Date(updateData.dueDate) : null;
    }
    if (updateData.reminderAt !== undefined) {
      updateData.reminderAt = updateData.reminderAt ? new Date(updateData.reminderAt) : null;
    }
    await database.collection('tasks').updateOne(query, { $set: updateData });
    const updated = await database.collection('tasks').findOne(query);
    return formatDoc(updated);
  },

  async updateMany({ where, data }) {
    const database = await getDb();
    const query = {};
    if (where.id && where.id.in) {
      const ids = where.id.in.map(toObjectId);
      query._id = { $in: ids };
    }
    const result = await database.collection('tasks').updateMany(query, { $set: { ...data, updatedAt: new Date() } });
    return { count: result.modifiedCount };
  },

  async delete({ where }) {
    const database = await getDb();
    const query = {};
    if (where.id) query._id = toObjectId(where.id);
    return await database.collection('tasks').deleteOne(query);
  },
};

const group = {
  async findUnique({ where }) {
    const database = await getDb();
    const query = {};
    if (where.id) query._id = toObjectId(where.id);
    if (where.inviteCode) query.inviteCode = where.inviteCode;
    const doc = await database.collection('groups').findOne(query);
    return formatDoc(doc);
  },

  async findMany({ where = {}, limit = 50 } = {}) {
    const database = await getDb();
    const query = {};
    if (where.isPublic !== undefined) query.isPublic = where.isPublic;
    if (where.id && where.id.in) {
      const ids = where.id.in.map(toObjectId);
      query._id = { $in: ids };
    }
    const docs = await database.collection('groups').find(query).limit(limit).toArray();
    return docs.map(formatDoc);
  },

  async create({ data }) {
    const database = await getDb();
    const now = new Date();
    const docToInsert = {
      name: data.name,
      description: data.description || '',
      category: data.category || 'General',
      isPublic: data.isPublic !== undefined ? data.isPublic : true,
      inviteCode: data.inviteCode,
      creatorId: toObjectId(data.creatorId).toString(),
      creatorName: data.creatorName || '',
      icon: data.icon || '🚀',
      createdAt: now,
      updatedAt: now,
    };
    const result = await database.collection('groups').insertOne(docToInsert);
    return { id: result.insertedId.toString(), ...docToInsert };
  },

  async update({ where, data }) {
    const database = await getDb();
    const query = {};
    if (where.id) query._id = toObjectId(where.id);
    const updateData = { ...data, updatedAt: new Date() };
    await database.collection('groups').updateOne(query, { $set: updateData });
    const updated = await database.collection('groups').findOne(query);
    return formatDoc(updated);
  },

  async delete({ where }) {
    const database = await getDb();
    const query = {};
    if (where.id) query._id = toObjectId(where.id);
    return await database.collection('groups').deleteOne(query);
  }
};

const groupMember = {
  async findFirst({ where }) {
    const database = await getDb();
    const query = {};
    if (where.groupId) query.groupId = where.groupId.toString();
    if (where.userId) query.userId = where.userId.toString();
    const doc = await database.collection('group_members').findOne(query);
    return formatDoc(doc);
  },

  async findMany({ where = {} } = {}) {
    const database = await getDb();
    const query = {};
    if (where.groupId) query.groupId = where.groupId.toString();
    if (where.userId) query.userId = where.userId.toString();
    const docs = await database.collection('group_members').find(query).toArray();
    return docs.map(formatDoc);
  },

  async create({ data }) {
    const database = await getDb();
    const now = new Date();
    const docToInsert = {
      groupId: data.groupId.toString(),
      userId: data.userId.toString(),
      userName: data.userName || 'Member',
      userEmail: data.userEmail || '',
      role: data.role || 'member', // 'admin' | 'member'
      joinedAt: now,
    };
    const result = await database.collection('group_members').insertOne(docToInsert);
    return { id: result.insertedId.toString(), ...docToInsert };
  },

  async count({ where = {} } = {}) {
    const database = await getDb();
    const query = {};
    if (where.groupId) query.groupId = where.groupId.toString();
    if (where.userId) query.userId = where.userId.toString();
    return await database.collection('group_members').countDocuments(query);
  },

  async delete({ where }) {
    const database = await getDb();
    const query = {};
    if (where.groupId) query.groupId = where.groupId.toString();
    if (where.userId) query.userId = where.userId.toString();
    if (where.id) query._id = toObjectId(where.id);
    return await database.collection('group_members').deleteOne(query);
  },

  async deleteMany({ where }) {
    const database = await getDb();
    const query = {};
    if (where.groupId) query.groupId = where.groupId.toString();
    return await database.collection('group_members').deleteMany(query);
  }
};

const groupTask = {
  async findMany({ where = {}, orderBy } = {}) {
    const database = await getDb();
    const query = {};
    if (where.groupId) query.groupId = where.groupId.toString();
    if (where.completed !== undefined) query.completed = where.completed;
    if (where.assignedTo) query.assignedTo = where.assignedTo.toString();

    let cursor = database.collection('group_tasks').find(query);
    if (orderBy && orderBy.createdAt === 'desc') {
      cursor = cursor.sort({ createdAt: -1 });
    } else {
      cursor = cursor.sort({ createdAt: -1 });
    }
    const docs = await cursor.toArray();
    return docs.map(formatDoc);
  },

  async findFirst({ where }) {
    const database = await getDb();
    const query = {};
    if (where.id) query._id = toObjectId(where.id);
    if (where.groupId) query.groupId = where.groupId.toString();
    const doc = await database.collection('group_tasks').findOne(query);
    return formatDoc(doc);
  },

  async create({ data }) {
    const database = await getDb();
    const now = new Date();
    const docToInsert = {
      groupId: data.groupId.toString(),
      title: data.title,
      description: data.description || '',
      importance: data.importance || 'medium',
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      creatorId: data.creatorId.toString(),
      creatorName: data.creatorName || '',
      assignedTo: data.assignedTo ? data.assignedTo.toString() : null,
      assignedName: data.assignedName || null,
      completed: false,
      completedBy: null,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    const result = await database.collection('group_tasks').insertOne(docToInsert);
    return { id: result.insertedId.toString(), ...docToInsert };
  },

  async update({ where, data }) {
    const database = await getDb();
    const query = {};
    if (where.id) query._id = toObjectId(where.id);
    if (where.groupId) query.groupId = where.groupId.toString();

    const updateData = { ...data, updatedAt: new Date() };
    if (updateData.dueDate !== undefined) {
      updateData.dueDate = updateData.dueDate ? new Date(updateData.dueDate) : null;
    }
    if (updateData.completed === true && !updateData.completedAt) {
      updateData.completedAt = new Date();
    } else if (updateData.completed === false) {
      updateData.completedAt = null;
      updateData.completedBy = null;
    }

    await database.collection('group_tasks').updateOne(query, { $set: updateData });
    const updated = await database.collection('group_tasks').findOne(query);
    return formatDoc(updated);
  },

  async delete({ where }) {
    const database = await getDb();
    const query = {};
    if (where.id) query._id = toObjectId(where.id);
    if (where.groupId) query.groupId = where.groupId.toString();
    return await database.collection('group_tasks').deleteOne(query);
  },

  async deleteMany({ where }) {
    const database = await getDb();
    const query = {};
    if (where.groupId) query.groupId = where.groupId.toString();
    return await database.collection('group_tasks').deleteMany(query);
  }
};

const groupMessage = {
  async findMany({ where = {}, limit = 100 } = {}) {
    const database = await getDb();
    const query = {};
    if (where.groupId) query.groupId = where.groupId.toString();

    const docs = await database.collection('group_messages')
      .find(query)
      .sort({ createdAt: 1 })
      .limit(limit)
      .toArray();
    return docs.map(formatDoc);
  },

  async create({ data }) {
    const database = await getDb();
    const now = new Date();
    const docToInsert = {
      groupId: data.groupId.toString(),
      userId: data.userId.toString(),
      userName: data.userName || 'Member',
      userEmail: data.userEmail || '',
      text: data.text,
      createdAt: now,
    };
    const result = await database.collection('group_messages').insertOne(docToInsert);
    return { id: result.insertedId.toString(), ...docToInsert };
  },

  async deleteMany({ where }) {
    const database = await getDb();
    const query = {};
    if (where.groupId) query.groupId = where.groupId.toString();
    return await database.collection('group_messages').deleteMany(query);
  }
};

const prisma = {
  user,
  task,
  group,
  groupMember,
  groupTask,
  groupMessage,
  async $disconnect() {
    await client.close();
  },
};

module.exports = {
  PrismaClient: function() { return prisma; },
  prisma,
  client,
  getDb
};
