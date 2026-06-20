import { useState } from 'react'
import { getMyRanking } from '../api/ranking'
import Button from '../components/ui/Button'
import { Medal, Users } from 'lucide-react'

const TYPE_OPTIONS = [
  { value: 'cumulative', label: '累计排名' },
  { value: 'semester', label: '学期排名' },
  { value: 'year', label: '学年排名' },
]

export default function Ranking() {
  const [statisticsType, setStatisticsType] = useState('cumulative')
  const [statisticsTerm, setStatisticsTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  async function handleQuery() {
    setError('')
    setResult(null)
    setLoading(true)
    try {
      const res = await getMyRanking(
        statisticsType,
        statisticsTerm || undefined,
      )
      if (res.code === 0) {
        setResult(res.data)
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
      <h2 className="text-xl font-semibold text-gray-800">排名查询</h2>

      {/* 查询表单 */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">排名类型</label>
          <div className="flex gap-2">
            {TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setStatisticsType(opt.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statisticsType === opt.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            学期/学年 <span className="text-gray-400 font-normal">(可选)</span>
          </label>
          <input
            type="text"
            value={statisticsTerm}
            onChange={(e) => setStatisticsTerm(e.target.value)}
            placeholder="如 2024-2025-1 或 2024-2025"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500"
          />
        </div>

        <Button onClick={handleQuery} loading={loading}>
          <Medal size={16} />
          查询排名
        </Button>

        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}
      </div>

      {/* 排名结果 */}
      {result && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users size={18} className="text-blue-500" />
            <h3 className="text-sm font-medium text-gray-700">排名结果</h3>
          </div>

          {/* 适应不同返回结构 */}
          <div className="grid grid-cols-2 gap-4">
            {result.rank != null && (
              <div className="bg-blue-50 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{result.rank}</div>
                <div className="text-xs text-blue-400 mt-0.5">排名</div>
              </div>
            )}
            {result.total_count != null && (
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-gray-600">{result.total_count}</div>
                <div className="text-xs text-gray-400 mt-0.5">总人数</div>
              </div>
            )}
            {result.gpa != null && (
              <div className="bg-green-50 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{Number(result.gpa).toFixed(2)}</div>
                <div className="text-xs text-green-400 mt-0.5">绩点</div>
              </div>
            )}
            {result.average_score != null && (
              <div className="bg-purple-50 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">{Number(result.average_score).toFixed(1)}</div>
                <div className="text-xs text-purple-400 mt-0.5">平均分</div>
              </div>
            )}
          </div>

          {/* 兜底：原始 JSON */}
          {!result.rank && !result.gpa && (
            <pre className="text-xs text-gray-500 overflow-x-auto bg-gray-50 p-3 rounded-lg">
              {JSON.stringify(result, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}
