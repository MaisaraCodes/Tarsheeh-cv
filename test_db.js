import sql from './backend/agents/database/db.js';

async function testConnection() {
  try {
    console.log("Testing connection...");
    const result = await sql`SELECT 1 as test`;
    console.log("✅ Connection successful!");
    console.log(result);
  } catch (error) {
    console.error("❌ Connection failed!");
    console.error(error.message);
  } finally {
    process.exit(0);
  }
}

testConnection();
