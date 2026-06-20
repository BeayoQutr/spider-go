import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { login } from '../api/auth'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'

export default function Login() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email.trim() || !password.trim()) {
      setError('请填写邮箱和密码')
      return
    }

    setLoading(true)
    try {
      const res = await login({ email: email.trim(), password })
      if (res.code === 0) {
        setAuth(res.data.token, res.data.user)
        navigate('/dashboard', { replace: true })
      } else {
        setError(res.message || '登录失败')
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || '网络错误，请稍后重试'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="text-xl font-semibold text-center text-gray-800 mb-6">用户登录</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      <Input
        label="邮箱"
        type="email"
        placeholder="请输入邮箱"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <Input
        label="密码"
        type="password"
        placeholder="请输入密码"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <Button type="submit" loading={loading} className="mt-2">
        登录
      </Button>

      <div className="mt-4 text-center text-sm text-gray-500 space-x-4">
        <Link to="/register" className="text-blue-600 hover:text-blue-700">
          注册账号
        </Link>
        <Link to="/forgot-password" className="text-blue-600 hover:text-blue-700">
          忘记密码
        </Link>
      </div>
    </form>
  )
}
