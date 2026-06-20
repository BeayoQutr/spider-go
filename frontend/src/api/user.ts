import { apiClient } from './client'
import type { User } from '../stores/authStore'

interface BindStatusResponse {
  code: number
  message: string
  data: {
    is_bound: boolean
    current_sid: string
    total_bind_count: number
    last_bind_at: string
    can_change_sid: boolean
  }
}

/** 获取用户信息 */
export async function getUserInfo() {
  const res = await apiClient.get<{ code: number; data: User }>('/user/info')
  return res.data
}

/** 绑定教务系统（密码方式） */
export async function bindJwc(sid: string, spwd: string) {
  const res = await apiClient.post('/user/bind', { sid, spwd })
  return res.data
}

/** 绑定教务系统（Cookie 方式，绕过 MFA） */
export async function bindJwcWithCookies(sid: string, cookies: Record<string, string>) {
  const res = await apiClient.post('/user/bind-with-cookies', { sid, cookies })
  return res.data
}

/** 检查绑定状态 */
export async function getBindStatus(): Promise<BindStatusResponse> {
  const res = await apiClient.get('/user/bind-status')
  return res.data
}

/** 更新用户名 */
export async function updateName(name: string) {
  const res = await apiClient.post('/user/update-name', { name })
  return res.data
}

/** 更新邮箱 */
export async function updateEmail(email: string, captcha: string) {
  const res = await apiClient.post('/user/update-email', { email, captcha })
  return res.data
}
