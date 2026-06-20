import { useEffect, useState } from 'react'
import { getCourses, type WeekSchedule, type Course } from '../api/courses'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const DAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const SECTIONS = Array.from({ length: 12 }, (_, i) => i + 1)
const COLORS = ['bg-blue-100 border-blue-300 text-blue-800', 'bg-green-100 border-green-300 text-green-800',
  'bg-purple-100 border-purple-300 text-purple-800', 'bg-orange-100 border-orange-300 text-orange-800',
  'bg-pink-100 border-pink-300 text-pink-800', 'bg-cyan-100 border-cyan-300 text-cyan-800',
  'bg-yellow-100 border-yellow-300 text-yellow-800', 'bg-indigo-100 border-indigo-300 text-indigo-800']

export default function CourseSchedule() {
  const [term, setTerm] = useState('2025-2026-1')
  const [week, setWeek] = useState(1)
  const [loading, setLoading] = useState(true)
  const [schedule, setSchedule] = useState<WeekSchedule | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    loadCourses()
  }, [term, week])

  async function loadCourses() {
    setLoading(true)
    setError('')
    try {
      const res = await getCourses(term, week)
      if (res.code === 0) {
        setSchedule(res.data)
      } else {
        setError(res.message || '获取课程表失败')
      }
    } catch (err: any) {
      setError(err.response?.data?.message || '网络错误')
    }
    setLoading(false)
  }

  /** 把课程映射到网格位置：key = "weekday-startPeriod" */
  function buildGrid() {
    const grid: Record<string, { course: Course; rowSpan: number; color: string }> = {}
    if (!schedule?.days) return grid
    let colorIdx = 0
    schedule.days.forEach((day) => {
      day.courses?.forEach((c) => {
        const rowSpan = c.end_period - c.start_period + 1
        const key = `${c.weekday}-${c.start_period}`
        grid[key] = { course: c, rowSpan, color: COLORS[colorIdx % COLORS.length] }
        colorIdx++
      })
    })
    return grid
  }

  const grid = buildGrid()

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-800">课程表</h2>

      {/* 学期和周期选择 */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="学期 如 2025-2026-1"
          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500"
        />
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-2 py-1">
          <button onClick={() => setWeek((w) => Math.max(1, w - 1))} className="p-1 hover:bg-gray-100 rounded">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-medium w-14 text-center">第 {week} 周</span>
          <button onClick={() => setWeek((w) => Math.min(20, w + 1))} className="p-1 hover:bg-gray-100 rounded">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">{error}</div>
      )}

      {/* 日期范围 */}
      {schedule && (
        <p className="text-xs text-gray-400">
          {schedule.starttime} ~ {schedule.endtime}
        </p>
      )}

      {/* 课程表格 */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 bg-gray-50 px-2 py-2 text-xs text-gray-400 font-medium w-12 border-b border-r border-gray-100"></th>
                {DAYS.map((d) => (
                  <th key={d} className="px-2 py-2 text-xs text-gray-500 font-medium border-b border-gray-100 min-w-[80px]">
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SECTIONS.map((sec) => (
                <tr key={sec}>
                  <td className="sticky left-0 bg-gray-50 px-2 py-1 text-center text-xs text-gray-400 border-r border-gray-100 border-b border-gray-50">
                    {sec}
                  </td>
                  {DAYS.map((_, dayIdx) => {
                    const key = `${dayIdx + 1}-${sec}`
                    const cell = grid[key]
                    if (!cell) return <td key={dayIdx} className="border-b border-gray-50 h-10" />
                    return (
                      <td
                        key={dayIdx}
                        rowSpan={cell.rowSpan}
                        className={`border border-gray-100 p-1 align-top ${cell.color} rounded`}
                      >
                        <div className="text-xs font-medium leading-tight">{cell.course.name}</div>
                        <div className="text-[10px] opacity-70 mt-0.5">{cell.course.teacher}</div>
                        <div className="text-[10px] opacity-60">{cell.course.classroom}</div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
