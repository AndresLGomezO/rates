import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../components/PublicLayout.css';

export default function Login() {
  const { isAuthenticated, redirectToAuth } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      void navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="login-page">
      <h1>Welcome to Rates</h1>
      <p>Please sign in to continue</p>
      <div className="login-actions">
        <button
          className="btn-primary"
          onClick={() => void redirectToAuth('login')}
        >
          Sign In
        </button>
        <button
          className="btn-secondary"
          onClick={() => void redirectToAuth('signup')}
        >
          Create Account
        </button>
      </div>
    </div>
  );
}
