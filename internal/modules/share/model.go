package share

// ShareToken 分享令牌（编码到链接参数中）
type ShareToken struct {
	Uid  int    `json:"u"`
	Term string `json:"t"`
	Week int    `json:"w"`
}

// CreateShareRequest 创建分享链接请求
type CreateShareRequest struct {
	Term string `json:"term" binding:"required"`              // 学期
	Week int    `json:"week" binding:"required,min=1,max=20"` // 周次
}

// CreateShareResponse 创建分享链接响应
type CreateShareResponse struct {
	Token string `json:"token"` // 分享token
}

// SharedCourseResponse 查看分享的课程表响应
type SharedCourseResponse struct {
	UserName string      `json:"user_name"` // 分享者昵称
	Term     string      `json:"term"`
	Week     int         `json:"week"`
	Schedule interface{} `json:"schedule"` // 课程表数据
}
