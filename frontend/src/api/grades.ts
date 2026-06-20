import { apiClient } from './client'

export interface Grade {
  serialNo: string
  term: string
  code: string
  subject: string
  score: string
  credit: number
  gpa: number
  Status: number
  property: string
  flag: string
}

interface GPA {
  averageGPA: number
  averageScore: number
  basicScore: number
}

interface GradesResponse {
  code: number
  message: string
  data: {
    grades: Grade[]
    gpa: GPA
  }
}

interface RegularResponse {
  code: number
  message: string
  data: {
    finalExamScore: string
    finalExamRatio: string
    regularScore: string
    regularRatio: string
    finalScore: string
  }
}

/** 获取成绩 */
export async function getGrades(term?: string, year?: string): Promise<GradesResponse> {
  const params: Record<string, string> = {}
  if (year) params.year = year
  else if (term) params.term = term
  const res = await apiClient.get('/user/grades', { params })
  return res.data
}

/** 获取等级考试成绩 */
export async function getLevelGrades() {
  const res = await apiClient.get('/user/grades/level')
  return res.data
}

/** 获取成绩分析 */
export async function getGradesAnalysis() {
  const res = await apiClient.get('/user/grades/analysis')
  return res.data
}

/** 获取平时分 */
export async function getRegularGrade(term: string, code: string): Promise<RegularResponse> {
  const res = await apiClient.post('/user/grades/regular', { term, code })
  return res.data
}
