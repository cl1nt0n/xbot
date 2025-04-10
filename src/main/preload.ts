import { contextBridge, ipcRenderer } from 'electron';

// Espone API sicure al renderer process
contextBridge.exposeInMainWorld('electron', {
  // API per la gestione delle attività
  tasks: {
    // Crea una nuova attività
    create: (taskData: any) => ipcRenderer.invoke('task:create', taskData),
    
    // Ottieni tutte le attività
    getAll: () => ipcRenderer.invoke('task:getAll'),
    
    // Ottieni una singola attività per ID
    getById: (id: string) => ipcRenderer.invoke('task:getById', id),
    
    // Aggiorna un'attività esistente
    update: (id: string, taskData: any) => ipcRenderer.invoke('task:update', id, taskData),
    
    // Elimina un'attività
    delete: (id: string) => ipcRenderer.invoke('task:delete', id),
    
    // Avvia un'attività
    start: (id: string) => ipcRenderer.invoke('task:start', id),
    
    // Ferma un'attività
    stop: (id: string) => ipcRenderer.invoke('task:stop', id),
    
    // Ascolta gli aggiornamenti delle attività
    onUpdate: (callback: (event: any, data: any) => void) => {
      const subscription = (_event: any, data: any) => callback(data);
      ipcRenderer.on('task:update', subscription);
      
      // Restituisce una funzione di pulizia per rimuovere il listener
      return () => {
        ipcRenderer.removeListener('task:update', subscription);
      };
    }
  },
  
  // API per la gestione dei proxy
  proxies: {
    // Aggiungi un nuovo proxy
    add: (proxyData: any) => ipcRenderer.invoke('proxy:add', proxyData),
    
    // Ottieni tutti i proxy
    getAll: () => ipcRenderer.invoke('proxy:getAll'),
    
    // Testa un proxy
    test: (id: string) => ipcRenderer.invoke('proxy:test', id),
    
    // Elimina un proxy
    delete: (id: string) => ipcRenderer.invoke('proxy:delete', id),
    
    // Importa proxy da un file
    import: (filePath: string) => ipcRenderer.invoke('proxy:import', filePath),
    
    // Esporta proxy in un file
    export: (filePath: string) => ipcRenderer.invoke('proxy:export', filePath)
  },
  
  // API per la gestione dei profili
  profiles: {
    // Crea un nuovo profilo
    create: (profileData: any) => ipcRenderer.invoke('profile:create', profileData),
    
    // Ottieni tutti i profili
    getAll: () => ipcRenderer.invoke('profile:getAll'),
    
    // Ottieni un singolo profilo per ID
    getById: (id: string) => ipcRenderer.invoke('profile:getById', id),
    
    // Aggiorna un profilo esistente
    update: (id: string, profileData: any) => ipcRenderer.invoke('profile:update', id, profileData),
    
    // Elimina un profilo
    delete: (id: string) => ipcRenderer.invoke('profile:delete', id)
  },
  
  // API per la gestione dell'app
  app: {
    // Chiudi l'applicazione
    quit: () => ipcRenderer.invoke('app:quit'),
    
    // Minimizza l'applicazione
    minimize: () => ipcRenderer.invoke('app:minimize'),
    
    // Massimizza/ripristina l'applicazione
    maximize: () => ipcRenderer.invoke('app:maximize'),
    
    // Ottieni informazioni sulla versione
    getVersion: () => ipcRenderer.invoke('app:getVersion')
  }
});