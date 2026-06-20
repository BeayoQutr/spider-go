import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const isAdminAuthenticated = useAuthStore((s) => s.isAdminAuthenticated)

  if (!isAdminAuthenticated) {
    return <Navigate to="/admin/login" replace />
  }
  return <>{children}</>
}
