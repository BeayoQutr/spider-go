package app

import (
	"fmt"
	"spider-go/internal/modules/admin"
	"spider-go/internal/modules/notice"
	"spider-go/internal/modules/ranking"
	"spider-go/internal/modules/reconciliation"
	"spider-go/internal/modules/user"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

// InitDBWithConfig 使用配置初始化数据库
func InitDBWithConfig(config *Config) (*gorm.DB, error) {
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%d)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		config.Database.User, config.Database.Pass, config.Database.Host, config.Database.Port, config.Database.Name)

	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, err
	}

	// 自动迁移（使用新模块中的模型）
	// 注意：先迁移被引用的表（User），再迁移引用它的表（UserWeChatMiniProgram）
	if err := db.AutoMigrate(
		&user.User{},
		&notice.Notice{},
		&admin.Admin{},
		&user.UserWeChatMiniProgram{},
		&notice.Introduction{},
		&user.JwcBindLog{}, // 绑定日志表
		// 对账/同步模块表
		&reconciliation.SyncTask{},
		&reconciliation.SyncLog{},
		&reconciliation.Grade{},
		&reconciliation.RegularGrade{},
		&reconciliation.Exam{},
		&reconciliation.LevelExam{},
		&reconciliation.Course{},
		&reconciliation.UserSyncStatus{},
		&ranking.StudentGPA{}, // 学生GPA数据（排名实时计算）
	); err != nil {
		return nil, err
	}

	return db, nil
}
