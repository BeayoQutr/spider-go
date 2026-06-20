import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { adminLogin } from '../../api/admin'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import { Shield } from 'lucide-react'

export default function AdminLogin() {
  const navigate = useNavigate()
  const setAdminAuth = useAuthStore((s) => s.setAdminAuth)

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
      const res = await adminLogin(email.trim(), password)
      if (res.code === 0) {
        setAdminAuth(res.data.token, res.data.admin)
        navigate('/admin', { replace: true })
      } else {
        setError(res.message || '登录失败')
      }
    } catch (err: any) {
      setError(err.response?.data?.message || '网络错误')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex items-center justify-center gap-2 mb-6">
        <Shield size={20} className="text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-800">管理员登录</h2>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      <Input label="管理员邮箱" type="email" placeholder="请输入管理员邮箱" value={email} onChange={(e) => setEmail(e.target.value)} />
      <Input label="密码" type="password" placeholder="请输入密码" value={password} onChange={(e) => setPassword(e.target.value)} />

      <Button type="submit" loading={loading} className="mt-2">
        登录
      </Button>
    </form>
  )
}
