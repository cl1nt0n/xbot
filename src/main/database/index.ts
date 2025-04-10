import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import { app } from 'electron';
import { getLogger } from '../utils/logger';
import { encrypt, decrypt } from '../utils/crypto';

// Database SQLite per l'archiviazione locale
let db: Database | null = null;
const logger = getLogger();

/**
 * Inizializza il database SQLite
 */
export async function initDatabase(): Promise<Database> {
  if (db) {
    return db;
  }

  try {
    // Determina il percorso del database
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'xbot.db');

    logger.info(`Inizializzazione database: ${dbPath}`);

    // Configura e apri il database
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    // Abilita le foreign keys
    await db.exec('PRAGMA foreign_keys = ON');

    // Inizializza le tabelle del database
    await createTables();

    logger.info('Database inizializzato con successo');
    return db;
  } catch (error) {
    logger.error('Errore durante l\'inizializzazione del database:', error);
    throw error;
  }
}

/**
 * Crea le tabelle del database se non esistono già
 */
async function createTables(): Promise<void> {
  if (!db) {
    throw new Error('Database non inizializzato');
  }

  try {
    // Tabella per i profili utente (dati crittografati)
    await db.exec(`
      CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT,
        shipping_address TEXT,
        billing_address TEXT,
        payment_info TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    // Tabella per i proxy
    await db.exec(`
      CREATE TABLE IF NOT EXISTS proxies (
        id TEXT PRIMARY KEY,
        address TEXT NOT NULL,
        port INTEGER NOT NULL,
        username TEXT,
        password TEXT,
        type TEXT NOT NULL,
        location TEXT,
        last_tested INTEGER,
        status TEXT,
        response_time INTEGER,
        created_at INTEGER NOT NULL
      )
    `);

    // Tabella per le attività (task)
    await db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        retailer TEXT NOT NULL,
        product_url TEXT,
        product_id TEXT,
        keywords TEXT,
        size TEXT,
        color TEXT,
        profile_id TEXT,
        proxy_id TEXT,
        status TEXT NOT NULL,
        monitor_delay INTEGER NOT NULL,
        retry_delay INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (profile_id) REFERENCES profiles (id) ON DELETE SET NULL,
        FOREIGN KEY (proxy_id) REFERENCES proxies (id) ON DELETE SET NULL
      )
    `);

    // Tabella per i risultati dei task
    await db.exec(`
      CREATE TABLE IF NOT EXISTS task_results (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        status TEXT NOT NULL,
        checkout_time INTEGER,
        price REAL,
        error_message TEXT,
        order_number TEXT,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE
      )
    `);

    // Tabella per i retailer supportati
    await db.exec(`
      CREATE TABLE IF NOT EXISTS retailers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        domain TEXT NOT NULL,
        logo_url TEXT,
        is_active BOOLEAN NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL
      )
    `);

    logger.info('Tabelle del database create con successo');
  } catch (error) {
    logger.error('Errore durante la creazione delle tabelle:', error);
    throw error;
  }
}

/**
 * Ottiene l'istanza del database
 * @returns L'istanza del database
 */
export function getDatabase(): Database {
  if (!db) {
    throw new Error('Database non inizializzato');
  }
  return db;
}

/**
 * Chiude la connessione al database
 */
export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.close();
    db = null;
    logger.info('Connessione al database chiusa');
  }
}