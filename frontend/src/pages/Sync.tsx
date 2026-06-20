import { useEffect, useState } from 'react'
import { getSyncStatus, triggerSync, getSyncTasks } from '../api/sync'
import Button from '../components/ui/Button'
import { RefreshCw, Clock, CheckCircle, XCircle, Loader } from 'lucide-react'

const TASK_TYPES: Record<string, string> = {
  all: '全部同步',
  grade: '成绩',
  regular_grade: '平时分',
  exam: '考试',
  level_exam: '等级考试',
  course: '课程表',
}

const STATUS_MAP: Record<number, { label: string; icon: typeof CheckCircle; color: string }> = {
  0: { label: '待执行', icon: Clock, color: 'text-gray-400' },
  1: { label: '执行中', icon: Loader, color: 'text-blue-500' },
  2: { label: '成功', icon: CheckCircle, color: 'text-green-500' },
  3: { label: '失败', icon: XCircle, color: 'text-red-500' },
}

export default function Sync() {
  const [loading, setLoading] = useState(true)
  const [syncLoading, setSyncLoading] = useState(false)
  const [status, setStatus] = useState<any>(null)
  const [tasks, setTasks] = useState<any[]>([])
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [statusRes, tasksRes] = await Promise.all([
        getSyncStatus(),
        getSyncTasks(10, 0),
      ])
      if (statusRes.code === 0) setStatus(statusRes.data)
      if (tasksRes.code === 0) setTasks(tasksRes.data?.tasks || [])
    } catch { /* 静默 */ }
    setLoading(false)
  }

  async function handleSync(taskType: string) {
    setMessage(null)
    setSyncLoading(true)
    try {
      const res = await triggerSync(taskType)
      if (res.code === 0) {
        setMessage({ type: 'success', text: `${TASK_TYPES[taskType] || taskType} 同步任务已启动` })
        loadData()
      } else {
        setMessage({ type: 'error', text: res.message || '启动同步失败' })
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || '网络错误' })
    } finally {
      setSyncLoading(false)
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
      <h2 className="text-xl font-semibold text-gray-800">数据同步</h2>

      {message && (
        <div className={`p-3 rounded-lg text-sm ${
          message.type === 'success' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100'
        }`}>
          {message.text}
        </div>
      )}

      {/* 同步状态 */}
      {status && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <h3 className="text-sm font-medium text-gray-600 mb-3">同步概览</h3>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(status).filter(([key]) => key.endsWith('_status')).map(([key, val]: [string, any]) => {
              const typeName = key.replace('_status', '')
              return (
                <div key={key} className="p-2.5 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-400">{TASK_TYPES[typeName] || typeName}</div>
                  <div className="text-sm font-medium text-gray-700 mt-0.5">
                    {val.record_count != null ? `${val.record_count} 条` : '未同步'}
                  </div>
                  {val.last_sync_at && (
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      {new Date(val.last_sync_at).toLocaleDateString()}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 手动同步 */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-medium text-gray-600 mb-3">手动同步</h3>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(TASK_TYPES).map(([key, label]) => (
            <Button
              key={key}
              onClick={() => handleSync(key)}
              loading={syncLoading}
              variant="outline"
              className="text-xs !py-2"
            >
              <RefreshCw size={14} />
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* 最近任务 */}
      <div>
        <h3 className="text-sm font-medium text-gray-600 mb-3">最近同步任务</h3>
        {tasks.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-8">暂无同步记录</p>
        ) : (
          <div className="space-y-2">
            {tasks.map((task: any, i: number) => {
              const statusInfo = STATUS_MAP[task.status] || STATUS_MAP[0]
              const StatusIcon = statusInfo.icon
              return (
                <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <StatusIcon size={16} className={`${statusInfo.color} ${task.status === 1 ? 'animate-spin' : ''}`} />
                      <span className="text-sm font-medium text-gray-700">
                        {TASK_TYPES[task.task_type] || task.task_type}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {task.created_at ? new Date(task.created_at).toLocaleString() : ''}
                    </span>
                  </div>
                  <div className="mt-2 flex gap-3 text-xs text-gray-400">
                    <span>状态: {statusInfo.label}</span>
                    {task.total_users != null && <span>总人数: {task.total_users}</span>}
                    {task.success_users != null && <span>成功: {task.success_users}</span>}
                  </div>
                </div>
              )
            })}
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
