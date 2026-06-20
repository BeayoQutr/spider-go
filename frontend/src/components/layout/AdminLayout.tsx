import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Bell, FileText, Users, RefreshCw, LogOut } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'

const sidebarLinks = [
  { to: '/admin', icon: LayoutDashboard, label: '概览' },
  { to: '/admin/notices', icon: Bell, label: '通知管理' },
  { to: '/admin/introductions', icon: FileText, label: '使用须知' },
  { to: '/admin/users', icon: Users, label: '用户统计' },
  { to: '/admin/sync', icon: RefreshCw, label: '数据同步' },
]

export default function AdminLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const adminLogout = useAuthStore((s) => s.adminLogout)

  const handleLogout = () => {
    adminLogout()
    navigate('/admin/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* 侧边栏 */}
      <aside className="hidden md:flex md:flex-col md:w-56 bg-white border-r border-gray-200 fixed inset-y-0 left-0 z-40">
        <div className="px-6 py-5 border-b border-gray-100">
          <h1 className="text-lg font-bold text-gray-800">Spider-Go</h1>
          <p className="text-xs text-gray-400">管理后台</p>
        </div>
        <nav className="flex-1 py-4 space-y-0.5 px-3">
          {sidebarLinks.map(({ to, icon: Icon, label }) => {
            const isActive = location.pathname === to
            return (
              <NavLink
                key={to}
                to={to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon size={18} />
                {label}
              </NavLink>
            )
          })}
        </nav>
        <div className="px-3 py-4 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors w-full"
          >
            <LogOut size={18} />
            退出登录
          </button>
        </div>
      </aside>

      {/* 主内容区 */}
      <div className="flex-1 md:ml-56">
        {/* 移动端顶栏 */}
        <header className="md:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
          <div>
            <h1 className="text-sm font-bold text-gray-800">Spider-Go 管理后台</h1>
          </div>
          <button onClick={handleLogout} className="text-gray-400 hover:text-red-500">
            <LogOut size={18} />
          </button>
        </header>

        {/* 移动端底部导航 */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 flex justify-around">
          {sidebarLinks.map(({ to, icon: Icon, label }) => {
            const isActive = location.pathname === to
            return (
              <NavLink
                key={to}
                to={to}
                className={`flex flex-col items-center py-2 px-2 text-[10px] gap-0.5 ${
                  isActive ? 'text-blue-600' : 'text-gray-400'
                }`}
              >
                <Icon size={18} />
                {label}
              </NavLink>
            )
          })}
        </nav>

        <main className="px-4 py-6 pb-20 md:pb-6 max-w-4xl mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
