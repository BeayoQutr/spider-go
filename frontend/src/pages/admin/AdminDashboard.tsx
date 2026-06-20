import { useEffect, useState } from 'react'
import { useAuthStore } from '../../stores/authStore'
import { getDau, getUserCount, getNewUserCount, getAdminInfo } from '../../api/admin'
import { Users, UserPlus, Activity, Calendar } from 'lucide-react'

export default function AdminDashboard() {
  const admin = useAuthStore((s) => s.admin)
  const setUser = useAuthStore((s) => s.setUser) // not used but keep pattern

  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    dau: null as number | null,
    userCount: null as number | null,
    newUsers: null as number | null,
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [dauRes, countRes, newUserRes] = await Promise.all([
        getDau(),
        getUserCount(),
        getNewUserCount(),
      ])

      setStats({
        dau: dauRes.code === 0 ? dauRes.data?.count ?? dauRes.data : null,
        userCount: countRes.code === 0 ? countRes.data?.count ?? countRes.data : null,
        newUsers: newUserRes.code === 0 ? newUserRes.data?.count ?? newUserRes.data : null,
      })
    } catch { /* 静默 */ }
    setLoading(false)
  }

  const cards = [
    { label: '今日活跃', value: stats.dau, icon: Activity, color: 'text-green-600 bg-green-50' },
    { label: '用户总数', value: stats.userCount, icon: Users, color: 'text-blue-600 bg-blue-50' },
    { label: '今日新增', value: stats.newUsers, icon: UserPlus, color: 'text-purple-600 bg-purple-50' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-800">管理概览</h2>
        <p className="text-sm text-gray-400 mt-1">欢迎，{admin?.name || '管理员'}</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-3 gap-3">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2 ${color}`}>
              <Icon size={20} />
            </div>
            <div className="text-xl font-bold text-gray-800">
              {value != null ? value.toLocaleString() : '-'}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* 快捷操作 */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-medium text-gray-600 mb-3">快捷操作</h3>
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
          <div className="p-3 bg-gray-50 rounded-lg">
            <Calendar size={16} className="mb-1 text-gray-400" />
            设置学期 · 配置管理
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <Activity size={16} className="mb-1 text-gray-400" />
            数据同步 · 同步管理
          </div>
        </div>
      </div>
    </div>
  )
}
