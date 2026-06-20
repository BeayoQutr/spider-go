import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { House, BarChart3, CalendarDays, User } from 'lucide-react'

const tabs = [
  { to: '/dashboard', icon: House, label: '首页' },
  { to: '/grades', icon: BarChart3, label: '成绩' },
  { to: '/courses', icon: CalendarDays, label: '课表' },
  { to: '/profile', icon: User, label: '我的' },
]

export default function MainLayout() {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <main className="max-w-2xl mx-auto px-4 py-6">
        <Outlet />
      </main>

      {/* 底部导航栏 */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="max-w-2xl mx-auto flex justify-around">
          {tabs.map(({ to, icon: Icon, label }) => {
            const isActive = location.pathname.startsWith(to)
            return (
              <NavLink
                key={to}
                to={to}
                className={`flex flex-col items-center py-2 px-4 text-xs gap-0.5 transition-colors ${
                  isActive ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <Icon size={22} />
                <span>{label}</span>
              </NavLink>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
