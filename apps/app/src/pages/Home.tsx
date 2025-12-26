import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Home() {
  const { isAuthenticated, token, redirectToAuth, signOut } = useAuth();

  return (
    <div>
      <h2>Home Page</h2>
      <p>Welcome to your application. This is the home page.</p>

      <div
        style={{
          marginTop: '2rem',
          padding: '1.5rem',
          background: isAuthenticated ? '#e8f5e9' : '#fff3e0',
          border: `2px solid ${isAuthenticated ? '#4caf50' : '#ff9800'}`,
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}
      >
        <h3
          style={{
            marginTop: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          {isAuthenticated ? (
            <>
              <span style={{ fontSize: '1.5rem' }}>✓</span>
              <span style={{ color: '#2e7d32' }}>Authenticated</span>
            </>
          ) : (
            <>
              <span style={{ fontSize: '1.5rem' }}>⚠</span>
              <span style={{ color: '#e65100' }}>Not Authenticated</span>
            </>
          )}
        </h3>

        {isAuthenticated ? (
          <div>
            <p style={{ color: '#2e7d32', fontWeight: '500' }}>
              You are successfully authenticated and can access protected
              routes.
            </p>
            <div
              style={{
                marginTop: '1rem',
                padding: '1rem',
                background: 'white',
                borderRadius: '4px',
                fontSize: '0.9rem',
              }}
            >
              <p style={{ margin: '0 0 0.5rem 0' }}>
                <strong>Token Preview:</strong>
              </p>
              <code
                style={{
                  display: 'block',
                  padding: '0.5rem',
                  background: '#f5f5f5',
                  borderRadius: '4px',
                  wordBreak: 'break-all',
                  fontSize: '0.85rem',
                }}
              >
                {token
                  ? `${token.slice(0, 30)}...${token.slice(-20)}`
                  : 'No token'}
              </code>
              <p
                style={{
                  margin: '0.5rem 0 0 0',
                  fontSize: '0.8rem',
                  color: '#666',
                }}
              >
                <small>
                  In production, verify this token with Firebase Admin SDK on
                  your backend.
                </small>
              </p>
            </div>
            <div
              style={{
                marginTop: '1.5rem',
                display: 'flex',
                gap: '1rem',
                flexWrap: 'wrap',
              }}
            >
              <Link
                to="/dashboard"
                style={{
                  display: 'inline-block',
                  padding: '0.75rem 1.5rem',
                  background: '#4caf50',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: '4px',
                  fontWeight: '500',
                  transition: 'background 0.2s',
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.background = '#45a049')
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.background = '#4caf50')
                }
              >
                Go to Dashboard
              </Link>
              <button
                onClick={() => void signOut()}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#f44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  transition: 'background 0.2s',
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.background = '#da190b')
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.background = '#f44336')
                }
              >
                Sign Out
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p style={{ color: '#e65100', fontWeight: '500' }}>
              You need to authenticate to access protected routes and features.
            </p>
            <div
              style={{
                marginTop: '1.5rem',
                display: 'flex',
                gap: '1rem',
                flexWrap: 'wrap',
              }}
            >
              <button
                onClick={() => void redirectToAuth('login')}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#ff9800',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  transition: 'background 0.2s',
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.background = '#f57c00')
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.background = '#ff9800')
                }
              >
                Sign In
              </button>
              <button
                onClick={() => void redirectToAuth('signup')}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#2196f3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  transition: 'background 0.2s',
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.background = '#0b7dda')
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.background = '#2196f3')
                }
              >
                Create Account
              </button>
            </div>
            <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#666' }}>
              Authentication is handled by the centralized auth-app service.
            </p>
          </div>
        )}
      </div>

      <div
        style={{
          marginTop: '2rem',
          padding: '1rem',
          background: '#f5f5f5',
          borderRadius: '8px',
        }}
      >
        <h3>Quick Links</h3>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          <li style={{ marginBottom: '0.5rem' }}>
            <Link
              to="/about"
              style={{ color: '#2196f3', textDecoration: 'none' }}
            >
              → About Page
            </Link>
          </li>
          {isAuthenticated && (
            <li style={{ marginBottom: '0.5rem' }}>
              <Link
                to="/dashboard"
                style={{ color: '#2196f3', textDecoration: 'none' }}
              >
                → Dashboard (Protected)
              </Link>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
