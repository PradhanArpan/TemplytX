import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { DashboardScreen } from '../features/dashboard/DashboardScreen';

// Editor (and its heavy KaTeX dependency) and Export load only when opened,
// keeping the initial dashboard bundle light.
const EditorScreen = lazy(() =>
  import('../features/editor/EditorScreen').then((m) => ({ default: m.EditorScreen })));
const ExportScreen = lazy(() =>
  import('../features/export/ExportScreen').then((m) => ({ default: m.ExportScreen })));

const Loading = () => (
  <div style={{ padding: 'var(--space-10)', color: 'var(--color-muted)' }}>Loading…</div>
);

// Auth is intentionally NOT wired during the front-end design phase.
// The app runs entirely on the in-memory mock data layer (see src/services).
export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardScreen /> },
      { path: 'doc/:id', element: <Suspense fallback={<Loading />}><EditorScreen /></Suspense> },
      { path: 'doc/:id/export', element: <Suspense fallback={<Loading />}><ExportScreen /></Suspense> },
    ],
  },
]);
