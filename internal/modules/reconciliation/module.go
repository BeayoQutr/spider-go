package reconciliation

import (
	"spider-go/internal/cache"
	"spider-go/internal/modules/course"
	"spider-go/internal/modules/exam"
	"spider-go/internal/modules/grade"
	"spider-go/internal/modules/ranking"
	"spider-go/internal/modules/user"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// Module 对账模块
type Module struct {
	handler *Handler
	service Service
}

// NewModule 创建对账模块
func NewModule(db *gorm.DB, gradeService grade.Service, examService exam.Service, courseService course.Service, configCache cache.ConfigCache, rankingService ranking.Service) *Module {
	repo := NewRepository(db)
	service := NewService(repo, gradeService, examService, courseService, configCache, rankingService)
	handler := NewHandler(service)

	return &Module{
		handler: handler,
		service: service,
	}
}

// RegisterRoutes 注册路由
func (m *Module) RegisterRoutes(r *gin.RouterGroup) {
	m.handler.RegisterRoutes(r)
}

// RegisterAdminRoutes 注册管理员路由
func (m *Module) RegisterAdminRoutes(r *gin.RouterGroup, userRepo user.Repository) {
	m.handler.SetUserRepo(userRepo)
	m.handler.RegisterAdminRoutes(r)
}

// GetService 获取服务（用于其他模块注入或调度器）
func (m *Module) GetService() Service {
	return m.service
}
