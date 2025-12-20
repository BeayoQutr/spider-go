package user

import (
	"context"
	"errors"
	"spider-go/internal/common"

	"gorm.io/gorm"
)

var (
	ErrUserNotFound       = common.NewAppError(common.CodeUserNotFound, "user not found")
	ErrWeChatBindNotFound = common.NewAppError(common.CodeWeChatBindNotFound, "wechat bind not found")
)

// Repository 用户数据访问接口
type Repository interface {
	Create(ctx context.Context, user *User) error
	FindByID(ctx context.Context, uid int) (*User, error)
	FindByEmail(ctx context.Context, email string) (*User, error)
	Update(ctx context.Context, user *User) error
	UpdatePassword(ctx context.Context, uid int, password string) error
	UpdateJwc(ctx context.Context, uid int, sid, spwd string) error
	Delete(ctx context.Context, uid int) error

	// 微信相关
	FindByWeChatOpenID(ctx context.Context, appID, openID string) (*User, error)
	CreateWeChatBind(ctx context.Context, bind *UserWeChatMiniProgram) error
	FindWeChatBindByUID(ctx context.Context, uid int, appID string) (*UserWeChatMiniProgram, error)
	UpdateWeChatBind(ctx context.Context, bind *UserWeChatMiniProgram) error
}

// repository 用户数据访问实现
type repository struct {
	db *gorm.DB
}

// NewRepository 创建用户数据访问层
func NewRepository(db *gorm.DB) Repository {
	return &repository{db: db}
}

// Create 创建用户
func (r *repository) Create(ctx context.Context, user *User) error {
	return r.db.WithContext(ctx).Create(user).Error
}

// FindByID 根据ID查找用户
func (r *repository) FindByID(ctx context.Context, uid int) (*User, error) {
	var user User
	if err := r.db.WithContext(ctx).First(&user, uid).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}
	return &user, nil
}

// FindByEmail 根据邮箱查找用户
func (r *repository) FindByEmail(ctx context.Context, email string) (*User, error) {
	var user User
	if err := r.db.WithContext(ctx).Where("email = ?", email).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}
	return &user, nil
}

// Update 更新用户
func (r *repository) Update(ctx context.Context, user *User) error {
	return r.db.WithContext(ctx).Save(user).Error
}

// UpdatePassword 更新密码
func (r *repository) UpdatePassword(ctx context.Context, uid int, password string) error {
	return r.db.WithContext(ctx).Model(&User{}).Where("uid = ?", uid).Update("password", password).Error
}

// UpdateJwc 更新教务系统绑定
func (r *repository) UpdateJwc(ctx context.Context, uid int, sid, spwd string) error {
	return r.db.WithContext(ctx).Model(&User{}).Where("uid = ?", uid).Updates(map[string]interface{}{
		"sid":  sid,
		"spwd": spwd,
	}).Error
}

// Delete 删除用户
func (r *repository) Delete(ctx context.Context, uid int) error {
	return r.db.WithContext(ctx).Delete(&User{}, uid).Error
}

// FindByWeChatOpenID 根据微信OpenID查找用户
func (r *repository) FindByWeChatOpenID(ctx context.Context, appID, openID string) (*User, error) {
	var bind UserWeChatMiniProgram
	if err := r.db.WithContext(ctx).Where("app_id = ? AND open_id = ?", appID, openID).First(&bind).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}

	// 根据uid查找用户
	return r.FindByID(ctx, bind.Uid)
}

// CreateWeChatBind 创建微信绑定
func (r *repository) CreateWeChatBind(ctx context.Context, bind *UserWeChatMiniProgram) error {
	return r.db.WithContext(ctx).Create(bind).Error
}

// FindWeChatBindByUID 根据用户ID和AppID查找微信绑定
func (r *repository) FindWeChatBindByUID(ctx context.Context, uid int, appID string) (*UserWeChatMiniProgram, error) {
	var bind UserWeChatMiniProgram
	if err := r.db.WithContext(ctx).Where("uid = ? AND app_id = ?", uid, appID).First(&bind).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrWeChatBindNotFound
		}
		return nil, err
	}
	return &bind, nil
}

// UpdateWeChatBind 更新微信绑定
func (r *repository) UpdateWeChatBind(ctx context.Context, bind *UserWeChatMiniProgram) error {
	return r.db.WithContext(ctx).Save(bind).Error
}
