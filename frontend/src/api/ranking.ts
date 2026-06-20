import { apiClient } from './client'

/** 获取我的排名 */
export async function getMyRanking(statisticsType?: string, statisticsTerm?: string) {
  const params: Record<string, string> = {}
  if (statisticsType) params.statistics_type = statisticsType
  if (statisticsTerm) params.statistics_term = statisticsTerm
  const res = await apiClient.get('/user/ranking/my', { params })
  return res.data
}
