import { ipcMain } from 'electron';
import { getLogger } from '../utils/logger';
import { ProxyManager } from '../services/proxyManager';
import fs from 'fs';
import { promisify } from 'util';
import path from 'path';

// Logger
const logger = getLogger();

// ProxyManager
const proxyManager = new ProxyManager();

// Promisify fs functions
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

/**
 * Registra gli handler IPC per la gestione dei proxy
 */
export function registerProxyHandlers() {
  // Aggiungi un nuovo proxy
  ipcMain.handle('proxy:add', async (_, proxyData) => {
    try {
      logger.info('Aggiunta nuovo proxy', { address: proxyData.address, port: proxyData.port });
      
      // Validazione input
      if (!proxyData.address || !proxyData.port || !proxyData.type) {
        throw new Error('Dati proxy incompleti');
      }
      
      const proxy = await proxyManager.addProxy(proxyData);
      
      logger.info('Proxy aggiunto con successo', { id: proxy.id });
      return proxy;
    } catch (error) {
      logger.error('Errore durante l\'aggiunta del proxy', error);
      throw error;
    }
  });
  
  // Ottieni tutti i proxy
  ipcMain.handle('proxy:getAll', async () => {
    try {
      logger.info('Recupero di tutti i proxy');
      
      const proxies = await proxyManager.getAllProxies();
      
      logger.info(`Recuperati ${proxies.length} proxy`);
      return proxies;
    } catch (error) {
      logger.error('Errore durante il recupero dei proxy', error);
      throw error;
    }
  });
  
  // Testa un proxy
  ipcMain.handle('proxy:test', async (_, id, testUrl) => {
    try {
      logger.info(`Test del proxy: ${id}`);
      
      const result = await proxyManager.testProxy(id, testUrl);
      
      logger.info(`Test proxy completato: ${id}`, result);
      return result;
    } catch (error) {
      logger.error(`Errore durante il test del proxy: ${id}`, error);
      throw error;
    }
  });
  
  // Elimina un proxy
  ipcMain.handle('proxy:delete', async (_, id) => {
    try {
      logger.info(`Eliminazione proxy: ${id}`);
      
      const success = await proxyManager.deleteProxy(id);
      
      logger.info(`Proxy eliminato: ${success ? 'successo' : 'fallito'}`);
      return success;
    } catch (error) {
      logger.error(`Errore durante l'eliminazione del proxy: ${id}`, error);
      throw error;
    }
  });
  
  // Importa proxy da un file
  ipcMain.handle('proxy:import', async (_, filePath) => {
    try {
      logger.info(`Importazione proxy da file: ${filePath}`);
      
      // Leggi il file
      const content = await readFile(filePath, 'utf8');
      const lines = content.split('\n').filter(line => line.trim() !== '');
      
      const results = {
        total: lines.length,
        imported: 0,
        failed: 0,
        errors: [] as string[]
      };
      
      // Elabora ogni linea
      for (const line of lines) {
        try {
          // Formato atteso: address:port:username:password o address:port
          const parts = line.trim().split(':');
          
          if (parts.length < 2) {
            throw new Error(`Formato non valido: ${line}`);
          }
          
          const proxyData = {
            address: parts[0],
            port: parseInt(parts[1], 10),
            type: 'http' as 'http' | 'https' | 'socks4' | 'socks5'
          };
          
          // Aggiungi username e password se disponibili
          if (parts.length >= 4) {
            Object.assign(proxyData, {
              username: parts[2],
              password: parts[3]
            });
          }
          
          // Aggiungi il proxy
          await proxyManager.addProxy(proxyData);
          results.imported++;
        } catch (error) {
          results.failed++;
          results.errors.push(`${line}: ${error.message}`);
        }
      }
      
      logger.info('Importazione proxy completata', results);
      return results;
    } catch (error) {
      logger.error(`Errore durante l'importazione dei proxy: ${filePath}`, error);
      throw error;
    }
  });
  
  // Esporta proxy in un file
  ipcMain.handle('proxy:export', async (_, filePath) => {
    try {
      logger.info(`Esportazione proxy in file: ${filePath}`);
      
      // Ottieni tutti i proxy
      const proxies = await proxyManager.getAllProxies();
      
      // Formatta i proxy in un formato leggibile
      const content = proxies.map(proxy => {
        let line = `${proxy.address}:${proxy.port}`;
        if (proxy.username && proxy.password) {
          line += `:${proxy.username}:${proxy.password}`;
        }
        return line;
      }).join('\n');
      
      // Assicurati che la directory esista
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Scrivi nel file
      await writeFile(filePath, content, 'utf8');
      
      logger.info(`Esportazione proxy completata: ${proxies.length} proxy esportati`);
      return { success: true, count: proxies.length };
    } catch (error) {
      logger.error(`Errore durante l'esportazione dei proxy: ${filePath}`, error);
      throw error;
    }
  });
}