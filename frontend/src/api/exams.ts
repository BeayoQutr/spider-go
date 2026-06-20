import { apiClient } from './client'

export interface Exam {
  course_name: string
  exam_date: string
  exam_time: string
  location: string
  seat_no: string
  exam_type: string
}

/** 获取考试安排 */
export async function getExams(term: string) {
  const res = await apiClient.get<{ code: number; data: Exam[] }>(
    '/user/exams',
    { params: { term } },
  )
  return res.data
}
