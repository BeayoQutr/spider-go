package ranking

import (
	"net/http"
	"spider-go/internal/common"

	"github.com/gin-gonic/gin"
)

// Handler 排名处理器
type Handler struct {
	service Service
}

// NewHandler 创建处理器实例
func NewHandler(service Service) *Handler {
	return &Handler{service: service}
}

// RegisterRoutes 注册路由
func (h *Handler) RegisterRoutes(r *gin.RouterGroup) {
	// 用户端路由（需要认证）
	r.GET("/ranking/my", h.GetMyRanking)
	r.GET("/ranking/list", h.GetRankingList)
	r.GET("/ranking/colleges", h.GetAllColleges)
}

// @Summary 获取我的排名
// @Description 获取当前用户的GPA排名信息
// @Tags Ranking
// @Accept json
// @Produce json
// @Param statistics_type query string false "统计类型: cumulative(累计) 或 semester(学期)"
// @Param statistics_term query string false "统计学期(如2024-2025-1)"
// @Success 200 {object} RankingResponse
// @Router /ranking/my [get]
func (h *Handler) GetMyRanking(c *gin.Context) {
	uid, ok := c.Get("uid")
	if !ok {
		common.ErrorWithAppError(c, common.NewAppError(common.CodeUnauthorized, "未授权"))
		return
	}

	var req GetRankingRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		common.ErrorWithAppError(c, common.NewAppError(common.CodeInvalidParams, "参数错误"))
		return
	}

	// 默认值
	if req.StatisticsType == "" {
		req.StatisticsType = StatisticsTypeCumulative
	}
	if req.StatisticsType == StatisticsTypeCumulative {
		req.StatisticsTerm = "all"
	}

	resp, err := h.service.GetStudentRanking(c.Request.Context(), uid.(int), req.StatisticsType, req.StatisticsTerm)
	if err != nil {
		common.ErrorWithAppError(c, common.NewAppError(common.CodeInternalError, "获取排名失败"))
		return
	}

	common.Success(c, resp)
}

// @Summary 获取排名列表
// @Description 获取GPA排名列表（支持按学院、专业、年级、班级筛选）
// @Tags Ranking
// @Accept json
// @Produce json
// @Param college query string false "学院筛选"
// @Param major query string false "专业筛选"
// @Param grade query string false "年级筛选"
// @Param class query string false "班级筛选"
// @Param statistics_type query string true "统计类型: cumulative 或 semester"
// @Param statistics_term query string false "统计学期"
// @Param page query int true "页码"
// @Param page_size query int true "每页数量"
// @Param order_by query string false "排序字段: gpa, college_rank, major_rank"
// @Success 200 {object} RankingListResponse
// @Router /ranking/list [get]
func (h *Handler) GetRankingList(c *gin.Context) {
	var req RankingListRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		common.ErrorWithAppError(c, common.NewAppError(common.CodeInvalidParams, "参数错误"))
		return
	}

	// 默认值
	if req.StatisticsType == StatisticsTypeCumulative {
		req.StatisticsTerm = "all"
	}

	resp, err := h.service.GetRankingList(c.Request.Context(), &req)
	if err != nil {
		common.ErrorWithAppError(c, common.NewAppError(common.CodeInternalError, "获取排名列表失败"))
		return
	}

	common.Success(c, resp)
}

// @Summary 获取所有学院列表
// @Description 获取系统中所有学院的列表
// @Tags Ranking
// @Accept json
// @Produce json
// @Success 200 {object} []string
// @Router /ranking/colleges [get]
func (h *Handler) GetAllColleges(c *gin.Context) {
	colleges, err := h.service.GetAllColleges(c.Request.Context())
	if err != nil {
		common.ErrorWithAppError(c, common.NewAppError(common.CodeInternalError, "获取学院列表失败"))
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": common.CodeSuccess,
		"data": colleges,
	})
}
