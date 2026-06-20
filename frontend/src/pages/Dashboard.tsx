import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { useAppStore } from '../stores/appStore'
import { getUserInfo, getBindStatus } from '../api/user'
import { getGrades } from '../api/grades'
import { GraduationCap, TrendingUp, CalendarDays, FileText, Star, AlertCircle } from 'lucide-react'

export default function Dashboard() {
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const [loading, setLoading] = useState(true)
  const [bindStatus, setBindStatus] = useState<any>(null)
  const [gpa, setGpa] = useState<{ averageGPA: number; averageScore: number } | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        const [infoRes, bindRes] = await Promise.all([
          getUserInfo(),
          getBindStatus(),
        ])
        if (infoRes.code === 0) setUser(infoRes.data)
        if (bindRes.code === 0) setBindStatus(bindRes.data)
      } catch { /* 静默处理 */ }

      // 尝试获取最新成绩概览
      try {
        const gradesRes = await getGrades()
        if (gradesRes.code === 0 && gradesRes.data.gpa) {
          setGpa(gradesRes.data.gpa)
        }
      } catch { /* 无成绩数据 */ }

      setLoading(false)
    }
    loadData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* 欢迎卡片 */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-5 text-white">
        <h1 className="text-lg font-semibold">Hi, {user?.name || '同学'}</h1>
        <p className="text-blue-100 text-sm mt-1">
          {bindStatus?.is_bound
            ? `已绑定教务系统 · ${bindStatus.current_sid}`
            : '尚未绑定教务系统'}
        </p>
      </div>

      {/* 未绑定提示 */}
      {!bindStatus?.is_bound && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle size={20} className="text-amber-500 mt-0.5 shrink-0" />
          <div className="text-sm text-amber-700">
            <p className="font-medium">需要绑定教务系统</p>
            <p className="mt-1 text-amber-600">绑定后可查询成绩、课程表、考试安排等</p>
            <Link to="/profile" className="inline-block mt-2 text-amber-700 font-medium underline">
              去绑定 →
            </Link>
          </div>
        </div>
      )}

      {/* GPA 概览 */}
      {gpa && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <h2 className="text-sm font-medium text-gray-500 mb-3">成绩概览</h2>
          <div className="flex gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{gpa.averageGPA?.toFixed(2) || '-'}</div>
              <div className="text-xs text-gray-400 mt-0.5">平均绩点</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{gpa.averageScore?.toFixed(1) || '-'}</div>
              <div className="text-xs text-gray-400 mt-0.5">平均分</div>
            </div>
          </div>
        </div>
      )}

      {/* 功能导航 */}
      <div>
        <h2 className="text-sm font-medium text-gray-500 mb-3">常用功能</h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { to: '/grades', icon: TrendingUp, label: '成绩查询', color: 'text-blue-600 bg-blue-50' },
            { to: '/courses', icon: CalendarDays, label: '课程表', color: 'text-purple-600 bg-purple-50' },
            { to: '/exams', icon: FileText, label: '考试安排', color: 'text-orange-600 bg-orange-50' },
            { to: '/evaluation', icon: Star, label: '教学评价', color: 'text-pink-600 bg-pink-50' },
          ].map(({ to, icon: Icon, label, color }) => (
            <Link
              key={to}
              to={to}
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 hover:shadow-md transition-shadow"
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
                <Icon size={20} />
              </div>
              <span className="text-sm font-medium text-gray-700">{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
