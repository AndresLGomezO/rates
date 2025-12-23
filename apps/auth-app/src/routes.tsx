import {
  Navigate,
  RouterProvider,
  createBrowserRouter,
} from 'react-router-dom';
import App from './App';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Session from './pages/Session';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Landing /> },
      { path: 'login', element: <Login /> },
      { path: 'signup', element: <Signup /> },
      { path: 'session', element: <Session /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
