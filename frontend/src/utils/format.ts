/**
 * 格式化工具函数
 */

/** 格式化日期为 yyyy-MM-dd */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 格式化学期号，如 "2024-2025-1" → "2024-2025 第一学期" */
export function formatTerm(term: string): string {
  const parts = term.split('-')
  if (parts.length !== 3) return term
  const semesters: Record<string, string> = { '1': '第一学期', '2': '第二学期' }
  return `${parts[0]}-${parts[1]} ${semesters[parts[2]] || parts[2]}`
}

/** 格式化分数（保留最多一位小数） */
export function formatScore(score: number | string): string {
  const n = typeof score === 'string' ? parseFloat(score) : score
  if (isNaN(n)) return String(score)
  return n % 1 === 0 ? String(n) : n.toFixed(1)
}

/** GPA 颜色映射 */
export function gpaColor(gpa: number): string {
  if (gpa >= 4.0) return 'text-green-500'
  if (gpa >= 3.0) return 'text-blue-500'
  if (gpa >= 2.0) return 'text-yellow-500'
  return 'text-red-500'
}
