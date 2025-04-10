import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import TasksView from './components/TasksView';
import ProxiesView from './components/ProxiesView';
import ProfilesView from './components/ProfilesView';
import SettingsView from './components/SettingsView';
import TitleBar from './components/TitleBar';
import { fetchTasks } from './store/slices/tasksSlice';
import { fetchProxies } from './store/slices/proxiesSlice';
import { fetchProfiles } from './store/slices/profilesSlice';
import './styles/app.scss';

// Tipi di visualizzazione possibili nell'app
type ViewType = 'dashboard' | 'tasks' | 'proxies' | 'profiles' | 'settings';

const App: React.FC = () => {
  // Stato per la visualizzazione attuale
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  
  // Stato per il sidebar collapse
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Hook Redux dispatcher
  const dispatch = useDispatch();
  
  // Carica i dati iniziali dell'applicazione
  useEffect(() => {
    // Carica le attività dal database
    dispatch(fetchTasks());
    
    // Carica i proxy dal database
    dispatch(fetchProxies());
    
    // Carica i profili utente dal database
    dispatch(fetchProfiles());
  }, [dispatch]);
  
  // Renderizza la vista attuale in base alla selezione
  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'tasks':
        return <TasksView />;
      case 'proxies':
        return <ProxiesView />;
      case 'profiles':
        return <ProfilesView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <Dashboard />;
    }
  };
  
  // Gestisce il cambio di vista dalla sidebar
  const handleViewChange = (view: ViewType) => {
    setCurrentView(view);
  };
  
  // Gestisce il toggle del collasso della sidebar
  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };
  
  return (
    <div className="app">
      <TitleBar 
        toggleSidebar={toggleSidebar} 
        sidebarCollapsed={sidebarCollapsed} 
      />
      
      <div className="app-container">
        <Sidebar 
          currentView={currentView} 
          onViewChange={handleViewChange} 
          collapsed={sidebarCollapsed} 
        />
        
        <main className="content">
          {renderView()}
        </main>
      </div>
    </div>
  );
};

export default App;