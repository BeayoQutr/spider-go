import { useEffect, useState } from 'react'
import { adminSyncAll, adminSyncTasks, optimizeSyncTables } from '../../api/admin'
import Button from '../../components/ui/Button'
import { RefreshCw, Zap, Database, CheckCircle, XCircle, Clock, Loader } from 'lucide-react'

const TASK_TYPES: Record<string, string> = {
  all: '全部', grade: '成绩', regular_grade: '平时分',
  exam: '考试', level_exam: '等级考试', course: '课程表',
}
const STATUS_MAP: Record<number, { label: string; icon: typeof CheckCircle; color: string }> = {
  0: { label: '待执行', icon: Clock, color: 'text-gray-400' },
  1: { label: '执行中', icon: Loader, color: 'text-blue-500' },
  2: { label: '成功', icon: CheckCircle, color: 'text-green-500' },
  3: { label: '失败', icon: XCircle, color: 'text-red-500' },
}

export default function AdminSync() {
  const [loading, setLoading] = useState(true)
  const [syncLoading, setSyncLoading] = useState<string | null>(null)
  const [tasks, setTasks] = useState<any[]>([])
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      const res = await adminSyncTasks(20, 0)
      if (res.code === 0) setTasks(res.data?.tasks || [])
    } catch { /* 静默 */ }
    setLoading(false)
  }

  async function handleSyncAll(taskType: string) {
    setMessage(null)
    setSyncLoading(taskType)
    try {
      const res = await adminSyncAll(taskType)
      if (res.code === 0) {
        setMessage({ type: 'success', text: `全量「${TASK_TYPES[taskType]}」同步已启动，共 ${res.data?.total_users ?? '?'} 名用户` })
        loadData()
      } else {
        setMessage({ type: 'error', text: res.message || '启动失败' })
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || '网络错误' })
    } finally {
      setSyncLoading(null)
    }
  }

  async function handleOptimize() {
    if (!confirm('OPTIMIZE TABLE 会锁表，建议低峰期执行。确定继续？')) return
    setMessage(null)
    try {
      const res = await optimizeSyncTables()
      if (res.code === 0) {
        setMessage({ type: 'success', text: '优化完成' })
      } else {
        setMessage({ type: 'error', text: res.message || '优化失败' })
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || '网络错误' })
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" /></div>
  }

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold text-gray-800">数据同步</h2>

      {message && (
        <div className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
          {message.text}
        </div>
      )}

      {/* 全量同步 */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-medium text-gray-600 mb-3">全量同步所有用户</h3>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(TASK_TYPES).map(([key, label]) => (
            <Button
              key={key}
              onClick={() => handleSyncAll(key)}
              loading={syncLoading === key}
              variant="outline"
              className="text-xs !py-2"
            >
              <RefreshCw size={14} />
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* 优化 */}
      <button
        onClick={handleOptimize}
        className="w-full flex items-center justify-center gap-2 py-3 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-700 hover:bg-amber-100 transition-colors"
      >
        <Database size={16} />
        优化同步表 (OPTIMIZE TABLE)
      </button>

      {/* 最近任务 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-600">最近同步任务</h3>
          <button onClick={loadData} className="text-gray-400 hover:text-gray-600">
            <RefreshCw size={14} />
          </button>
        </div>
        {tasks.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-8">暂无同步记录</p>
        ) : (
          <div className="space-y-2">
            {tasks.map((task: any, i: number) => {
              const st = STATUS_MAP[task.status] || STATUS_MAP[0]
              const Icon = st.icon
              return (
                <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon size={16} className={`${st.color} ${task.status === 1 ? 'animate-spin' : ''}`} />
                      <span className="text-sm font-medium text-gray-700">{TASK_TYPES[task.task_type] || task.task_type}</span>
                      <span className="text-xs text-gray-400">{st.label}</span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {task.created_at ? new Date(task.created_at).toLocaleString() : ''}
                    </span>
                  </div>
                  <div className="mt-2 flex gap-3 text-xs text-gray-400">
                    <span>总用户: {task.total_users ?? '-'}</span>
                    <span>成功: {task.success_users ?? '-'}</span>
                    <span>新增: {task.new_records ?? '-'}</span>
                    <span>更新: {task.updated_records ?? '-'}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
