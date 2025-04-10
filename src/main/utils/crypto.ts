import crypto from 'crypto';
import { getLogger } from './logger';

const logger = getLogger();

// Dimensione della chiave (32 byte = 256 bit)
const KEY_SIZE = 32;

// Byte per l'Initialization Vector (16 byte = 128 bit)
const IV_LENGTH = 16;

// Algoritmo di crittografia
const ALGORITHM = 'aes-256-cbc';

// Chiave di crittografia di default per lo sviluppo (NON USARE IN PRODUZIONE)
// In produzione, questa dovrebbe essere caricata in modo sicuro (es. variabili d'ambiente)
const DEFAULT_KEY = Buffer.from('0123456789abcdef0123456789abcdef', 'utf8');

/**
 * Chiave utilizzata per la crittografia e la decrittografia
 */
let encryptionKey: Buffer = DEFAULT_KEY;

/**
 * Inizializza la chiave di crittografia dall'ambiente o utilizza quella di default
 */
export function initializeEncryptionKey(): void {
  // In produzione, carica la chiave da variabili d'ambiente
  const envKey = process.env.ENCRYPTION_KEY;
  
  if (envKey) {
    // Se la chiave è disponibile nell'ambiente, usala
    encryptionKey = Buffer.from(envKey, 'hex');
    logger.info('Chiave di crittografia caricata dalle variabili d\'ambiente');
  } else {
    // Altrimenti usa la chiave di default (solo in sviluppo)
    if (process.env.NODE_ENV === 'production') {
      logger.warn('ATTENZIONE: Utilizzo della chiave di crittografia di default in produzione!');
    } else {
      logger.info('Utilizzo della chiave di crittografia di default per lo sviluppo');
    }
    encryptionKey = DEFAULT_KEY;
  }
}

/**
 * Cripta una stringa
 * @param text Testo da criptare
 * @returns Stringa criptata in formato esadecimale
 */
export function encrypt(text: string): string {
  try {
    if (!text) {
      return '';
    }

    // Genera un IV casuale
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Crea il cipher con la chiave e l'IV
    const cipher = crypto.createCipheriv(ALGORITHM, encryptionKey, iv);
    
    // Cripta il testo
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Prepend l'IV all'output (IV + testo criptato)
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    logger.error('Errore durante la crittografia:', error);
    throw new Error('Errore durante la crittografia dei dati');
  }
}

/**
 * Decripta una stringa
 * @param text Testo criptato in formato esadecimale (IV:testo)
 * @returns Testo decriptato
 */
export function decrypt(text: string): string {
  try {
    if (!text) {
      return '';
    }

    // Separa l'IV dal testo criptato
    const parts = text.split(':');
    if (parts.length !== 2) {
      throw new Error('Formato dati criptati non valido');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    
    // Crea il decipher con la chiave e l'IV
    const decipher = crypto.createDecipheriv(ALGORITHM, encryptionKey, iv);
    
    // Decripta il testo
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    logger.error('Errore durante la decrittografia:', error);
    throw new Error('Errore durante la decrittografia dei dati');
  }
}

/**
 * Genera un hash SHA-256 di una stringa
 * @param text Testo da hashare
 * @returns Hash in formato esadecimale
 */
export function hash(text: string): string {
  try {
    if (!text) {
      return '';
    }
    
    return crypto.createHash('sha256').update(text).digest('hex');
  } catch (error) {
    logger.error('Errore durante la generazione dell\'hash:', error);
    throw new Error('Errore durante la generazione dell\'hash');
  }
}

// Inizializza la chiave all'avvio
initializeEncryptionKey();