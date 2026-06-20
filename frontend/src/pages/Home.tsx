import { Link } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { GraduationCap, TrendingUp, CalendarDays, FileText } from 'lucide-react'

export default function Home() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-800">Spider-Go</h1>
          <p className="text-gray-500 mt-2">中南林业科技大学教务管理系统</p>
        </div>

        {isAuthenticated ? (
          <div className="space-y-4">
            <p className="text-center text-gray-600 mb-6">欢迎回来，请选择功能</p>
            <div className="grid grid-cols-2 gap-4">
              {[
                { to: '/dashboard', icon: GraduationCap, label: '学习面板', color: 'bg-blue-500' },
                { to: '/grades', icon: TrendingUp, label: '成绩查询', color: 'bg-green-500' },
                { to: '/courses', icon: CalendarDays, label: '课程表', color: 'bg-purple-500' },
                { to: '/exams', icon: FileText, label: '考试安排', color: 'bg-orange-500' },
              ].map(({ to, icon: Icon, label, color }) => (
                <Link
                  key={to}
                  to={to}
                  className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col items-center gap-3 hover:shadow-md transition-shadow"
                >
                  <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center text-white`}>
                    <Icon size={24} />
                  </div>
                  <span className="text-sm font-medium text-gray-700">{label}</span>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-center text-gray-600">登录以查询成绩、课程表、考试安排等</p>
            <div className="flex gap-3 justify-center">
              <Link
                to="/login"
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                登录
              </Link>
              <Link
                to="/register"
                className="px-6 py-2.5 bg-white text-blue-600 border border-blue-200 rounded-lg font-medium hover:bg-blue-50 transition-colors"
              >
                注册
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
