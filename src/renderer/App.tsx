import { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import Dashboard from './components/Dashboard';

type AuthView = 'login' | 'register';

function App() {
  const { isAuthenticated, isLoading, user, isPremium, logout, refreshUser } = useAuth();
  const [authView, setAuthView] = useState<AuthView>('login');
  const [systemReady, setSystemReady] = useState(false);

  // Check if yt-dlp and ffmpeg are available
  useEffect(() => {
    const checkSystem = async () => {
      try {
        const [ytdlpAvailable, ffmpegAvailable] = await Promise.all([
          window.electron.ytdlp.checkAvailable(),
          window.electron.ffmpeg.checkAvailable(),
        ]);

        if (!ytdlpAvailable) {
          console.warn('yt-dlp not found. Some features may not work.');
        }
        if (!ffmpegAvailable) {
          console.warn('FFmpeg not found. Some features may not work.');
        }

        setSystemReady(true);
      } catch (error) {
        console.error('System check failed:', error);
        setSystemReady(true); // Continue anyway
      }
    };

    checkSystem();
  }, []);

  // Show loading screen
  if (isLoading || !systemReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="spinner w-8 h-8 border-2 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  // Show auth screens if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        {authView === 'login' ? (
          <LoginForm onSwitchToRegister={() => setAuthView('register')} />
        ) : (
          <RegisterForm onSwitchToLogin={() => setAuthView('login')} />
        )}
      </div>
    );
  }

  // Show main dashboard
  return (
    <Dashboard
      user={user!}
      isPremium={isPremium}
      onLogout={logout}
      onRefreshUser={refreshUser}
    />
  );
}

export default App;
