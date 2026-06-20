import { apiClient } from './client'

interface LoginRequest {
  email: string
  password: string
}

interface RegisterRequest {
  name: string
  email: string
  password: string
  captcha: string
}

interface ResetPasswordRequest {
  email: string
  password: string
  captcha: string
}

interface LoginResponse {
  code: number
  message: string
  data: {
    token: string
    user: {
      uid: number
      email: string
      name: string
      sid: string
      avatar: string
      created_at: string
      is_bind: boolean
    }
  }
}

interface RegisterResponse {
  code: number
  message: string
  data: {
    token: string
    message: string
  }
}

/** 用户登录 */
export async function login(data: LoginRequest) {
  const res = await apiClient.post<LoginResponse>('/user/login', data)
  return res.data
}

/** 用户注册 */
export async function register(data: RegisterRequest) {
  const res = await apiClient.post<RegisterResponse>('/user/register', data)
  return res.data
}

/** 重置密码 */
export async function resetPassword(data: ResetPasswordRequest) {
  const res = await apiClient.post('/user/reset-password', data)
  return res.data
}

/** 发送邮箱验证码（dev 环境会返回 data.captcha） */
export async function sendCaptcha(email: string) {
  const res = await apiClient.post<{ code: number; message: string; data?: { captcha?: string } }>('/captcha/send', { email })
  return res.data
}
