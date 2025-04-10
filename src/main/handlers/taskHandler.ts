import { ipcMain } from 'electron';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../database';
import { getLogger } from '../utils/logger';
import { TaskManager } from '../services/taskManager';

// Logger
const logger = getLogger();

// Manager delle attività
const taskManager = new TaskManager();

/**
 * Registra gli handler IPC per la gestione delle attività
 */
export function registerTaskHandlers() {
  // Crea una nuova attività
  ipcMain.handle('task:create', async (_, taskData) => {
    try {
      logger.info('Creazione nuova attività', { name: taskData.name });
      
      const db = getDatabase();
      
      // Assegna un ID se non presente
      if (!taskData.id) {
        taskData.id = uuidv4();
      }
      
      // Assegna timestamp se non presenti
      const now = Date.now();
      if (!taskData.createdAt) {
        taskData.createdAt = now;
      }
      if (!taskData.updatedAt) {
        taskData.updatedAt = now;
      }
      
      // Inserisci nel database
      await db.run(
        `INSERT INTO tasks (
          id, name, retailer, product_url, product_id, keywords, size, color, 
          profile_id, proxy_id, status, monitor_delay, retry_delay, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          taskData.id,
          taskData.name,
          taskData.retailer,
          taskData.productUrl || null,
          taskData.productId || null,
          taskData.keywords || null,
          taskData.size || null,
          taskData.color || null,
          taskData.profileId || null,
          taskData.proxyId || null,
          taskData.status || 'idle',
          taskData.monitorDelay || 3000,
          taskData.retryDelay || 1500,
          taskData.createdAt,
          taskData.updatedAt
        ]
      );
      
      logger.info('Attività creata con successo', { id: taskData.id });
      return taskData;
    } catch (error) {
      logger.error('Errore durante la creazione dell\'attività', error);
      throw error;
    }
  });
  
  // Ottieni tutte le attività
  ipcMain.handle('task:getAll', async () => {
    try {
      logger.info('Recupero di tutte le attività');
      
      const db = getDatabase();
      const tasks = await db.all('SELECT * FROM tasks ORDER BY created_at DESC');
      
      logger.info(`Recuperate ${tasks.length} attività`);
      return tasks;
    } catch (error) {
      logger.error('Errore durante il recupero delle attività', error);
      throw error;
    }
  });
  
  // Ottieni una singola attività per ID
  ipcMain.handle('task:getById', async (_, id) => {
    try {
      logger.info('Recupero attività per ID', { id });
      
      const db = getDatabase();
      const task = await db.get('SELECT * FROM tasks WHERE id = ?', [id]);
      
      if (!task) {
        logger.warn('Attività non trovata', { id });
        throw new Error('Attività non trovata');
      }
      
      logger.info('Attività recuperata con successo', { id });
      return task;
    } catch (error) {
      logger.error('Errore durante il recupero dell\'attività', error);
      throw error;
    }
  });
  
  // Aggiorna un'attività esistente
  ipcMain.handle('task:update', async (_, id, taskData) => {
    try {
      logger.info('Aggiornamento attività', { id });
      
      const db = getDatabase();
      
      // Aggiorna il timestamp
      taskData.updatedAt = Date.now();
      
      // Costruisci la query di aggiornamento dinamicamente
      const updateFields = [];
      const updateValues = [];
      
      for (const [key, value] of Object.entries(taskData)) {
        if (key !== 'id') { // Non aggiornare l'ID
          updateFields.push(`${key} = ?`);
          updateValues.push(value);
        }
      }
      
      // Aggiungi l'ID per la clausola WHERE
      updateValues.push(id);
      
      const query = `UPDATE tasks SET ${updateFields.join(', ')} WHERE id = ?`;
      await db.run(query, updateValues);
      
      logger.info('Attività aggiornata con successo', { id });
      return { id, ...taskData };
    } catch (error) {
      logger.error('Errore durante l\'aggiornamento dell\'attività', error);
      throw error;
    }
  });
  
  // Elimina un'attività
  ipcMain.handle('task:delete', async (_, id) => {
    try {
      logger.info('Eliminazione attività', { id });
      
      const db = getDatabase();
      
      // Ferma l'attività se in esecuzione
      if (taskManager.isTaskRunning(id)) {
        await taskManager.stopTask(id);
      }
      
      await db.run('DELETE FROM tasks WHERE id = ?', [id]);
      
      logger.info('Attività eliminata con successo', { id });
      return id;
    } catch (error) {
      logger.error('Errore durante l\'eliminazione dell\'attività', error);
      throw error;
    }
  });
  
  // Avvia un'attività
  ipcMain.handle('task:start', async (_, id) => {
    try {
      logger.info('Avvio attività', { id });
      
      const db = getDatabase();
      const task = await db.get('SELECT * FROM tasks WHERE id = ?', [id]);
      
      if (!task) {
        logger.warn('Attività non trovata', { id });
        throw new Error('Attività non trovata');
      }
      
      // Aggiorna lo stato nel database
      await db.run(
        'UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?',
        ['monitoring', Date.now(), id]
      );
      
      // Avvia l'attività con il task manager
      await taskManager.startTask(task);
      
      logger.info('Attività avviata con successo', { id });
      return { ...task, status: 'monitoring' };
    } catch (error) {
      logger.error('Errore durante l\'avvio dell\'attività', error);
      throw error;
    }
  });
  
  // Ferma un'attività
  ipcMain.handle('task:stop', async (_, id) => {
    try {
      logger.info('Arresto attività', { id });
      
      const db = getDatabase();
      const task = await db.get('SELECT * FROM tasks WHERE id = ?', [id]);
      
      if (!task) {
        logger.warn('Attività non trovata', { id });
        throw new Error('Attività non trovata');
      }
      
      // Ferma l'attività con il task manager
      await taskManager.stopTask(id);
      
      // Aggiorna lo stato nel database
      await db.run(
        'UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?',
        ['idle', Date.now(), id]
      );
      
      logger.info('Attività arrestata con successo', { id });
      return { ...task, status: 'idle' };
    } catch (error) {
      logger.error('Errore durante l\'arresto dell\'attività', error);
      throw error;
    }
  });
}