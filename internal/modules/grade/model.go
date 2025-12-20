package grade

// Grade 成绩信息
type Grade struct {
	SerialNo string  `json:"serialNo"` // 序号
	Term     string  `json:"Year"`     // 学期
	Code     string  `json:"Code"`     // 课程代码
	Subject  string  `json:"subject"`  // 课程名称
	Score    string  `json:"score"`    // 分数
	Credit   float64 `json:"credit"`   // 学分
	Gpa      float64 `json:"gpa"`      // 绩点
	Status   int     `json:"Status"`   // 状态：0=正常考试，1=补考/重修
	Property string  `json:"property"` // 课程性质：必修/选修
}

// GPA 绩点信息
type GPA struct {
	AverageGPA   float64 `json:"averageGPA"`   // 平均绩点
	AverageScore float64 `json:"averageScore"` // 平均分
	BasicScore   float64 `json:"basicScore"`   // 基本分
}

// LevelGrade 等级考试成绩
type LevelGrade struct {
	No         string `json:"no"`         // 序号
	CourseName string `json:"CourseName"` // 考试名称
	LevGrade   string `json:"LevelGrade"` // 成绩/等级
	Time       string `json:"Time"`       // 考试时间
}

// GetGradesRequest 获取成绩请求
type GetGradesRequest struct {
	Term string `form:"term"` // 学期（可选），格式：2024-2025-1
}

// GradesResponse 成绩响应
type GradesResponse struct {
	Grades []Grade `json:"grades"`
	GPA    *GPA    `json:"gpa"`
}

// TermGradesData 单个学期的成绩数据
type TermGradesData struct {
	Term   string  `json:"term"`   // 学期
	Grades []Grade `json:"grades"` // 成绩列表（仅在详细查询时返回）
	GPA    *GPA    `json:"gpa"`    // GPA统计
}

// TermsGradesAnalysis 多学期成绩分析
type TermsGradesAnalysis struct {
	CurrentTerm   string           `json:"current_term"`   // 当前学期
	TermsData     []TermGradesData `json:"terms_data"`     // 各学期数据
	OverallGPA    *GPA             `json:"overall_gpa"`    // 总体GPA
	TrendAnalysis *TrendAnalysis   `json:"trend_analysis"` // 趋势分析
}

// TrendAnalysis 趋势分析
type TrendAnalysis struct {
	GPATrend     string  `json:"gpa_trend"`      // GPA趋势：上升/下降/稳定
	ScoreTrend   string  `json:"score_trend"`    // 成绩趋势
	BestTerm     string  `json:"best_term"`      // 最好的学期
	BestTermGPA  float64 `json:"best_term_gpa"`  // 最好学期的GPA
	WorstTerm    string  `json:"worst_term"`     // 最差的学期
	WorstTermGPA float64 `json:"worst_term_gpa"` // 最差学期的GPA
}
