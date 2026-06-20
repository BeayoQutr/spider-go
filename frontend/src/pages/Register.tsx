import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { register, sendCaptcha } from '../api/auth'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'

export default function Register() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [captcha, setCaptcha] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [sendingCaptcha, setSendingCaptcha] = useState(false)
  const [countdown, setCountdown] = useState(0)

  // 验证码倒计时
  useEffect(() => {
    if (countdown <= 0) return
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [countdown])

  const handleSendCaptcha = async () => {
    if (!email.trim()) {
      setError('请先输入邮箱')
      return
    }
    setError('')
    setSendingCaptcha(true)
    try {
      const res = await sendCaptcha(email.trim())
      if (res.code === 0) {
        // dev 环境：验证码直接返回
        if (res.data?.captcha) {
          setCaptcha(res.data.captcha)
          setSuccess(`验证码已自动填充: ${res.data.captcha}`)
        } else {
          setSuccess('验证码已发送，请查收邮箱')
        }
        setCountdown(60)
      } else {
        setError(res.message || '发送失败')
      }
    } catch (err: any) {
      setError(err.response?.data?.message || '发送失败，请稍后重试')
    } finally {
      setSendingCaptcha(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!name.trim() || !email.trim() || !password.trim() || !captcha.trim()) {
      setError('请填写所有字段')
      return
    }
    if (password.length < 6) {
      setError('密码至少 6 位')
      return
    }

    setLoading(true)
    try {
      const res = await register({
        name: name.trim(),
        email: email.trim(),
        password,
        captcha: captcha.trim(),
      })
      if (res.code === 0) {
        setAuth(res.data.token, { uid: 0, email: email.trim(), name: name.trim(), sid: '', avatar: '', created_at: '', is_bind: false })
        navigate('/dashboard', { replace: true })
      } else {
        setError(res.message || '注册失败')
      }
    } catch (err: any) {
      setError(err.response?.data?.message || '网络错误，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="text-xl font-semibold text-center text-gray-800 mb-6">用户注册</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">{error}</div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-100 rounded-lg text-sm text-green-600">{success}</div>
      )}

      <Input label="用户名" placeholder="给自己取个名字吧" value={name} onChange={(e) => setName(e.target.value)} />
      <Input label="邮箱" type="email" placeholder="请输入邮箱" value={email} onChange={(e) => setEmail(e.target.value)} />
      <Input label="密码" type="password" placeholder="至少 6 位密码" value={password} onChange={(e) => setPassword(e.target.value)} />

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1.5">验证码</label>
        <div className="flex gap-2">
          <input
            className="flex-1 px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500"
            placeholder="请输入验证码"
            value={captcha}
            onChange={(e) => setCaptcha(e.target.value)}
          />
          <button
            type="button"
            onClick={handleSendCaptcha}
            disabled={sendingCaptcha || countdown > 0}
            className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            {sendingCaptcha ? '发送中...' : countdown > 0 ? `${countdown}s` : '发送验证码'}
          </button>
        </div>
      </div>

      <Button type="submit" loading={loading} className="mt-2">
        注册
      </Button>

      <p className="mt-4 text-center text-sm text-gray-500">
        已有账号？
        <Link to="/login" className="text-blue-600 hover:text-blue-700 ml-1">去登录</Link>
      </p>
    </form>
  )
}
