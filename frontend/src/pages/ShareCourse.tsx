import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getSharedCourse } from '../api/share'
import type { Course, WeekSchedule } from '../api/courses'
import { Calendar, User } from 'lucide-react'

const DAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const SECTIONS = Array.from({ length: 12 }, (_, i) => i + 1)
const COLORS = ['bg-blue-100 border-blue-300 text-blue-800', 'bg-green-100 border-green-300 text-green-800',
  'bg-purple-100 border-purple-300 text-purple-800', 'bg-orange-100 border-orange-300 text-orange-800',
  'bg-pink-100 border-pink-300 text-pink-800', 'bg-cyan-100 border-cyan-300 text-cyan-800',
  'bg-yellow-100 border-yellow-300 text-yellow-800', 'bg-indigo-100 border-indigo-300 text-indigo-800']

export default function ShareCourse() {
  const { code } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    if (!code) return
    loadData()
  }, [code])

  async function loadData() {
    setLoading(true)
    try {
      const res = await getSharedCourse(code!)
      if (res.code === 0) {
        setData(res.data)
      } else {
        setError(res.message || '分享不存在或已失效')
      }
    } catch {
      setError('加载失败，请检查分享链接')
    } finally {
      setLoading(false)
    }
  }

  function buildGrid(schedule: any) {
    const grid: Record<string, { item: any; rowSpan: number; color: string }> = {}
    let colorIdx = 0
    // 兼容 WeekSchedule 格式
    const days = schedule?.days || []
    if (Array.isArray(days)) {
      days.forEach((day: any) => {
        (day.courses || []).forEach((c: any) => {
          const rowSpan = (c.end_period || c.end_section || 1) - (c.start_period || c.start_section || 1) + 1
          const key = `${c.weekday || day.weekday}-${c.start_period || c.start_section}`
          grid[key] = { item: c, rowSpan, color: COLORS[colorIdx % COLORS.length] }
          colorIdx++
        })
      })
    } else {
      // 兼容旧 Record 格式
      Object.entries(schedule || {}).forEach(([day, courses]: [string, any]) => {
        (courses as any[]).forEach((c: any) => {
          const rowSpan = (c.end_period || c.end_section || 1) - (c.start_period || c.start_section || 1) + 1
          const key = `${day}-${c.start_period || c.start_section}`
          grid[key] = { item: c, rowSpan, color: COLORS[colorIdx % COLORS.length] }
          colorIdx++
        })
      })
    }
    return grid
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="text-4xl mb-4">📅</div>
          <h1 className="text-lg font-semibold text-gray-800 mb-2">无法查看课表</h1>
          <p className="text-gray-400 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  const grid = buildGrid(data?.schedule || {})

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* 头部信息 */}
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-800">课程表分享</h1>
          <div className="flex items-center justify-center gap-4 mt-2 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <User size={14} /> {data?.user_name || '匿名'}
            </span>
            <span className="flex items-center gap-1">
              <Calendar size={14} /> {data?.term}
            </span>
          </div>
          {data?.start_week && data?.end_week && (
            <p className="text-xs text-gray-400 mt-1">
              第 {data.start_week} - {data.end_week} 周
            </p>
          )}
        </div>

        {/* 课程表格 */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 bg-gray-50 px-2 py-2 text-xs text-gray-400 font-medium w-10 border-b border-r border-gray-100"></th>
                {DAYS.map((d) => (
                  <th key={d} className="px-1 py-2 text-xs text-gray-500 font-medium border-b border-gray-100 min-w-[70px]">
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SECTIONS.map((sec) => (
                <tr key={sec}>
                  <td className="sticky left-0 bg-gray-50 px-1 py-1 text-center text-[10px] text-gray-400 border-r border-gray-100 border-b border-gray-50">
                    {sec}
                  </td>
                  {DAYS.map((_, dayIdx) => {
                    const key = `${dayIdx + 1}-${sec}`
                    const cell = grid[key]
                    if (!cell) return <td key={dayIdx} className="border-b border-gray-50 h-8" />
                    return (
                      <td
                        key={dayIdx}
                        rowSpan={cell.rowSpan}
                        className={`border border-gray-100 p-1 align-top ${cell.color} rounded`}
                      >
                        <div className="text-[10px] font-medium leading-tight">{cell.item.name || cell.item.course_name}</div>
                        <div className="text-[9px] opacity-70">{cell.item.teacher}</div>
                        <div className="text-[9px] opacity-60">{cell.item.classroom || cell.item.location}</div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 底部水印 */}
        <p className="text-center text-xs text-gray-300">
          由 Spider-Go 生成
        </p>
      </div>
    </div>
  )
}
