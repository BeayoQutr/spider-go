import { Routes, Route } from 'react-router-dom'
import AuthLayout from './components/layout/AuthLayout'
import MainLayout from './components/layout/MainLayout'
import AdminLayout from './components/layout/AdminLayout'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'

// 公开页面
import Home from './pages/Home'
import ShareCourse from './pages/ShareCourse'
import NotFound from './pages/NotFound'

// 认证页面
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'

// 用户页面
import Dashboard from './pages/Dashboard'
import Grades from './pages/Grades'
import CourseSchedule from './pages/CourseSchedule'
import Exams from './pages/Exams'
import Evaluation from './pages/Evaluation'
import Ranking from './pages/Ranking'
import CourseTips from './pages/CourseTips'
import Sync from './pages/Sync'
import Profile from './pages/Profile'
import Notices from './pages/Notices'

// 管理员页面
import AdminLogin from './pages/admin/AdminLogin'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminNotices from './pages/admin/AdminNotices'
import AdminIntroductions from './pages/admin/AdminIntroductions'
import AdminUsers from './pages/admin/AdminUsers'
import AdminSync from './pages/admin/AdminSync'

export default function App() {
  return (
    <Routes>
      {/* 公开页面 */}
      <Route path="/" element={<Home />} />
      <Route path="/share/course/:code" element={<ShareCourse />} />

      {/* 认证页面 */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/admin/login" element={<AdminLogin />} />
      </Route>

      {/* 用户端（需登录） */}
      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/grades" element={<Grades />} />
        <Route path="/courses" element={<CourseSchedule />} />
        <Route path="/exams" element={<Exams />} />
        <Route path="/evaluation" element={<Evaluation />} />
        <Route path="/ranking" element={<Ranking />} />
        <Route path="/course-tips" element={<CourseTips />} />
        <Route path="/sync" element={<Sync />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/notices" element={<Notices />} />
      </Route>

      {/* 管理员端（需管理员登录） */}
      <Route
        element={
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        }
      >
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/notices" element={<AdminNotices />} />
        <Route path="/admin/introductions" element={<AdminIntroductions />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/sync" element={<AdminSync />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
