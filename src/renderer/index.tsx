import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './store';
import App from './App';
import './styles/global.scss';

// Renderizza l'applicazione React nel div #root
const container = document.getElementById('root');
if (!container) {
  throw new Error('Elemento #root non trovato!');
}

const root = createRoot(container);
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>
);