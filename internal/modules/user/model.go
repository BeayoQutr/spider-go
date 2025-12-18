package user

import "time"

// User 用户模型
type User struct {
	Uid                    int                   `gorm:"primary_key;AUTO_INCREMENT" json:"uid"`
	Email                  string                `gorm:"unique;index" json:"email"`
	Name                   string                `json:"name"`
	Password               string                `json:"-"`   // 不序列化
	Sid                    string                `json:"sid"` // 学号
	Spwd                   string                `json:"-"`   // 教务系统密码（不序列化）
	CreatedAt              time.Time             `json:"created_at"`
	Avatar                 string                `json:"avatar"`
	WeChatMiniProgramBinds UserWeChatMiniProgram `gorm:"foreignKey:Uid" json:"-"` // HasMany 关系
}

// TableName 指定表名
func (*User) TableName() string {
	return "users"
}

// UserWeChatMiniProgram 微信登录表模型
type UserWeChatMiniProgram struct {
	Id          int       `gorm:"primary_key;AUTO_INCREMENT" json:"id"`
	Uid         int       `gorm:"type:bigint;not null;uniqueIndex" json:"uid"`
	PhoneNumber string    `gorm:"size:20" json:"phone_number"`
	AppID       string    `gorm:"size:32;not null" json:"appid"`
	OpenID      string    `gorm:"size:64;not null" json:"openid"`
	UnionID     string    `gorm:"size:64" json:"unionid,omitempty"`
	LastLogin   time.Time `json:"last_login"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

func (*UserWeChatMiniProgram) TableName() string {
	return "user_wechat_mini_program"
}

// RegisterRequest 用户注册请求
type RegisterRequest struct {
	Name     string `json:"name" binding:"required"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
	Captcha  string `json:"captcha" binding:"required"`
}

// LoginRequest 用户登录请求
type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// BindJwcRequest 绑定教务系统请求
type BindJwcRequest struct {
	Sid  string `json:"sid" binding:"required"`  // 学号
	Spwd string `json:"spwd" binding:"required"` // 教务系统密码
}

// ResetPasswordRequest 重置密码请求
type ResetPasswordRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
	Captcha  string `json:"captcha" binding:"required"`
}

// SendEmailCaptchaRequest 发送邮箱验证码请求
type SendEmailCaptchaRequest struct {
	Email string `json:"email" binding:"required,email"`
}

// WeChatLoginRequest 微信登录请求(自动注册账号)
type WeChatLoginRequest struct {
	Code string `json:"code" binding:"required"` // 微信授权code
}

// UserResponse 用户响应（不包含敏感信息）
type UserResponse struct {
	Uid       int       `json:"uid"`
	Email     string    `json:"email"`
	Name      string    `json:"name"`
	Sid       string    `json:"sid"`
	Avatar    string    `json:"avatar"`
	CreatedAt time.Time `json:"created_at"`
	IsBind    bool      `json:"is_bind"` // 是否绑定教务系统
}

// ToResponse 转换为响应格式
func (u *User) ToResponse() *UserResponse {
	return &UserResponse{
		Uid:       u.Uid,
		Email:     u.Email,
		Name:      u.Name,
		Sid:       u.Sid,
		Avatar:    u.Avatar,
		CreatedAt: u.CreatedAt,
		IsBind:    u.Sid != "" && u.Spwd != "",
	}
}

// LoginResponse 登录响应
type LoginResponse struct {
	Token string        `json:"token"`
	User  *UserResponse `json:"user"`
}
