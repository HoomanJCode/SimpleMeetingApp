import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { Layout } from './components/layout/Layout';
import { Spinner } from './components/ui/Spinner';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { HomePage } from './pages/HomePage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { ProtectedRoute } from './auth/ProtectedRoute';

// Lazy-loaded pages
import { lazy, Suspense } from 'react';
const CreateMeetingPage = lazy(() => import('./pages/CreateMeetingPage'));
const EditMeetingPage = lazy(() => import('./pages/EditMeetingPage'));
const MeetingDetailPage = lazy(() => import('./pages/MeetingDetailPage'));
const MyMeetingsPage = lazy(() => import('./pages/MyMeetingsPage'));
const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const TimelinePage = lazy(() => import('./pages/TimelinePage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

const router = createBrowserRouter(
  [
    {
      element: (
        <AuthProvider>
          <ErrorBoundary>
            <Layout>
              <Suspense fallback={<div className="flex justify-center py-20"><Spinner size="lg" /></div>}>
                <Outlet />
              </Suspense>
            </Layout>
          </ErrorBoundary>
        </AuthProvider>
      ),
      children: [
        { path: '/', element: <HomePage /> },
        { path: '/auth/callback', element: <AuthCallbackPage /> },
        { path: '/meetings/new', element: <ProtectedRoute><CreateMeetingPage /></ProtectedRoute> },
        { path: '/meetings/:id', element: <MeetingDetailPage /> },
        { path: '/meetings/:id/edit', element: <ProtectedRoute><EditMeetingPage /></ProtectedRoute> },
        { path: '/my-meetings', element: <ProtectedRoute><MyMeetingsPage /></ProtectedRoute> },
        { path: '/calendar', element: <CalendarPage /> },
        { path: '/timeline', element: <TimelinePage /> },
        { path: '*', element: <NotFoundPage /> },
      ],
    },
  ],
  {
    future: {
      v7_relativeSplatPath: true,
    },
  },
);

function App() {
  return <RouterProvider router={router} future={{ v7_startTransition: true }} />;
}

export default App;
