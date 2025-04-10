import { configureStore } from '@reduxjs/toolkit';
import tasksReducer from './slices/tasksSlice';
import proxiesReducer from './slices/proxiesSlice';
import profilesReducer from './slices/profilesSlice';
import uiReducer from './slices/uiSlice';
import analyticsReducer from './slices/analyticsSlice';

// Configurazione dello store Redux
export const store = configureStore({
  reducer: {
    tasks: tasksReducer,
    proxies: proxiesReducer,
    profiles: profilesReducer,
    ui: uiReducer,
    analytics: analyticsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignora le azioni non serializzabili (ad esempio Date o funzioni)
        ignoredActions: ['tasks/updateTask'],
      },
    }),
});

// Tipi di inferenza per useSelector e useDispatch
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;