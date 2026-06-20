import { useEffect, useState } from 'react'
import { getUserCount, getNewUserCount, getDauRange } from '../../api/admin'
import { Users, UserPlus, TrendingUp } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'

export default function AdminUsers() {
  const [loading, setLoading] = useState(true)
  const [userCount, setUserCount] = useState<number | null>(null)
  const [newUsers, setNewUsers] = useState<number | null>(null)
  const [dauRange, setDauRange] = useState<any[]>([])

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [countRes, newUserRes] = await Promise.all([
        getUserCount(),
        getNewUserCount(),
      ])
      if (countRes.code === 0) setUserCount(countRes.data?.count ?? countRes.data)
      if (newUserRes.code === 0) setNewUsers(newUserRes.data?.count ?? newUserRes.data)

      // 加载最近 7 天 DAU
      const endDate = new Date()
      const startDate = new Date(endDate)
      startDate.setDate(startDate.getDate() - 7)
      try {
        const dauRes = await getDauRange(
          startDate.toISOString().slice(0, 10),
          endDate.toISOString().slice(0, 10),
        )
        if (dauRes.code === 0) {
          const data = dauRes.data
          setDauRange(Array.isArray(data) ? data : Object.entries(data || {}).map(([date, count]) => ({ date, count })))
        }
      } catch { /* 静默 */ }
    } catch { /* 静默 */ }
    setLoading(false)
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" /></div>
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-800">用户统计</h2>

      {/* 核心指标 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mx-auto mb-2">
            <Users size={20} className="text-blue-600" />
          </div>
          <div className="text-xl font-bold text-gray-800">{userCount?.toLocaleString() ?? '-'}</div>
          <div className="text-xs text-gray-400 mt-0.5">用户总数</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
          <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center mx-auto mb-2">
            <UserPlus size={20} className="text-green-600" />
          </div>
          <div className="text-xl font-bold text-gray-800">{newUsers?.toLocaleString() ?? '-'}</div>
          <div className="text-xs text-gray-400 mt-0.5">今日新增</div>
        </div>
      </div>

      {/* DAU 趋势图 */}
      {dauRange.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <h3 className="text-sm font-medium text-gray-600 mb-4">近 7 天活跃用户 (DAU)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={dauRange}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} name="活跃用户" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
