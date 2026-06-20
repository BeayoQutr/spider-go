import { useEffect, useState } from 'react'
import { getGrades, getLevelGrades, type Grade } from '../api/grades'
import { formatTerm, formatScore, gpaColor } from '../utils/format'
import { TrendingUp, BookOpen } from 'lucide-react'

type Tab = 'semester' | 'level'

export default function Grades() {
  const [tab, setTab] = useState<Tab>('semester')
  const [loading, setLoading] = useState(true)
  const [grades, setGrades] = useState<Grade[]>([])
  const [gpa, setGpa] = useState<{ averageGPA: number; averageScore: number } | null>(null)
  const [levelGrades, setLevelGrades] = useState<any[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    setError('')
    try {
      const [gradesRes, levelRes] = await Promise.all([
        getGrades(),
        getLevelGrades(),
      ])

      if (gradesRes.code === 0) {
        setGrades(gradesRes.data.grades || [])
        setGpa(gradesRes.data.gpa || null)
      } else {
        setError(gradesRes.message || '获取成绩失败')
      }
      if (levelRes.code === 0) {
        setLevelGrades(levelRes.data || [])
      }
    } catch (err: any) {
      setError(err.response?.data?.message || '网络错误')
    }

    setLoading(false)
  }

  /** 按学期分组 */
  const groupedGrades = grades.reduce((acc, g) => {
    if (!acc[g.term]) acc[g.term] = []
    acc[g.term].push(g)
    return acc
  }, {} as Record<string, Grade[]>)

  const terms = Object.keys(groupedGrades).sort().reverse()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold text-gray-800">成绩查询</h2>

      {error && (
        <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">{error}</div>
      )}

      {/* GPA 总览卡片 */}
      {gpa && (
        <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl p-5 text-white">
          <div className="flex justify-around">
            <div className="text-center">
              <div className="text-2xl font-bold">{gpa.averageGPA?.toFixed(2) || '-'}</div>
              <div className="text-xs text-green-100 mt-0.5">平均绩点</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{gpa.averageScore?.toFixed(1) || '-'}</div>
              <div className="text-xs text-green-100 mt-0.5">平均分</div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 切换 */}
      <div className="flex bg-gray-100 rounded-lg p-0.5">
        <button
          onClick={() => setTab('semester')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === 'semester' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'
          }`}
        >
          <TrendingUp size={16} />
          学期成绩
        </button>
        <button
          onClick={() => setTab('level')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === 'level' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'
          }`}
        >
          <BookOpen size={16} />
          等级考试
        </button>
      </div>

      {/* 学期成绩 */}
      {tab === 'semester' && (
        <div className="space-y-4">
          {terms.length === 0 && <p className="text-center text-gray-400 py-8">暂无成绩数据</p>}
          {terms.map((term) => (
            <div key={term} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                <span className="text-sm font-medium text-gray-600">{formatTerm(term)}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-50 text-gray-400 text-xs">
                      <th className="px-4 py-2 text-left font-medium">课程</th>
                      <th className="px-2 py-2 text-center font-medium">成绩</th>
                      <th className="px-2 py-2 text-center font-medium">学分</th>
                      <th className="px-2 py-2 text-center font-medium">绩点</th>
                      <th className="px-2 py-2 text-center font-medium">属性</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedGrades[term].map((g, i) => (
                      <tr key={i} className="border-b border-gray-50 last:border-0">
                        <td className="px-4 py-2.5 text-gray-700 max-w-[140px] truncate">{g.subject}</td>
                        <td className={`px-2 py-2.5 text-center font-medium ${parseFloat(g.score) >= 60 ? 'text-gray-700' : 'text-red-500'}`}>
                          {formatScore(g.score)}
                        </td>
                        <td className="px-2 py-2.5 text-center text-gray-500">{g.credit}</td>
                        <td className={`px-2 py-2.5 text-center font-medium ${gpaColor(g.gpa)}`}>
                          {g.gpa.toFixed(1)}
                        </td>
                        <td className="px-2 py-2.5 text-center text-gray-400 text-xs">{g.property}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 等级考试 */}
      {tab === 'level' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {levelGrades.length === 0 ? (
            <p className="text-center text-gray-400 py-8">暂无等级考试成绩</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50 text-gray-400 text-xs">
                  <th className="px-4 py-3 text-left font-medium">考试名称</th>
                  <th className="px-2 py-3 text-center font-medium">成绩</th>
                  <th className="px-2 py-3 text-center font-medium">考试时间</th>
                </tr>
              </thead>
              <tbody>
                {levelGrades.map((item: any, i: number) => (
                  <tr key={i} className="border-b border-gray-50 last:border-0">
                    <td className="px-4 py-2.5 text-gray-700">{item.CourseName || item.course_name || item.courseName}</td>
                    <td className="px-2 py-2.5 text-center font-medium text-gray-700">
                      {item.LevelGrade || item.level_grade || item.LevGrade || item.levGrade}
                    </td>
                    <td className="px-2 py-2.5 text-center text-gray-500">{item.Time || item.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
