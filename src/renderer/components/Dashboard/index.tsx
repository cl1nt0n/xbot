import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import DashboardHeader from './DashboardHeader';
import TasksOverview from './TasksOverview';
import SpendingOverview from './SpendingOverview';
import RecentCheckouts from './RecentCheckouts';
import ProxyHealth from './ProxyHealth';
import FrequentTasks from './FrequentTasks';
import './dashboard.scss';

/**
 * Componente Dashboard principale che visualizza metriche, grafici e panoramiche delle attività
 */
const Dashboard: React.FC = () => {
  // Ottieni i dati dalle metriche di analytics
  const analytics = useSelector((state: RootState) => state.analytics);
  
  // Ottieni tutte le attività per le statistiche
  const tasks = useSelector((state: RootState) => state.tasks.items);
  
  // Calcola alcune statistiche di base
  const activeTasksCount = tasks.filter(task => 
    task.status === 'monitoring' || 
    task.status === 'carting' || 
    task.status === 'checkout'
  ).length;
  
  const successfulTasksCount = tasks.filter(task => task.status === 'success').length;
  const failedTasksCount = tasks.filter(task => task.status === 'failed').length;
  
  return (
    <div className="dashboard">
      <DashboardHeader 
        totalTasks={tasks.length}
        activeTasks={activeTasksCount}
        successfulTasks={successfulTasksCount}
        failedTasks={failedTasksCount}
      />
      
      <div className="dashboard-grid">
        <div className="dashboard-main">
          <TasksOverview tasks={tasks} />
          <SpendingOverview spending={analytics.spending} />
          <RecentCheckouts checkouts={analytics.recentCheckouts} />
        </div>
        
        <div className="dashboard-sidebar">
          <ProxyHealth proxies={analytics.proxyHealth} />
          <FrequentTasks frequentTasks={analytics.frequentTasks} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;