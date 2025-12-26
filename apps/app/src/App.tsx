import { Link, Outlet } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import './App.css';

function App() {
  const { isAuthenticated, redirectToAuth, signOut } = useAuth();

  return (
    <div className="app">
      <header className="app-header">
        <h1>Welcome to the App</h1>
        <p>React Router v7 is configured and ready to use.</p>
        <nav>
          <Link to="/">Home</Link>
          <Link to="/about">About</Link>
          {isAuthenticated && <Link to="/dashboard">Dashboard</Link>}
        </nav>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '1rem' }}>
          {isAuthenticated ? (
            <button onClick={() => void signOut()}>Sign Out</button>
          ) : (
            <button onClick={() => void redirectToAuth('login')}>
              Sign In
            </button>
          )}
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}

export default App;
