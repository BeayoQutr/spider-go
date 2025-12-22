package evaluation

// EvaluationInfo 教评信息
type EvaluationInfo struct {
	TaskId       string `json:"task_id"`       // 任务ID
	TaskName     string `json:"task_name"`     // 任务名称
	CourseName   string `json:"course_name"`   // 课程名称
	TeacherName  string `json:"teacher_name"`  // 教师名称
	Status       string `json:"status"`        // 状态（已评、未评）
	EvaluateType string `json:"evaluate_type"` // 评价类型
	BeginTime    string `json:"begin_time"`    // 开始时间
	EndTime      string `json:"end_time"`      // 结束时间
}

// EvaluationAPIResponse 教评API响应
type EvaluationAPIResponse struct {
	Code int    `json:"code"`
	Msg  string `json:"msg"`
	Data struct {
		List []struct {
			TaskId       string `json:"taskId"`
			TaskName     string `json:"taskName"`
			CourseName   string `json:"courseName"`
			TeacherName  string `json:"teacherName"`
			Status       int    `json:"status"` // 0-未评 1-已评
			EvaluateType string `json:"evaluateType"`
			BeginTime    string `json:"beginTime"`
			EndTime      string `json:"endTime"`
		} `json:"list"`
		Total int `json:"total"`
	} `json:"data"`
}
