import { adminClient } from './client'
import axios from 'axios'

const publicClient = axios.create({ baseURL: '/api', timeout: 15000 })

/** 管理员登录 */
export async function adminLogin(email: string, password: string) {
  const res = await publicClient.post('/admin/login', { email, password })
  return res.data
}

/** 获取管理员信息 */
export async function getAdminInfo() {
  const res = await adminClient.get('/admin/info')
  return res.data
}

/** 修改管理员密码 */
export async function resetAdminPassword(oldPassword: string, newPassword: string) {
  const res = await adminClient.post('/admin/reset', {
    old_password: oldPassword,
    new_password: newPassword,
  })
  return res.data
}

/** 群发邮件 */
export async function broadcastEmail(subject: string, content: string) {
  const res = await adminClient.post('/admin/broadcast-email', { subject, content })
  return res.data
}

/** 管理员同步所有用户 */
export async function adminSyncAll(taskType: string) {
  const res = await adminClient.post('/admin/sync/all', { task_type: taskType })
  return res.data
}

/** 获取同步任务列表（管理员） */
export async function adminSyncTasks(limit = 20, offset = 0) {
  const res = await adminClient.get('/admin/sync/tasks', { params: { limit, offset } })
  return res.data
}

/** 获取同步任务详情（管理员） */
export async function adminSyncTaskDetail(taskId: string) {
  const res = await adminClient.get(`/admin/sync/tasks/${taskId}`)
  return res.data
}

/** 优化同步表 */
export async function optimizeSyncTables() {
  const res = await adminClient.post('/admin/sync/optimize')
  return res.data
}

/** 设置当前学期 */
export async function setCurrentTerm(term: string) {
  const res = await adminClient.post('/admin/config/term', { term })
  return res.data
}

/** 设置学期日期 */
export async function setSemesterDates(term: string, startDate: string, endDate: string) {
  const res = await adminClient.post('/admin/config/semester-dates', {
    term, start_date: startDate, end_date: endDate,
  })
  return res.data
}

// ====== 通知管理 ======

export async function adminGetNotices() {
  const res = await adminClient.get('/admin/notices')
  return res.data
}

export async function adminCreateNotice(title: string, content: string) {
  const res = await adminClient.post('/admin/notices', { title, content })
  return res.data
}

export async function adminUpdateNotice(id: number, title: string, content: string) {
  const res = await adminClient.put(`/admin/notices/${id}`, { title, content })
  return res.data
}

export async function adminDeleteNotice(id: number) {
  const res = await adminClient.delete(`/admin/notices/${id}`)
  return res.data
}

// ====== 使用须知管理 ======

export async function adminGetIntroductions() {
  const res = await adminClient.get('/admin/introductions')
  return res.data
}

export async function adminCreateIntroduction(title: string, content: string) {
  const res = await adminClient.post('/admin/introductions', { title, content })
  return res.data
}

export async function adminUpdateIntroduction(id: number, title: string, content: string) {
  const res = await adminClient.put(`/admin/introductions/${id}`, { title, content })
  return res.data
}

export async function adminDeleteIntroduction(id: number) {
  const res = await adminClient.delete(`/admin/introductions/${id}`)
  return res.data
}

// ====== 统计 ======

export async function getDau(date?: string) {
  const res = await adminClient.get('/admin/statistics/dau', { params: date ? { date } : {} })
  return res.data
}

export async function getDauRange(startDate: string, endDate: string) {
  const res = await adminClient.get('/admin/statistics/dau/range', {
    params: { start_date: startDate, end_date: endDate },
  })
  return res.data
}

export async function getUserCount() {
  const res = await adminClient.get('/admin/statistics/user/count')
  return res.data
}

export async function getNewUserCount(date?: string, startDate?: string, endDate?: string) {
  const params: Record<string, string> = {}
  if (date) params.date = date
  else if (startDate && endDate) { params.start_date = startDate; params.end_date = endDate }
  const res = await adminClient.get('/admin/statistics/user/new', { params })
  return res.data
}
