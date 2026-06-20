import { apiClient } from './client'

/** 获取教评任务列表 */
export async function getEvaluationTasks() {
  const res = await apiClient.get('/user/evaluation/tasks')
  return res.data
}

/** 获取待评课程列表 */
export async function getEvaluationCourses(taskId: number) {
  const res = await apiClient.get('/user/evaluation/courses', { params: { taskid: taskId } })
  return res.data
}

/** 获取评教题目 */
export async function getEvaluationQuestions(indexId: string, pjCourseType: string) {
  const res = await apiClient.get('/user/evaluation/questions', {
    params: { indexid: indexId, pjcoursetype: pjCourseType },
  })
  return res.data
}

/** 提交评教 */
export async function submitEvaluation(data: any[]) {
  const res = await apiClient.post('/user/evaluation/submit', data)
  return res.data
}

/** 自动评教 */
export async function autoEvaluation() {
  const res = await apiClient.post('/user/evaluation/auto')
  return res.data
}

/** 查看评教状态 */
export async function getEvaluationStatus() {
  const res = await apiClient.get('/user/evaluation/status')
  return res.data
}
