import { getDatabase } from '../database';
import { getLogger } from '../utils/logger';
import { decrypt, encrypt } from '../utils/crypto';
import { v4 as uuidv4 } from 'uuid';
import http from 'http';
import https from 'https';
import { URL } from 'url';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';

// Logger
const logger = getLogger();

// Struttura dati per un proxy
export interface Proxy {
  id: string;
  address: string;
  port: number;
  username?: string;
  password?: string;
  type: 'http' | 'https' | 'socks4' | 'socks5';
  location?: string;
  lastTested?: number;
  status?: 'active' | 'inactive' | 'banned';
  responseTime?: number;
  createdAt: number;
}

/**
 * Classe per la gestione dei proxy
 */
export class ProxyManager {
  /**
   * Ottiene un proxy specifico per ID
   * @param proxyId ID del proxy da recuperare
   * @returns Il proxy richiesto o null se non trovato
   */
  async getProxy(proxyId: string): Promise<Proxy | null> {
    try {
      logger.info(`Recupero proxy con ID: ${proxyId}`);
      
      const db = getDatabase();
      const proxy = await db.get('SELECT * FROM proxies WHERE id = ?', [proxyId]);
      
      if (!proxy) {
        logger.warn(`Proxy non trovato: ${proxyId}`);
        return null;
      }
      
      // Decrittografa la password se presente
      if (proxy.password) {
        proxy.password = decrypt(proxy.password);
      }
      
      logger.info(`Proxy recuperato con successo: ${proxyId}`);
      return proxy;
    } catch (error) {
      logger.error(`Errore durante il recupero del proxy: ${proxyId}`, error);
      throw error;
    }
  }
  
  /**
   * Ottiene tutti i proxy dal database
   * @returns Array di tutti i proxy
   */
  async getAllProxies(): Promise<Proxy[]> {
    try {
      logger.info('Recupero di tutti i proxy');
      
      const db = getDatabase();
      const proxies = await db.all('SELECT * FROM proxies ORDER BY created_at DESC');
      
      // Decrittografa le password
      proxies.forEach(proxy => {
        if (proxy.password) {
          proxy.password = decrypt(proxy.password);
        }
      });
      
      logger.info(`Recuperati ${proxies.length} proxy`);
      return proxies;
    } catch (error) {
      logger.error('Errore durante il recupero dei proxy', error);
      throw error;
    }
  }
  
