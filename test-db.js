const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'revolution',
  password: 'Seif edd55355',
  port: 5432,
});

async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('✅ Connexion PostgreSQL réussie!');
    
    const result = await client.query('SELECT NOW()');
    console.log('⏰ Heure du serveur:', result.rows[0].now);
    
    const tables = await client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
    `);
    console.log('📋 Tables:', tables.rows);
    
    client.release();
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await pool.end();
  }
}

testConnection();
