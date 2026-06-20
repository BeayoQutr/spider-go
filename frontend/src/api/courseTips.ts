import { apiClient } from './client'

export interface TeacherStat {
  teacher_name: string
  student_count: number
  average_score: number
  max_score: number
  min_score: number
  fail_rate: number
  score_distribution: {
    range_0_59: number
    range_60_69: number
    range_70_79: number
    range_80_89: number
    range_90_100: number
  }
}

/** 获取体育选修课教师统计 */
export async function getCourseTips(courseName: string) {
  const res = await apiClient.get<{ code: number; data: { course_name: string; teachers: TeacherStat[] } }>(
    '/user/course-tips',
    { params: { course_name: courseName } },
  )
  return res.data
}