  /**
   * Aggiunge un nuovo proxy al database
   * @param proxyData Dati del proxy da aggiungere
   * @returns Il proxy aggiunto con ID generato
   */
  async addProxy(proxyData: Omit<Proxy, 'id' | 'createdAt'>): Promise<Proxy> {
    try {
      logger.info(`Aggiunta nuovo proxy: ${proxyData.address}:${proxyData.port}`);
      
      const db = getDatabase();
      
      // Genera ID e timestamp
      const id = uuidv4();
      const createdAt = Date.now();
      
      // Crittografa la password se presente
      let password = proxyData.password;
      if (password) {
        password = encrypt(password);
      }
      
      // Inserisci nel database
      await db.run(
        `INSERT INTO proxies (
          id, address, port, username, password, type, location, 
          last_tested, status, response_time, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          proxyData.address,
          proxyData.port,
          proxyData.username || null,
          password || null,
          proxyData.type,
          proxyData.location || null,
          proxyData.lastTested || null,
          proxyData.status || 'active',
          proxyData.responseTime || null,
          createdAt
        ]
      );
      
      // Restituisci il proxy completo
      const proxy: Proxy = {
        id,
        ...proxyData,
        createdAt
      };
      
      logger.info(`Proxy aggiunto con successo: ${id}`);
      return proxy;
    } catch (error) {
      logger.error('Errore durante l\'aggiunta del proxy', error);
      throw error;
    }
  }
  
  /**
   * Aggiorna un proxy esistente
   * @param id ID del proxy da aggiornare
   * @param proxyData Dati aggiornati del proxy
   * @returns true se l'aggiornamento è riuscito, false altrimenti
   */
  async updateProxy(id: string, proxyData: Partial<Proxy>): Promise<boolean> {
    try {
      logger.info(`Aggiornamento proxy: ${id}`);
      
      const db = getDatabase();
      
      // Crittografa la password se presente e modificata
      if (proxyData.password !== undefined) {
        proxyData.password = encrypt(proxyData.password);
      }
      
      // Costruisci la query di aggiornamento dinamicamente
      const updateFields = [];
      const updateValues = [];
      
      for (const [key, value] of Object.entries(proxyData)) {
        if (key !== 'id' && key !== 'createdAt') { // Non aggiornare ID e createdAt
          updateFields.push(`${key} = ?`);
          updateValues.push(value);
        }
      }
      
      // Aggiungi l'ID per la clausola WHERE
      updateValues.push(id);
      
      const query = `UPDATE proxies SET ${updateFields.join(', ')} WHERE id = ?`;
      const result = await db.run(query, updateValues);
      
      logger.info(`Proxy aggiornato con successo: ${id}`);
      return result.changes > 0;
    } catch (error) {
      logger.error(`Errore durante l'aggiornamento del proxy: ${id}`, error);
      throw error;
    }
  }
  
  /**
   * Elimina un proxy dal database
   * @param id ID del proxy da eliminare
   * @returns true se l'eliminazione è riuscita, false altrimenti
   */
  async deleteProxy(id: string): Promise<boolean> {
    try {
      logger.info(`Eliminazione proxy: ${id}`);
      
      const db = getDatabase();
      const result = await db.run('DELETE FROM proxies WHERE id = ?', [id]);
      
      logger.info(`Proxy eliminato con successo: ${id}`);
      return result.changes > 0;
    } catch (error) {
      logger.error(`Errore durante l'eliminazione del proxy: ${id}`, error);
      throw error;
    }
  }
  
  /**
   * Testa la connessione di un proxy
   * @param proxyId ID del proxy da testare
   * @param testUrl URL da utilizzare per il test
   * @returns Risultato del test con tempo di risposta
   */
  async testProxy(proxyId: string, testUrl: string = 'https://www.google.com'): Promise<{ success: boolean; responseTime: number; }> {
    try {
      logger.info(`Test del proxy: ${proxyId}`);
      
      // Recupera il proxy dal database
      const proxy = await this.getProxy(proxyId);
      
      if (!proxy) {
        throw new Error(`Proxy non trovato: ${proxyId}`);
      }
      
      // Esegui il test
      const result = await this.testProxyConnection(proxy, testUrl);
      
      // Aggiorna i dati nel database
      await this.updateProxy(proxyId, {
        lastTested: Date.now(),
        status: result.success ? 'active' : 'inactive',
        responseTime: result.responseTime
      });
      
      logger.info(`Test proxy completato: ${proxyId}`, result);
      return result;
    } catch (error) {
      logger.error(`Errore durante il test del proxy: ${proxyId}`, error);
      
      // Aggiorna lo stato a 'inactive' in caso di errore
      await this.updateProxy(proxyId, {
        lastTested: Date.now(),
        status: 'inactive',
        responseTime: null
      }).catch(updateError => {
        logger.error(`Errore durante l'aggiornamento dello stato del proxy: ${proxyId}`, updateError);
      });
      
      return { success: false, responseTime: 0 };
    }
  }
  
  /**
   * Testa la connessione di un proxy specifico
   * @param proxy Dati del proxy da testare
   * @param testUrl URL da utilizzare per il test
   * @returns Risultato del test con tempo di risposta
   */
  private testProxyConnection(
    proxy: Proxy, 
    testUrl: string
  ): Promise<{ success: boolean; responseTime: number; }> {
    return new Promise((resolve) => {
      try {
        const startTime = Date.now();
        const url = new URL(testUrl);
        const isHttps = url.protocol === 'https:';
        
        // Configura l'agent proxy appropriato
        let agent;
        if (proxy.type === 'socks4' || proxy.type === 'socks5') {
          const socksVersion = proxy.type === 'socks5' ? 5 : 4;
          const auth = proxy.username && proxy.password 
            ? `${proxy.username}:${proxy.password}@` 
            : '';
          const socksUrl = `socks${socksVersion}://${auth}${proxy.address}:${proxy.port}`;
          agent = new SocksProxyAgent(socksUrl);
        } else {
          const auth = proxy.username && proxy.password 
            ? `${proxy.username}:${proxy.password}@` 
            : '';
          const proxyUrl = `${proxy.type}://${auth}${proxy.address}:${proxy.port}`;
          agent = new HttpsProxyAgent(proxyUrl);
        }
        
        // Configura la richiesta
        const options = {
          hostname: url.hostname,
          port: url.port || (isHttps ? 443 : 80),
          path: url.pathname + url.search,
          method: 'GET',
          agent,
          timeout: 10000, // 10 secondi di timeout
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        };
        
        // Esegui la richiesta
        const req = (isHttps ? https : http).request(options, (res) => {
          const endTime = Date.now();
          const responseTime = endTime - startTime;
          
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            // Successo
            resolve({ success: true, responseTime });
          } else {
            // Errore
            resolve({ success: false, responseTime });
          }
          
          // Consuma il corpo della risposta
          res.resume();
        });
        
        // Gestisci errori
        req.on('error', (error) => {
          logger.error(`Errore durante il test del proxy: ${proxy.id}`, error);
          resolve({ success: false, responseTime: 0 });
        });
        
        // Gestisci timeout
        req.on('timeout', () => {
          req.destroy();
          logger.warn(`Timeout durante il test del proxy: ${proxy.id}`);
          resolve({ success: false, responseTime: 0 });
        });
        
        // Termina la richiesta
        req.end();
      } catch (error) {
        logger.error(`Errore durante la configurazione del test proxy: ${proxy.id}`, error);
        resolve({ success: false, responseTime: 0 });
      }
    });
  }
  
  /**
   * Seleziona il miglior proxy disponibile per un task
   * @param retailer Retailer per cui selezionare il proxy
   * @param location Posizione geografica preferita
   * @returns ID del proxy selezionato o null se nessun proxy è disponibile
   */
  async selectBestProxy(retailer: string, location?: string): Promise<string | null> {
    try {
      logger.info(`Selezione del miglior proxy per ${retailer}${location ? ` in ${location}` : ''}`);
      
      const db = getDatabase();
      
      // Costruisci la query di base
      let query = `
        SELECT id, response_time
        FROM proxies
        WHERE status = 'active'
      `;
      
      const params = [];
      
      // Filtra per posizione se specificata
      if (location) {
        query += ' AND location = ?';
        params.push(location);
      }
      
      // Ordina per tempo di risposta (i più veloci prima)
      query += ' ORDER BY response_time ASC NULLS LAST LIMIT 1';
      
      // Esegui la query
      const proxy = await db.get(query, params);
      
      if (!proxy) {
        logger.warn(`Nessun proxy disponibile per ${retailer}${location ? ` in ${location}` : ''}`);
        return null;
      }
      
      logger.info(`Proxy selezionato: ${proxy.id} per ${retailer}`);
      return proxy.id;
    } catch (error) {
      logger.error(`Errore durante la selezione del proxy per ${retailer}`, error);
      return null;
    }
  }
}