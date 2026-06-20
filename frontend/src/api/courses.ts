import { apiClient } from './client'

export interface Course {
  name: string
  teacher: string
  classroom: string
  weekday: number
  start_period: number
  end_period: number
}

export interface DaySchedule {
  weekday: number
  courses: Course[]
}

export interface WeekSchedule {
  weekno: number
  starttime: string
  endtime: string
  days: DaySchedule[]
}

/** 获取课程表 */
export async function getCourses(term: string, week: number) {
  const res = await apiClient.get<{ code: number; data: WeekSchedule }>(
    '/user/courses',
    { params: { term, week } },
  )
  return res.data
}
