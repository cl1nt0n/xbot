import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import './sidebar.scss';

// Icone per la sidebar
import { ReactComponent as DashboardIcon } from '../../assets/icons/dashboard.svg';
import { ReactComponent as TasksIcon } from '../../assets/icons/tasks.svg';
import { ReactComponent as ProxiesIcon } from '../../assets/icons/proxies.svg';
import { ReactComponent as ProfilesIcon } from '../../assets/icons/profiles.svg';
import { ReactComponent as SettingsIcon } from '../../assets/icons/settings.svg';
import { ReactComponent as LogoIcon } from '../../assets/icons/logo.svg';

// Tipi di visualizzazione supportati
type ViewType = 'dashboard' | 'tasks' | 'proxies' | 'profiles' | 'settings';

// Props del componente
interface SidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  collapsed: boolean;
}

/**
 * Componente Sidebar che fornisce la navigazione principale
 */
const Sidebar: React.FC<SidebarProps> = ({ 
  currentView, 
  onViewChange, 
  collapsed 
}) => {
  // Ottieni le statistiche per mostrare badge o notifiche
  const activeTasksCount = useSelector((state: RootState) => 
    state.tasks.items.filter(task => 
      task.status === 'monitoring' || 
      task.status === 'carting' || 
      task.status === 'checkout'
    ).length
  );
  
  // Gestisce il click su un'opzione del menu
  const handleMenuClick = (view: ViewType) => {
    onViewChange(view);
  };
  
  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <LogoIcon className="logo" />
        {!collapsed && <h1 className="app-name">X.bot</h1>}
      </div>
      
      <nav className="sidebar-nav">
        <ul className="nav-items">
          <li 
            className={`nav-item ${currentView === 'dashboard' ? 'active' : ''}`}
            onClick={() => handleMenuClick('dashboard')}
          >
            <DashboardIcon className="nav-icon" />
            {!collapsed && <span className="nav-label">Dashboard</span>}
          </li>
          
          <li 
            className={`nav-item ${currentView === 'tasks' ? 'active' : ''}`}
            onClick={() => handleMenuClick('tasks')}
          >
            <TasksIcon className="nav-icon" />
            {!collapsed && <span className="nav-label">Tasks</span>}
            {activeTasksCount > 0 && (
              <span className="nav-badge">{activeTasksCount}</span>
            )}
          </li>
          
          <li 
            className={`nav-item ${currentView === 'proxies' ? 'active' : ''}`}
            onClick={() => handleMenuClick('proxies')}
          >
            <ProxiesIcon className="nav-icon" />
            {!collapsed && <span className="nav-label">Proxies</span>}
          </li>
          
          <li 
            className={`nav-item ${currentView === 'profiles' ? 'active' : ''}`}
            onClick={() => handleMenuClick('profiles')}
          >
            <ProfilesIcon className="nav-icon" />
            {!collapsed && <span className="nav-label">Profiles</span>}
          </li>
          
          <li 
            className={`nav-item ${currentView === 'settings' ? 'active' : ''}`}
            onClick={() => handleMenuClick('settings')}
          >
            <SettingsIcon className="nav-icon" />
            {!collapsed && <span className="nav-label">Settings</span>}
          </li>
        </ul>
      </nav>
      
      <div className="sidebar-footer">
        {!collapsed && (
          <div className="user-info">
            <span className="version">v1.0.0</span>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;