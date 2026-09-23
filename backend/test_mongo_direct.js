const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.DATABASE_URL || 'mongodb://localhost:27017/taskflow';
const client = new MongoClient(uri);

let db = null;

async function getDb() {
  if (!db) {
    await client.connect();
    const parsed = new URL(uri.startsWith('mongodb://') || uri.startsWith('mongodb+srv://') ? uri : `mongodb://${uri}`);
    const dbName = (parsed.pathname || '').replace(/^\//, '') || 'taskflow';
    db = client.db(dbName);
  }
  return db;
}

function formatDoc(doc) {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return { id: _id.toString(), ...rest };
}

const user = {
  async findUnique({ where }) {
    const database = await getDb();
    const query = {};
    if (where.email) query.email = where.email;
    if (where.id) {
      try { query._id = new ObjectId(where.id); } catch { query._id = where.id; }
    }
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
    if (where.id) {
      try { query._id = new ObjectId(where.id); } catch { query._id = where.id; }
    }
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
      const objectIds = userIds.map(id => {
        try { return new ObjectId(id); } catch { return id; }
      });
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
    if (where.id) {
      try { query._id = new ObjectId(where.id); } catch { query._id = where.id; }
    }
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
    if (where.id) {
      try { query._id = new ObjectId(where.id); } catch { query._id = where.id; }
    }
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
      const ids = where.id.in.map(id => {
        try { return new ObjectId(id); } catch { return id; }
      });
      query._id = { $in: ids };
    }
    const result = await database.collection('tasks').updateMany(query, { $set: { ...data, updatedAt: new Date() } });
    return { count: result.modifiedCount };
  },

  async delete({ where }) {
    const database = await getDb();
    const query = {};
    if (where.id) {
      try { query._id = new ObjectId(where.id); } catch { query._id = where.id; }
    }
    return await database.collection('tasks').deleteOne(query);
  },
};

const prisma = {
  user,
  task,
  async $disconnect() {
    await client.close();
  },
};

async function runTest() {
  try {
    console.log('Testing direct MongoDB integration with database taskflow...');
    const email = `shristhisethi724_${Date.now()}@gmail.com`;
    const newUser = await user.create({
      data: {
        name: 'shristhi',
        email,
        password: 'hashedpassword123'
      }
    });
    console.log('✅ Created user directly in MongoDB:', newUser.id, newUser.email);

    const newTask = await task.create({
      data: {
        title: 'Complete project demo',
        userId: newUser.id,
        importance: 'high'
      }
    });
    console.log('✅ Created task directly in MongoDB:', newTask.id, newTask.title);

    const userTasks = await task.findMany({ where: { userId: newUser.id } });
    console.log(`✅ Retrieved ${userTasks.length} task(s) for user:`, userTasks[0].title);

    // Clean up
    await task.delete({ where: { id: newTask.id } });
    await user.delete({ where: { id: newUser.id } });
    console.log('✅ Cleaned up test records');
  } catch (err) {
    console.error('Test failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

runTest();
