import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { DashboardScreen } from '../features/dashboard/DashboardScreen';
import { EditorScreen } from '../features/editor/EditorScreen';
import { ExportScreen } from '../features/export/ExportScreen';

// Auth is intentionally NOT wired during the front-end design phase.
// The app runs entirely on the in-memory mock data layer (see src/services).
// Supabase migrations + services stay in the repo for the later auth phase.
export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardScreen /> },
      { path: 'doc/:id', element: <EditorScreen /> },
      { path: 'doc/:id/export', element: <ExportScreen /> },
    ],
  },
]);
