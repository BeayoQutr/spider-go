import { useEffect, useState } from 'react'
import { getNotices, getNoticeDetail, type Notice } from '../api/notices'
import { Bell, ChevronLeft, Clock } from 'lucide-react'

export default function Notices() {
  const [loading, setLoading] = useState(true)
  const [notices, setNotices] = useState<Notice[]>([])
  const [selected, setSelected] = useState<Notice | null>(null)

  useEffect(() => {
    loadNotices()
  }, [])

  async function loadNotices() {
    setLoading(true)
    try {
      const res = await getNotices()
      if (res.code === 0) setNotices(res.data || [])
    } catch { /* 静默 */ }
    setLoading(false)
  }

  async function openDetail(id: number) {
    try {
      const res = await getNoticeDetail(id)
      if (res.code === 0) setSelected(res.data)
    } catch { /* 静默 */ }
  }

  // 详情视图
  if (selected) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setSelected(null)}
          className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ChevronLeft size={16} />
          返回列表
        </button>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-lg font-semibold text-gray-800 mb-1">{selected.title}</h2>
          <p className="text-xs text-gray-400 mb-4">
            {selected.created_at ? new Date(selected.created_at).toLocaleDateString() : ''}
          </p>
          <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
            {selected.content}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold text-gray-800">系统通知</h2>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      ) : notices.length === 0 ? (
        <div className="text-center py-16">
          <Bell size={44} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-400">暂无通知</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notices.map((notice) => (
            <button
              key={notice.id}
              onClick={() => openDetail(notice.id)}
              className="w-full bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-left hover:shadow-md transition-shadow"
            >
              <h3 className="text-sm font-medium text-gray-800 truncate">{notice.title}</h3>
              <div className="flex items-center gap-1 mt-1.5 text-xs text-gray-400">
                <Clock size={12} />
                {notice.created_at ? new Date(notice.created_at).toLocaleDateString() : ''}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
