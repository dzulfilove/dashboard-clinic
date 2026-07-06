import mysql from 'mysql2/promise';

async function alterTable() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      port: Number(process.env.MYSQL_PORT) || 3306,
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'simrs',
    });

    console.log('Connected. Altering table...');
    const [cols] = await connection.query("SHOW COLUMNS FROM followup_vaksin LIKE 'jumlah_pemeriksaan'");
    if (cols.length === 0) {
      await connection.query("ALTER TABLE followup_vaksin ADD COLUMN jumlah_pemeriksaan INT DEFAULT NULL");
      console.log('Column added.');
    } else {
      console.log('Column already exists.');
    }
    await connection.end();
  } catch (e) {
    console.error(e);
  }
}

alterTable();
