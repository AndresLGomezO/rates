import { Link, Outlet } from 'react-router-dom';
import './App.css';

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>Welcome to the App</h1>
        <p>React Router v7 is configured and ready to use.</p>
        <nav>
          <Link to="/">Home</Link>
          <Link to="/about">About</Link>
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}

export default App;
