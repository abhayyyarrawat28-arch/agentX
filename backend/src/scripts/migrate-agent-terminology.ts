import mongoose from 'mongoose';
import { env } from '../config/env';

async function dropIndexIfExists(collection: mongoose.mongo.Collection, indexName: string) {
  try {
    await collection.dropIndex(indexName);
    console.log(`Dropped index ${collection.collectionName}.${indexName}`);
  } catch (error: any) {
    if (error?.codeName === 'IndexNotFound' || /index not found/i.test(String(error?.message))) {
      return;
    }
    throw error;
  }
}

async function main() {
  await mongoose.connect(env.mongoUri);
  console.log(`Connected to MongoDB: ${env.mongoUri}`);

  const db = mongoose.connection.db;
  if (!db) throw new Error('Database connection not available');

  const users = db.collection('users');
  const policyHolders = db.collection('policyholders');
  const agentPolicies = db.collection('agentpolicies');

  await dropIndexIfExists(policyHolders, 'advisorId_1_panNumber_1');
  await dropIndexIfExists(policyHolders, 'advisorId_1');
  await dropIndexIfExists(agentPolicies, 'advisorId_1_issueDate_-1');

  const userRoleResult = await users.updateMany(
    { role: 'advisor' },
    { $set: { role: 'agent' } },
  );

  const policyHolderRenameResult = await policyHolders.updateMany(
    { advisorId: { $exists: true }, agentId: { $exists: false } },
    { $rename: { advisorId: 'agentId' } },
  );

  const agentPolicyRenameResult = await agentPolicies.updateMany(
    { advisorId: { $exists: true }, agentId: { $exists: false } },
    { $rename: { advisorId: 'agentId' } },
  );

  await dropIndexIfExists(policyHolders, 'agentId_1_panNumber_1');
  await dropIndexIfExists(policyHolders, 'agentId_1');
  await dropIndexIfExists(agentPolicies, 'agentId_1_issueDate_-1');

  await policyHolders.createIndex({ agentId: 1, panNumber: 1 }, { unique: true });
  await policyHolders.createIndex({ agentId: 1 });
  await agentPolicies.createIndex({ agentId: 1, issueDate: -1 });

  console.log('Migration complete');
  console.log(`Users updated: ${userRoleResult.modifiedCount}`);
  console.log(`Policy holders renamed: ${policyHolderRenameResult.modifiedCount}`);
  console.log(`Agent policies renamed: ${agentPolicyRenameResult.modifiedCount}`);

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error('Migration failed', error);
  try {
    await mongoose.disconnect();
  } catch {
    // noop
  }
  process.exit(1);
});