import { useAuth } from '../contexts/AuthContext';

export default function Dashboard() {
  const { token, signOut } = useAuth();

  return (
    <div>
      <h2>Dashboard</h2>
      <p>This is a protected route. You must be authenticated to see this.</p>
      <div
        style={{
          marginTop: '2rem',
          padding: '1rem',
          background: '#e8f5e9',
          borderRadius: '8px',
        }}
      >
        <h3>Your Session</h3>
        <p>
          <strong>Token:</strong>{' '}
          {token ? `${token.slice(0, 30)}...${token.slice(-15)}` : 'None'}
        </p>
        <p>
          <small>
            In production, verify this token with Firebase Admin SDK on your
            backend before trusting it.
          </small>
        </p>
        <button onClick={() => void signOut()} style={{ marginTop: '1rem' }}>
          Sign Out
        </button>
      </div>
    </div>
  );
}
