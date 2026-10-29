import dotenv from 'dotenv';
dotenv.config();

import { initializeDatabase, runMigrationScript } from '../src/db/connection.js';

// Dijalankan otomatis sebelum build: membuat tabel yang belum ada (CREATE TABLE IF NOT EXISTS), tanpa seed ulang.
const status = await initializeDatabase();
if (status.isVirtual) {
  console.warn(`[migrate] DB MySQL tidak tersedia (${status.error}). Migrasi dilewati.`);
  process.exit(0);
}

const result = await runMigrationScript({ cleanReset: false, schemaOnly: true });
console.log(`[migrate] ${result.message}`);
process.exit(0);
