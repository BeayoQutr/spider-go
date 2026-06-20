import { useState } from 'react'
import { getCourseTips, type TeacherStat } from '../api/courseTips'
import Button from '../components/ui/Button'
import { GraduationCap, Users, TrendingUp, AlertTriangle } from 'lucide-react'

const COURSE_OPTIONS = ['体育选项课Ⅰ', '体育选项课Ⅱ', '体育选项课Ⅲ']

export default function CourseTips() {
  const [courseName, setCourseName] = useState(COURSE_OPTIONS[0])
  const [loading, setLoading] = useState(false)
  const [teachers, setTeachers] = useState<TeacherStat[]>([])
  const [error, setError] = useState('')

  async function handleQuery() {
    setError('')
    setTeachers([])
    setLoading(true)
    try {
      const res = await getCourseTips(courseName)
      if (res.code === 0) {
        setTeachers(res.data?.teachers || [])
      } else {
        setError(res.message || '查询失败')
      }
    } catch (err: any) {
      setError(err.response?.data?.message || '网络错误')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold text-gray-800">体育选课推荐</h2>
      <p className="text-xs text-gray-400 -mt-3">
        基于历史成绩数据，帮助你选择适合的体育老师（数据来源于往届学生成绩）
      </p>

      {/* 查询表单 */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">选择课程</label>
          <div className="flex gap-2">
            {COURSE_OPTIONS.map((name) => (
              <button
                key={name}
                onClick={() => setCourseName(name)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  courseName === name
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {name.replace('体育选项课', '')}
              </button>
            ))}
          </div>
        </div>

        <Button onClick={handleQuery} loading={loading}>
          <GraduationCap size={16} />
          查询
        </Button>

        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>

      {/* 教师列表 */}
      {teachers.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-600">
            {courseName} · 教师评分（共 {teachers.length} 位，已排除学生数&lt;30的教师）
          </h3>

          {teachers.map((t, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-800">{t.teacher_name}</h4>
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Users size={14} /> {t.student_count} 人
                </span>
              </div>

              {/* 核心指标 */}
              <div className="grid grid-cols-4 gap-2 mb-3">
                <div className="text-center p-2 bg-blue-50 rounded-lg">
                  <div className="text-lg font-bold text-blue-600">{t.average_score.toFixed(1)}</div>
                  <div className="text-[10px] text-blue-400">平均分</div>
                </div>
                <div className="text-center p-2 bg-green-50 rounded-lg">
                  <div className="text-lg font-bold text-green-600">{t.max_score}</div>
                  <div className="text-[10px] text-green-400">最高分</div>
                </div>
                <div className="text-center p-2 bg-orange-50 rounded-lg">
                  <div className="text-lg font-bold text-orange-600">{t.min_score}</div>
                  <div className="text-[10px] text-orange-400">最低分</div>
                </div>
                <div className="text-center p-2 bg-red-50 rounded-lg">
                  <div className="text-lg font-bold text-red-600">{(t.fail_rate * 100).toFixed(1)}%</div>
                  <div className="text-[10px] text-red-400">挂科率</div>
                </div>
              </div>

              {/* 分数分布条 */}
              <div>
                <div className="text-[10px] text-gray-400 mb-1">分数分布</div>
                <div className="flex h-5 rounded-full overflow-hidden">
                  {[
                    { count: t.score_distribution.range_0_59, color: 'bg-red-400', label: '0-59' },
                    { count: t.score_distribution.range_60_69, color: 'bg-orange-400', label: '60-69' },
                    { count: t.score_distribution.range_70_79, color: 'bg-yellow-400', label: '70-79' },
                    { count: t.score_distribution.range_80_89, color: 'bg-blue-400', label: '80-89' },
                    { count: t.score_distribution.range_90_100, color: 'bg-green-400', label: '90-100' },
                  ].map((seg) => {
                    const pct = t.student_count > 0 ? (seg.count / t.student_count) * 100 : 0
                    if (pct === 0) return null
                    return (
                      <div
                        key={seg.label}
                        className={`${seg.color} flex items-center justify-center text-[8px] text-white font-medium`}
                        style={{ width: `${pct}%` }}
                      >
                        {pct > 10 ? seg.label : ''}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {teachers.length === 0 && !loading && !error && (
        <div className="text-center py-12">
          <GraduationCap size={40} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-400 text-sm">选择课程后点击查询</p>
        </div>
      )}
    </div>
  )
}
