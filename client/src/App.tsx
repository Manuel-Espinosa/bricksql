import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import ConnectionsPage from './pages/ConnectionsPage'
import WorkspacePage from './pages/WorkspacePage'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/connections"
        element={
          <PrivateRoute>
            <ConnectionsPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/workspace/:id"
        element={
          <PrivateRoute>
            <WorkspacePage />
          </PrivateRoute>
        }
      />
      <Route path="*" element={<Navigate to="/connections" replace />} />
    </Routes>
  )
}
