package shared

import (
	"context"
	"errors"
	"spider-go/internal/common"

	"gorm.io/gorm"
)

var (
	ErrUserNotFound = common.NewAppError(common.CodeUserNotFound, "user not found")
)

// UserInfo 用户基本信息（用于跨模块查询）
type UserInfo struct {
	Uid   int    `gorm:"column:uid"`
	Email string `gorm:"column:email"`
	Sid   string `gorm:"column:sid"`  // 学号
	Spwd  string `gorm:"column:spwd"` // 教务系统密码
}

// TableName 指定表名
func (UserInfo) TableName() string {
	return "users"
}

// UserQuery 用户查询接口（用于跨模块访问用户数据）
type UserQuery interface {
	// GetUserByUid 根据UID获取用户信息
	GetUserByUid(ctx context.Context, uid int) (*UserInfo, error)
	// GetAllUserEmails 获取所有用户的邮箱
	GetAllUserEmails(ctx context.Context) ([]string, error)
	// GetAllBoundUsers 获取所有已绑定教务系统的用户
	GetAllBoundUsers(ctx context.Context) ([]UserInfo, error)
}

// userQuery 用户查询实现
type userQuery struct {
	db *gorm.DB
}

// NewUserQuery 创建用户查询服务
func NewUserQuery(db *gorm.DB) UserQuery {
	return &userQuery{db: db}
}

// GetUserByUid 根据UID获取用户信息
func (q *userQuery) GetUserByUid(ctx context.Context, uid int) (*UserInfo, error) {
	var user UserInfo
	if err := q.db.WithContext(ctx).First(&user, uid).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}
	return &user, nil
}

// GetAllUserEmails 获取所有用户的邮箱
func (q *userQuery) GetAllUserEmails(ctx context.Context) ([]string, error) {
	var emails []string
	err := q.db.WithContext(ctx).Model(&UserInfo{}).Pluck("email", &emails).Error
	if err != nil {
		return nil, err
	}
	return emails, nil
}

// GetAllBoundUsers 获取所有已绑定教务系统的用户
func (q *userQuery) GetAllBoundUsers(ctx context.Context) ([]UserInfo, error) {
	var users []UserInfo
	err := q.db.WithContext(ctx).
		Where("sid != ? AND sid IS NOT NULL", "").
		Where("spwd != ? AND spwd IS NOT NULL", "").
		Find(&users).Error
	if err != nil {
		return nil, err
	}
	return users, nil
}
