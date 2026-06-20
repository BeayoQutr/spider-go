import { useEffect, useState } from 'react'
import { getEvaluationTasks, autoEvaluation, getEvaluationStatus } from '../api/evaluation'
import Button from '../components/ui/Button'
import { Star, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react'

export default function Evaluation() {
  const [loading, setLoading] = useState(true)
  const [autoLoading, setAutoLoading] = useState(false)
  const [tasks, setTasks] = useState<any[]>([])
  const [status, setStatus] = useState<any>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [tasksRes, statusRes] = await Promise.all([
        getEvaluationTasks(),
        getEvaluationStatus(),
      ])
      if (tasksRes.code === 0) setTasks(tasksRes.data || [])
      if (statusRes.code === 0) setStatus(statusRes.data)
    } catch { /* 静默 */ }
    setLoading(false)
  }

  async function handleAutoEvaluate() {
    setMessage(null)
    setAutoLoading(true)
    try {
      const res = await autoEvaluation()
      if (res.code === 0) {
        setMessage({ type: 'success', text: '自动评教完成！' })
        loadData()
      } else {
        setMessage({ type: 'error', text: res.message || '自动评教失败' })
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || '网络错误' })
    } finally {
      setAutoLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold text-gray-800">教学评价</h2>

      {/* 状态信息 */}
      {message && (
        <div className={`p-3 rounded-lg text-sm ${
          message.type === 'success' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100'
        }`}>
          {message.text}
        </div>
      )}

      {status && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            {status.completed ? (
              <CheckCircle size={18} className="text-green-500" />
            ) : (
              <AlertCircle size={18} className="text-amber-500" />
            )}
            <span className="text-sm font-medium text-gray-700">
              {status.completed ? '评教已完成' : '有待完成的评教'}
            </span>
          </div>
          {status.taskCount != null && (
            <p className="text-sm text-gray-500">待评任务: {status.taskCount} 项</p>
          )}
        </div>
      )}

      {/* 自动评教 */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-medium text-gray-600 mb-2">一键自动评教</h3>
        <p className="text-xs text-gray-400 mb-4">
          系统将自动完成所有待评教任务。评分策略：全部打满分，随机选一题扣1分，使评教更自然。
        </p>
        <Button onClick={handleAutoEvaluate} loading={autoLoading}>
          <Star size={16} />
          自动评教
        </Button>
      </div>

      {/* 任务列表 */}
      <div>
        <h3 className="text-sm font-medium text-gray-600 mb-3">评教任务列表</h3>
        {tasks.length === 0 ? (
          <div className="text-center py-8">
            <Star size={36} className="mx-auto text-gray-200 mb-2" />
            <p className="text-gray-400 text-sm">暂无评教任务</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.map((task: any, i: number) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <h4 className="text-sm font-medium text-gray-700">{task.task_name || task.taskName || `任务 ${i + 1}`}</h4>
                {task.status != null && (
                  <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded ${
                    task.status === 1 ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {task.status === 1 ? '已完成' : '待完成'}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 刷新 */}
      <button
        onClick={loadData}
        className="w-full flex items-center justify-center gap-2 py-3 text-sm text-gray-400 hover:text-gray-600 transition-colors"
      >
        <RefreshCw size={16} />
        刷新数据
      </button>
    </div>
  )
}
