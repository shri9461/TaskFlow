const { MongoClient } = require('mongodb');

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function initReplicaSet() {
  const uri = 'mongodb://127.0.0.1:27017/?directConnection=true';
  console.log('Connecting to MongoDB on 127.0.0.1:27017...');

  let client;
  for (let attempt = 1; attempt <= 10; attempt++) {
    try {
      client = new MongoClient(uri, { serverSelectionTimeoutMS: 3000 });
      await client.connect();
      break;
    } catch (e) {
      console.log(`Connection attempt ${attempt} failed: ${e.message}. Retrying in 2s...`);
      await sleep(2000);
    }
  }

  if (!client) {
    console.error('Could not connect to MongoDB after multiple attempts.');
    process.exit(1);
  }

  try {
    const admin = client.db('admin');
    try {
      const status = await admin.command({ replSetGetStatus: 1 });
      console.log('✅ Replica set is already active and healthy:', status.set);
      return;
    } catch (e) {
      console.log('Replica set not active yet. Initializing rs0...');
      try {
        const initResult = await admin.command({
          replSetInitiate: {
            _id: 'rs0',
            members: [{ _id: 0, host: '127.0.0.1:27017' }],
          },
        });
        console.log('✅ Replica set rs0 initiated:', initResult);
      } catch (initErr) {
        if (initErr.codeName === 'AlreadyInitialized' || initErr.message.includes('already initialized')) {
          console.log('✅ Replica set is already initialized.');
        } else {
          const fallback = await admin.command({ replSetInitiate: {} });
          console.log('✅ Replica set initialized with default config:', fallback);
        }
      }
    }
  } catch (err) {
    console.error('Error during replica set initiation:', err.message);
  } finally {
    await client.close();
  }
}

initReplicaSet();
