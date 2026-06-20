import axios from 'axios'

const publicClient = axios.create({
  baseURL: '/api',
  timeout: 15000,
})

/** 查看分享的课程表 */
export async function getSharedCourse(code: string) {
  const res = await publicClient.get(`/share/course/${code}`)
  return res.data
}
