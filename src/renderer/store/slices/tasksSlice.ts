import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';

// Tipo per lo stato delle attività
export type TaskStatus = 'idle' | 'monitoring' | 'carting' | 'checkout' | 'success' | 'failed';

// Interfaccia per un'attività
export interface Task {
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
  status: TaskStatus;
  monitorDelay: number;
  retryDelay: number;
  createdAt: number;
  updatedAt: number;
}

// Interfaccia per lo stato delle attività nel Redux store
interface TasksState {
  items: Task[];
  loading: boolean;
  error: string | null;
}

// Stato iniziale
const initialState: TasksState = {
  items: [],
  loading: false,
  error: null,
};

// Thunk per caricare tutte le attività
export const fetchTasks = createAsyncThunk('tasks/fetchTasks', async () => {
  try {
    const tasks = await window.electron.tasks.getAll();
    return tasks;
  } catch (error) {
    throw new Error('Errore nel caricamento delle attività');
  }
});

// Thunk per creare una nuova attività
export const createTask = createAsyncThunk(
  'tasks/createTask',
  async (taskData: Omit<Task, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newTask = {
        ...taskData,
        id: uuidv4(),
        status: 'idle' as TaskStatus,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await window.electron.tasks.create(newTask);
      return newTask;
    } catch (error) {
      throw new Error('Errore nella creazione dell\'attività');
    }
  }
);

// Thunk per aggiornare un'attività
export const updateTask = createAsyncThunk(
  'tasks/updateTask',
  async ({ id, taskData }: { id: string; taskData: Partial<Task> }) => {
    try {
      const updatedTask = {
        ...taskData,
        updatedAt: Date.now(),
      };
      await window.electron.tasks.update(id, updatedTask);
      return { id, updates: updatedTask };
    } catch (error) {
      throw new Error('Errore nell\'aggiornamento dell\'attività');
    }
  }
);

// Thunk per eliminare un'attività
export const deleteTask = createAsyncThunk('tasks/deleteTask', async (id: string) => {
  try {
    await window.electron.tasks.delete(id);
    return id;
  } catch (error) {
    throw new Error('Errore nell\'eliminazione dell\'attività');
  }
});

// Thunk per avviare un'attività
export const startTask = createAsyncThunk('tasks/startTask', async (id: string) => {
  try {
    await window.electron.tasks.start(id);
    return { id, status: 'monitoring' as TaskStatus };
  } catch (error) {
    throw new Error('Errore nell\'avvio dell\'attività');
  }
});

// Thunk per fermare un'attività
export const stopTask = createAsyncThunk('tasks/stopTask', async (id: string) => {
  try {
    await window.electron.tasks.stop(id);
    return { id, status: 'idle' as TaskStatus };
  } catch (error) {
    throw new Error('Errore nell\'arresto dell\'attività');
  }
});

// Slice per le attività
const tasksSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    updateTaskStatus(
      state,
      action: PayloadAction<{ id: string; status: TaskStatus }>
    ) {
      const { id, status } = action.payload;
      const task = state.items.find((t) => t.id === id);
      if (task) {
        task.status = status;
        task.updatedAt = Date.now();
      }
    },
  },
  extraReducers: (builder) => {
    // fetchTasks
    builder.addCase(fetchTasks.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchTasks.fulfilled, (state, action) => {
      state.loading = false;
      state.items = action.payload;
    });
    builder.addCase(fetchTasks.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Errore sconosciuto';
    });

    // createTask
    builder.addCase(createTask.fulfilled, (state, action) => {
      state.items.push(action.payload);
    });

    // updateTask
    builder.addCase(updateTask.fulfilled, (state, action) => {
      const { id, updates } = action.payload;
      const task = state.items.find((t) => t.id === id);
      if (task) {
        Object.assign(task, updates);
      }
    });

    // deleteTask
    builder.addCase(deleteTask.fulfilled, (state, action) => {
      state.items = state.items.filter((task) => task.id !== action.payload);
    });

    // startTask
    builder.addCase(startTask.fulfilled, (state, action) => {
      const { id, status } = action.payload;
      const task = state.items.find((t) => t.id === id);
      if (task) {
        task.status = status;
        task.updatedAt = Date.now();
      }
    });

    // stopTask
    builder.addCase(stopTask.fulfilled, (state, action) => {
      const { id, status } = action.payload;
      const task = state.items.find((t) => t.id === id);
      if (task) {
        task.status = status;
        task.updatedAt = Date.now();
      }
    });
  },
});

export const { updateTaskStatus } = tasksSlice.actions;
export default tasksSlice.reducer;