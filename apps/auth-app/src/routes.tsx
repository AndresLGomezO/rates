import {
  Navigate,
  RouterProvider,
  createBrowserRouter,
} from 'react-router-dom';
import App from './App';
import ApiValidate from './pages/ApiValidate';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Logout from './pages/Logout';
import Signup from './pages/Signup';
import Session from './pages/Session';
import Validate from './pages/Validate';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Landing /> },
      { path: 'login', element: <Login /> },
      { path: 'signup', element: <Signup /> },
      { path: 'session', element: <Session /> },
      { path: 'validate', element: <Validate /> },
      { path: 'logout', element: <Logout /> },
      { path: 'api/validate', element: <ApiValidate /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
