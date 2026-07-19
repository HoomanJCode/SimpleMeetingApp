import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { Layout } from './components/layout/Layout';
import { HomePage } from './pages/HomePage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { ProtectedRoute } from './auth/ProtectedRoute';

// Lazy-loaded pages
import { lazy, Suspense } from 'react';
const CreateMeetingPage = lazy(() => import('./pages/CreateMeetingPage'));
const EditMeetingPage = lazy(() => import('./pages/EditMeetingPage'));
const MeetingDetailPage = lazy(() => import('./pages/MeetingDetailPage'));
const MyMeetingsPage = lazy(() => import('./pages/MyMeetingsPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

function App() {
  return (
    <AuthProvider>
      <Layout>
        <Suspense fallback={<div className="flex justify-center py-20"><Spinner size="lg" /></div>}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route path="/meetings/new" element={<ProtectedRoute><CreateMeetingPage /></ProtectedRoute>} />
            <Route path="/meetings/:id" element={<MeetingDetailPage />} />
            <Route path="/meetings/:id/edit" element={<ProtectedRoute><EditMeetingPage /></ProtectedRoute>} />
            <Route path="/my-meetings" element={<ProtectedRoute><MyMeetingsPage /></ProtectedRoute>} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </Layout>
    </AuthProvider>
  );
}

// Inline spinner for Suspense fallback
function Spinner({ size }: { size: 'sm' | 'lg' }) {
  return (
    <div className={`animate-spin rounded-full border-4 border-gray-200 border-t-primary-600 ${size === 'lg' ? 'h-12 w-12' : 'h-5 w-5'}`} />
  );
}

export default App;
