import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const { isAuthenticated, redirectToAuth } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      void navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="text-center">
      <h1 className="m-0 mb-2 text-[2rem] text-[#1e1e1e]">Welcome to Rates</h1>
      <p className="m-0 mb-8 text-base text-[#666]">
        Please sign in to continue
      </p>
      <div className="flex flex-col gap-4">
        <button
          className="cursor-pointer rounded-md border-none bg-primary-500 px-6 py-3.5 text-base font-medium text-white transition-all duration-200 hover:bg-[#5568d3]"
          onClick={() => void redirectToAuth('login')}
        >
          Sign In
        </button>
        <button
          className="cursor-pointer rounded-md border-2 border-primary-500 bg-transparent px-6 py-3.5 text-base font-medium text-primary-500 transition-all duration-200 hover:bg-primary-500/10"
          onClick={() => void redirectToAuth('signup')}
        >
          Create Account
        </button>
      </div>
    </div>
  );
}
