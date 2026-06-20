import { useEffect, useState } from 'react'
import { adminGetNotices, adminCreateNotice, adminUpdateNotice, adminDeleteNotice } from '../../api/admin'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import { Plus, Edit2, Trash2, X, CheckCircle } from 'lucide-react'

interface NoticeItem {
  id: number
  title: string
  content: string
  created_at: string
}

export default function AdminNotices() {
  const [loading, setLoading] = useState(true)
  const [notices, setNotices] = useState<NoticeItem[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<NoticeItem | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      const res = await adminGetNotices()
      if (res.code === 0) setNotices(res.data || [])
    } catch { /* 静默 */ }
    setLoading(false)
  }

  function openCreate() {
    setEditing(null)
    setTitle('')
    setContent('')
    setShowForm(true)
    setMessage(null)
  }

  function openEdit(notice: NoticeItem) {
    setEditing(notice)
    setTitle(notice.title)
    setContent(notice.content)
    setShowForm(true)
    setMessage(null)
  }

  async function handleSave() {
    if (!title.trim() || !content.trim()) return
    setSaving(true)
    setMessage(null)
    try {
      let res
      if (editing) {
        res = await adminUpdateNotice(editing.id, title.trim(), content.trim())
      } else {
        res = await adminCreateNotice(title.trim(), content.trim())
      }
      if (res.code === 0) {
        setMessage({ type: 'success', text: editing ? '更新成功' : '创建成功' })
        setShowForm(false)
        loadData()
      } else {
        setMessage({ type: 'error', text: res.message || '操作失败' })
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || '网络错误' })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('确定删除此通知？')) return
    try {
      const res = await adminDeleteNotice(id)
      if (res.code === 0) {
        setMessage({ type: 'success', text: '已删除' })
        loadData()
      } else {
        setMessage({ type: 'error', text: res.message || '删除失败' })
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
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800">通知管理</h2>
        <button onClick={openCreate} className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus size={16} /> 新建
        </button>
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
          {message.text}
        </div>
      )}

      {/* 编辑表单 */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-700">{editing ? '编辑通知' : '新建通知'}</h3>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
          </div>
          <Input label="标题" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="通知标题" />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">内容</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500 resize-none"
              placeholder="通知内容..."
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} loading={saving}>{editing ? '保存' : '创建'}</Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>取消</Button>
          </div>
        </div>
      )}

      {/* 通知列表 */}
      {notices.length === 0 ? (
        <p className="text-center text-gray-400 py-8">暂无通知</p>
      ) : (
        <div className="space-y-2">
          {notices.map((n) => (
            <div key={n.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-gray-800 truncate">{n.title}</h4>
                  <p className="text-xs text-gray-400 mt-1">{n.created_at ? new Date(n.created_at).toLocaleDateString() : ''}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openEdit(n)} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                    <Edit2 size={15} />
                  </button>
                  <button onClick={() => handleDelete(n.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
