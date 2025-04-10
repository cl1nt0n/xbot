import { BrowserWindow, webContents } from 'electron';
import { getLogger } from '../utils/logger';
import { getDatabase } from '../database';
import { ProxyManager } from './proxyManager';
import { BrowserAutomation } from './browserAutomation';

// Logger
const logger = getLogger();

// Manager dei proxy
const proxyManager = new ProxyManager();

// Interfaccia per un'attività
interface Task {
  id: string;
  name: string;
  retailer: string;
  productUrl?: string;
  productId?: string;
  keywords?: string;
  size?: string;
  color?: string;
  profileId?: string;
  proxyId?: string;
  status: string;
  monitorDelay: number;
  retryDelay: number;
  createdAt: number;
  updatedAt: number;
}

/**
 * Classe per la gestione delle attività
 */
export class TaskManager {
  private runningTasks: Map<string, any> = new Map();
  private mainWindow: BrowserWindow | null = null;
  
  /**
   * Imposta la finestra principale per inviare aggiornamenti UI
   * @param window La finestra principale dell'applicazione
   */
  setMainWindow(window: BrowserWindow) {
    this.mainWindow = window;
  }
  
  /**
   * Verifica se un'attività è in esecuzione
   * @param taskId ID dell'attività
   * @returns true se l'attività è in esecuzione, false altrimenti
   */
  isTaskRunning(taskId: string): boolean {
    return this.runningTasks.has(taskId);
  }
  
  /**
   * Avvia un'attività
   * @param task Dati dell'attività da avviare
   */
  async startTask(task: Task) {
    try {
      logger.info(`Avvio attività: ${task.name}`, { taskId: task.id });
      
      // Se l'attività è già in esecuzione, fermala prima
      if (this.isTaskRunning(task.id)) {
        await this.stopTask(task.id);
      }
      
      // Ottieni proxy se specificato
      let proxy = null;
      if (task.proxyId) {
        proxy = await proxyManager.getProxy(task.proxyId);
        
        if (!proxy) {
          throw new Error(`Proxy non trovato: ${task.proxyId}`);
        }
      }
      
      // Crea un'istanza di automazione del browser
      const automation = new BrowserAutomation({
        task,
        proxy,
        onUpdate: (status) => this.handleTaskUpdate(task.id, status),
        onComplete: (result) => this.handleTaskComplete(task.id, result),
        onError: (error) => this.handleTaskError(task.id, error),
      });
      
      // Avvia l'automazione
      await automation.start();
      
      // Aggiungi l'attività alle attività in esecuzione
      this.runningTasks.set(task.id, automation);
      
      // Invia aggiornamento all'UI
      this.sendTaskUpdate(task.id, 'monitoring');
      
      logger.info(`Attività avviata con successo: ${task.name}`, { taskId: task.id });
    } catch (error) {
      logger.error(`Errore durante l'avvio dell'attività: ${task.name}`, error);
      
      // Aggiorna lo stato nel database
      try {
        const db = getDatabase();
        await db.run(
          'UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?',
          ['idle', Date.now(), task.id]
        );
      } catch (dbError) {
        logger.error('Errore durante l\'aggiornamento dello stato nel database', dbError);
      }
      
      // Invia errore all'UI
      this.sendTaskError(task.id, error);
      
      throw error;
    }
  }
  
  /**
   * Ferma un'attività in esecuzione
   * @param taskId ID dell'attività da fermare
   */
  async stopTask(taskId: string) {
    try {
      logger.info(`Arresto attività: ${taskId}`);
      
      // Ottieni l'automazione dall'elenco
      const automation = this.runningTasks.get(taskId);
      
      if (!automation) {
        logger.warn(`Tentativo di arrestare un'attività non in esecuzione: ${taskId}`);
        return;
      }
      
      // Arresta l'automazione
      await automation.stop();
      
      // Rimuovi l'attività dalle attività in esecuzione
      this.runningTasks.delete(taskId);
      
      // Invia aggiornamento all'UI
      this.sendTaskUpdate(taskId, 'idle');
      
      logger.info(`Attività arrestata con successo: ${taskId}`);
    } catch (error) {
      logger.error(`Errore durante l'arresto dell'attività: ${taskId}`, error);
      
      // Rimuovi comunque l'attività dalle attività in esecuzione
      this.runningTasks.delete(taskId);
      
      // Invia errore all'UI
      this.sendTaskError(taskId, error);
      
      throw error;
    }
  }
  
