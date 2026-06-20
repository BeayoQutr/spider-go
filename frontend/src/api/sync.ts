import { apiClient } from './client'

/** 触发同步任务 */
export async function triggerSync(taskType: string, userIds?: number[]) {
  const res = await apiClient.post('/user/sync/trigger', {
    task_type: taskType,
    user_ids: userIds || [],
  })
  return res.data
}

/** 获取同步任务列表 */
export async function getSyncTasks(limit = 20, offset = 0) {
  const res = await apiClient.get('/user/sync/tasks', { params: { limit, offset } })
  return res.data
}

/** 获取同步任务详情 */
export async function getSyncTaskDetail(taskId: string) {
  const res = await apiClient.get(`/user/sync/tasks/${taskId}`)
  return res.data
}

/** 获取用户同步状态 */
export async function getSyncStatus() {
  const res = await apiClient.get('/user/sync/status')
  return res.data
}
