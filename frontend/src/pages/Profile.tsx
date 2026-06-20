import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { getUserInfo, bindJwc, bindJwcWithCookies, getBindStatus } from '../api/user'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import { User, LogOut, Shield, ChevronRight, AlertCircle, Cookie } from 'lucide-react'

export default function Profile() {
  const navigate = useNavigate()
  const authUser = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const logout = useAuthStore((s) => s.logout)

  const [loading, setLoading] = useState(true)
  const [bindStatus, setBindStatus] = useState<any>(null)
  const [showBind, setShowBind] = useState<'password' | 'cookie' | null>(null)
  const [sid, setSid] = useState('')
  const [spwd, setSpwd] = useState('')
  const [cookieJson, setCookieJson] = useState('')
  const [bindError, setBindError] = useState('')
  const [bindSuccess, setBindSuccess] = useState('')
  const [bindLoading, setBindLoading] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [infoRes, bindRes] = await Promise.all([
        getUserInfo(),
        getBindStatus(),
      ])
      if (infoRes.code === 0) setUser(infoRes.data)
      if (bindRes.code === 0) setBindStatus(bindRes.data)
    } catch { /* 静默 */ }
    setLoading(false)
  }

  // 密码绑定
  const handleBind = async (e: React.FormEvent) => {
    e.preventDefault()
    setBindError('')
    setBindSuccess('')

    if (!sid.trim() || !spwd.trim()) {
      setBindError('请填写学号和教务系统密码')
      return
    }

    setBindLoading(true)
    try {
      const res = await bindJwc(sid.trim(), spwd)
      if (res.code === 0) {
        setBindSuccess('绑定成功')
        setShowBind(null)
        loadData()
      } else {
        setBindError(res.message || '绑定失败')
      }
    } catch (err: any) {
      setBindError(err.response?.data?.message || '绑定失败，请稍后重试')
    } finally {
      setBindLoading(false)
    }
  }

  // Cookie 绑定
  const handleCookieBind = async (e: React.FormEvent) => {
    e.preventDefault()
    setBindError('')
    setBindSuccess('')

    if (!sid.trim()) {
      setBindError('请填写学号')
      return
    }

    let cookies: Record<string, string>
    try {
      cookies = JSON.parse(cookieJson.trim())
      if (Object.keys(cookies).length === 0) throw new Error('empty')
    } catch {
      setBindError('Cookie 格式错误，请输入有效的 JSON 对象')
      return
    }

    setBindLoading(true)
    try {
      const res = await bindJwcWithCookies(sid.trim(), cookies)
      if (res.code === 0) {
        setBindSuccess('Cookie 绑定成功！现在可以查询成绩和课程了')
        setShowBind(null)
        loadData()
      } else {
        setBindError(res.message || '绑定失败')
      }
    } catch (err: any) {
      setBindError(err.response?.data?.message || '绑定失败，请稍后重试')
    } finally {
      setBindLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
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
      <h2 className="text-xl font-semibold text-gray-800">个人信息</h2>

      {/* 用户信息卡片 */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center">
            <User size={28} className="text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-800 truncate">{authUser?.name || '未知'}</h3>
            <p className="text-sm text-gray-400 truncate">{authUser?.email}</p>
            {authUser?.sid && <p className="text-xs text-gray-300 truncate">学号: {authUser.sid}</p>}
          </div>
        </div>
      </div>

      {/* 教务系统绑定 */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-medium text-gray-600 mb-3">教务系统绑定</h3>

        {bindStatus?.is_bound ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-green-700">已绑定</span>
            </div>
            <p className="text-sm text-gray-500">学号: {bindStatus.current_sid}</p>
            {bindStatus.last_bind_at && (
              <p className="text-xs text-gray-400">绑定时间: {new Date(bindStatus.last_bind_at).toLocaleDateString()}</p>
            )}
            <p className="text-xs text-gray-400">总绑定次数: {bindStatus.total_bind_count}</p>
            {!bindStatus.can_change_sid && (
              <div className="flex items-start gap-2 mt-3 p-3 bg-amber-50 rounded-lg">
                <AlertCircle size={16} className="text-amber-500 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-600">本月绑定次数已达上限，无法更换学号</p>
              </div>
            )}
          </div>
        ) : !showBind ? (
          <div>
            <p className="text-sm text-gray-400 mb-4">未绑定教务系统，选择一种绑定方式：</p>
            <div className="space-y-2">
              <button
                onClick={() => setShowBind('cookie')}
                className="w-full flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-700 hover:bg-blue-100 transition-colors"
              >
                <Cookie size={18} />
                <div className="text-left">
                  <div className="font-medium">Cookie 绑定（推荐）</div>
                  <div className="text-xs text-blue-500">浏览器登录后复制 Cookie，绕过 MFA</div>
                </div>
              </button>
              <button
                onClick={() => setShowBind('password')}
                className="w-full flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <Shield size={18} />
                <div className="text-left">
                  <div className="font-medium">密码绑定</div>
                  <div className="text-xs text-gray-400">直接输入教务系统密码</div>
                </div>
              </button>
            </div>
          </div>
        ) : showBind === 'cookie' ? (
          <form onSubmit={handleCookieBind} className="space-y-3">
            {bindError && (
              <div className="p-2.5 bg-red-50 border border-red-100 rounded-lg text-xs text-red-600">{bindError}</div>
            )}
            {bindSuccess && (
              <div className="p-2.5 bg-green-50 border border-green-100 rounded-lg text-xs text-green-600">{bindSuccess}</div>
            )}

            <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-700 space-y-1">
              <p className="font-medium">📋 如何获取 Cookie：</p>
              <p>1. 浏览器登录 <b>webvpn.csuft.edu.cn</b></p>
              <p>2. 按 <b>F12</b> → <b>Console</b>（控制台）</p>
              <p>3. 粘贴以下代码 → 回车，Cookie 已复制到剪贴板：</p>
              <code className="block bg-amber-100 px-2 py-1 rounded text-[10px] mt-1 break-all select-all">
                copy(JSON.stringify(Object.fromEntries(document.cookie.split('; ').map(c =&gt; c.split('=').map(decodeURIComponent)))))
              </code>
            </div>

            <Input label="学号" placeholder="教务系统学号" value={sid} onChange={(e) => setSid(e.target.value)} />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Cookie（JSON 格式）</label>
              <textarea
                value={cookieJson}
                onChange={(e) => setCookieJson(e.target.value)}
                rows={4}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-xs font-mono outline-none focus:border-blue-500 resize-none"
                placeholder='{"JSESSIONID":"abc123...","route":"xxx..."}'
              />
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setShowBind(null)}>取消</Button>
              <Button type="submit" loading={bindLoading}>Cookie 绑定</Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleBind} className="space-y-3">
            {bindError && (
              <div className="p-2.5 bg-red-50 border border-red-100 rounded-lg text-xs text-red-600">{bindError}</div>
            )}
            {bindSuccess && (
              <div className="p-2.5 bg-green-50 border border-green-100 rounded-lg text-xs text-green-600">{bindSuccess}</div>
            )}
            <Input label="学号" placeholder="教务系统学号" value={sid} onChange={(e) => setSid(e.target.value)} />
            <Input label="教务系统密码" type="password" placeholder="教务系统密码" value={spwd} onChange={(e) => setSpwd(e.target.value)} />
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setShowBind(null)}>取消</Button>
              <Button type="submit" loading={bindLoading}>绑定</Button>
            </div>
          </form>
        )}
      </div>

      {/* 功能列表 */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {[
          { icon: Shield, label: '排名查询', to: '/ranking' },
          { icon: Shield, label: '数据同步', to: '/sync' },
        ].map(({ icon: Icon, label, to }) => (
          <button
            key={to}
            onClick={() => navigate(to)}
            className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
          >
            <div className="flex items-center gap-3">
              <Icon size={18} className="text-gray-400" />
              <span className="text-sm text-gray-700">{label}</span>
            </div>
            <ChevronRight size={16} className="text-gray-300" />
          </button>
        ))}
      </div>

      {/* 退出登录 */}
      <button
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-red-100 rounded-xl text-sm text-red-500 hover:bg-red-50 transition-colors"
      >
        <LogOut size={16} />
        退出登录
      </button>
    </div>
  )
}
