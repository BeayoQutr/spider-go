import { useEffect, useState } from 'react'
import { getExams, type Exam } from '../api/exams'
import { Calendar, Clock, MapPin } from 'lucide-react'

export default function Exams() {
  const [term, setTerm] = useState('2025-2026-1')
  const [loading, setLoading] = useState(true)
  const [exams, setExams] = useState<Exam[]>([])

  useEffect(() => {
    loadExams()
  }, [term])

  async function loadExams() {
    setLoading(true)
    try {
      const res = await getExams(term)
      if (res.code === 0) setExams(res.data || [])
    } catch { /* 静默 */ }
    setLoading(false)
  }

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold text-gray-800">考试安排</h2>

      {/* 学期输入 */}
      <input
        type="text"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        onBlur={loadExams}
        placeholder="学期 如 2025-2026-1"
        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500"
      />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      ) : exams.length === 0 ? (
        <div className="text-center py-12">
          <Calendar size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400">暂无考试安排</p>
        </div>
      ) : (
        <div className="space-y-3">
          {exams.map((exam, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <h3 className="font-medium text-gray-800">{exam.course_name}</h3>
              <div className="mt-2 space-y-1.5 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-gray-400" />
                  <span>{exam.exam_date} {exam.exam_time}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-gray-400" />
                  <span>{exam.location}</span>
                  {exam.seat_no && <span className="text-gray-300">· 座位 {exam.seat_no}</span>}
                </div>
                {exam.exam_type && (
                  <span className="inline-block mt-1 px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">
                    {exam.exam_type}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
