import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export function AuthCallbackPage() {
  useDocumentTitle('Signing In...');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setTokens, refreshUser } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');
    const refreshToken = searchParams.get('refreshToken');

    const finish = async () => {
      if (token && refreshToken) {
        setTokens({ accessToken: token, refreshToken });
        // setTokens is sync; refreshUser explicitly resyncs `user` state so
        // the header/CTA reflect signed-in immediately (restoreSession only
        // ran once at AuthProvider mount, before tokens arrived).
        await refreshUser();
      }
      navigate('/', { replace: true });
    };

    finish();
  }, [searchParams, navigate, setTokens, refreshUser]);

  return (
    <div className="flex justify-center items-center py-20">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-200 dark:border-gray-700 border-t-primary-600" />
    </div>
  );
}
