import axios from 'axios'

const publicClient = axios.create({
  baseURL: '/api',
  timeout: 15000,
})

export interface Notice {
  id: number
  title: string
  content: string
  created_at: string
  updated_at: string
}

/** 获取通知列表 */
export async function getNotices() {
  const res = await publicClient.get<{ code: number; data: Notice[] }>('/notices')
  return res.data
}

/** 获取通知详情 */
export async function getNoticeDetail(id: number) {
  const res = await publicClient.get<{ code: number; data: Notice }>(`/notices/${id}`)
  return res.data
}