  /**
   * Gestisce un aggiornamento di stato di un'attività
   * @param taskId ID dell'attività
   * @param status Nuovo stato dell'attività
   */
  private async handleTaskUpdate(taskId: string, status: string) {
    try {
      logger.info(`Aggiornamento stato attività: ${taskId}`, { status });
      
      // Aggiorna lo stato nel database
      const db = getDatabase();
      await db.run(
        'UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?',
        [status, Date.now(), taskId]
      );
      
      // Invia aggiornamento all'UI
      this.sendTaskUpdate(taskId, status);
    } catch (error) {
      logger.error(`Errore durante l'aggiornamento dello stato dell'attività: ${taskId}`, error);
    }
  }
  
  /**
   * Gestisce il completamento di un'attività
   * @param taskId ID dell'attività
   * @param result Risultato dell'attività
   */
  private async handleTaskComplete(taskId: string, result: any) {
    try {
      logger.info(`Attività completata: ${taskId}`, { result });
      
      // Salva il risultato nel database
      const db = getDatabase();
      
      // Aggiorna lo stato dell'attività
      await db.run(
        'UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?',
        ['success', Date.now(), taskId]
      );
      
      // Inserisci il risultato nella tabella task_results
      await db.run(
        `INSERT INTO task_results 
        (id, task_id, status, checkout_time, price, order_number, created_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          result.id,
          taskId,
          'success',
          result.checkoutTime || Date.now(),
          result.price || null,
          result.orderNumber || null,
          Date.now()
        ]
      );
      
      // Rimuovi l'attività dalle attività in esecuzione
      this.runningTasks.delete(taskId);
      
      // Invia aggiornamento all'UI
      this.sendTaskUpdate(taskId, 'success', result);
    } catch (error) {
      logger.error(`Errore durante la gestione del completamento dell'attività: ${taskId}`, error);
      this.handleTaskError(taskId, error);
    }
  }
  
  /**
   * Gestisce un errore durante l'esecuzione di un'attività
   * @param taskId ID dell'attività
   * @param error Errore occorso
   */
  private async handleTaskError(taskId: string, error: any) {
    try {
      logger.error(`Errore nell'attività: ${taskId}`, error);
      
      // Aggiorna lo stato nel database
      const db = getDatabase();
      
      // Aggiorna lo stato dell'attività
      await db.run(
        'UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?',
        ['failed', Date.now(), taskId]
      );
      
      // Inserisci l'errore nella tabella task_results
      await db.run(
        `INSERT INTO task_results 
        (id, task_id, status, error_message, created_at) 
        VALUES (?, ?, ?, ?, ?)`,
        [
          `err_${Date.now()}`,
          taskId,
          'failed',
          error.message || 'Errore sconosciuto',
          Date.now()
        ]
      );
      
      // Rimuovi l'attività dalle attività in esecuzione
      this.runningTasks.delete(taskId);
      
      // Invia errore all'UI
      this.sendTaskError(taskId, error);
    } catch (dbError) {
      logger.error(`Errore durante la gestione dell'errore dell'attività: ${taskId}`, dbError);
    }
  }
  
  /**
   * Invia un aggiornamento di stato all'UI
   * @param taskId ID dell'attività
   * @param status Nuovo stato
   * @param data Dati aggiuntivi
   */
  private sendTaskUpdate(taskId: string, status: string, data: any = {}) {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      return;
    }
    
    this.mainWindow.webContents.send('task:update', {
      id: taskId,
      status,
      ...data,
      timestamp: Date.now()
    });
  }
  
  /**
   * Invia un errore all'UI
   * @param taskId ID dell'attività
   * @param error Errore da inviare
   */
  private sendTaskError(taskId: string, error: any) {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      return;
    }
    
    this.mainWindow.webContents.send('task:error', {
      id: taskId,
      error: error.message || 'Errore sconosciuto',
      timestamp: Date.now()
    });
  }
}