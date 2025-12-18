package user

import (
	"context"
	"errors"
	"regexp"
	"spider-go/internal/common"
	"spider-go/internal/service"
	"spider-go/internal/shared"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrInvalidCredentials = errors.New("用户不存在或密码错误")
	ErrEmailAlreadyExists = errors.New("邮箱已被注册")
	ErrInvalidCaptcha     = errors.New("验证码错误")
	ErrEmptyParams        = errors.New("参数不能为空")
)

// Service 用户服务接口
type Service interface {
	// Register 注册
	Register(ctx context.Context, email, password, name, captcha string) (token string, err error)
	// Login 用户登录
	Login(ctx context.Context, email, password string) (token string, user *User, err error)
	// ResetPassword 重置密码
	ResetPassword(ctx context.Context, email, newPassword, captcha string) error
	// WeChatLogin 微信注册登录相关
	WeChatLogin(ctx context.Context, code string) (token string, user *User, err error)
	// WeChatBind 老用户绑定微信
	WeChatBind(ctx context.Context, uid int, code string) (err error)
	// GetUserInfo 用户信息
	GetUserInfo(ctx context.Context, uid int) (*User, error)

	// BindJwc 教务系统绑定相关
	BindJwc(ctx context.Context, uid int, sid, spwd string) error
	// CheckIsBind 检查是否绑定教务处
	CheckIsBind(ctx context.Context, uid int) (bool, error)
}

// userService 用户服务实现
type userService struct {
	repo           Repository
	sessionService service.SessionService
	captchaService CaptchaService
	dauService     service.DAUService
	jwtSecret      []byte
	jwtIssuer      string
	jwtExpire      time.Duration
	appid          string
	appsecret      string
}

// NewService 创建用户服务
func NewService(
	repo Repository,
	sessionService service.SessionService,
	captchaService CaptchaService,
	dauService service.DAUService,
	jwtSecret string,
	jwtIssuer string,
	appid string,
	appsecret string,
) Service {
	return &userService{
		repo:           repo,
		sessionService: sessionService,
		captchaService: captchaService,
		dauService:     dauService,
		jwtSecret:      []byte(jwtSecret),
		jwtIssuer:      jwtIssuer,
		jwtExpire:      168 * time.Hour, // 7天
		appid:          appid,
		appsecret:      appsecret,
	}
}

// Register 用户注册
func (s *userService) Register(ctx context.Context, email, password, name, captcha string) (string, error) {
	// 检查用户是否已存在
	existing, err := s.repo.FindByEmail(ctx, email)
	if err != nil && !errors.Is(err, ErrUserNotFound) {
		return "", err
	}
	if existing != nil {
		return "", ErrEmailAlreadyExists
	}

	// 验证验证码
	if err := s.captchaService.VerifyEmailCaptcha(ctx, email, captcha); err != nil {
		return "", ErrInvalidCaptcha
	}

	// 加密密码
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}

	// 创建用户
	user := &User{
		Name:      name,
		Email:     email,
		Password:  string(hashedPassword),
		CreatedAt: time.Now(),
	}

	if err := s.repo.Create(ctx, user); err != nil {
		return "", err
	}

	// 生成JWT token
	claims := shared.UserClaims{
		Uid:  user.Uid,
		Name: user.Name,
		RegisteredClaims: jwt.RegisteredClaims{
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(s.jwtExpire)),
			Issuer:    s.jwtIssuer,
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(s.jwtSecret)
	if err != nil {
		return "", err
	}

	return tokenString, nil
}

// Login 用户登录
func (s *userService) Login(ctx context.Context, email, password string) (string, *User, error) {
	// 查找用户
	user, err := s.repo.FindByEmail(ctx, email)
	if err != nil {
		return "", nil, ErrInvalidCredentials
	}

	// 验证密码
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(password)); err != nil {
		return "", nil, ErrInvalidCredentials
	}

	// 记录DAU
	_ = s.dauService.RecordUserActivity(ctx, user.Uid)

	// 生成JWT token
	claims := shared.UserClaims{
		Uid:  user.Uid,
		Name: user.Name,
		RegisteredClaims: jwt.RegisteredClaims{
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(s.jwtExpire)),
			Issuer:    s.jwtIssuer,
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(s.jwtSecret)
	if err != nil {
		return "", nil, err
	}

	return tokenString, user, nil
}

// ResetPassword 重置密码
func (s *userService) ResetPassword(ctx context.Context, email, newPassword, captcha string) error {
	// 查找用户
	user, err := s.repo.FindByEmail(ctx, email)
	if err != nil {
		return ErrUserNotFound
	}

	// 验证验证码
	if err := s.captchaService.VerifyEmailCaptcha(ctx, email, captcha); err != nil {
		return ErrInvalidCaptcha
	}

	// 加密新密码
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	// 更新密码
	return s.repo.UpdatePassword(ctx, user.Uid, string(hashedPassword))
}

// GetUserInfo 获取用户信息
func (s *userService) GetUserInfo(ctx context.Context, uid int) (*User, error) {
	user, err := s.repo.FindByID(ctx, uid)
	if err != nil {
		return nil, err
	}

	return user, nil
}

// BindJwc 绑定教务系统
func (s *userService) BindJwc(ctx context.Context, uid int, sid, spwd string) error {
	if sid == "" || spwd == "" {
		return ErrEmptyParams
	}
	//判断教务系统密码含有大小写字符，数字，特殊符号
	hasUpper := regexp.MustCompile(`[A-Z]`).MatchString(spwd)
	hasLower := regexp.MustCompile(`[a-z]`).MatchString(spwd)
	hasDigit := regexp.MustCompile(`\d`).MatchString(spwd)
	hasSymbol := regexp.MustCompile(`[^A-Za-z0-9]`).MatchString(spwd)
	if !(hasUpper && hasLower && hasDigit && hasSymbol) {
		return errors.New("请绑定i中南林APP账号")
	}

	// 尝试登录教务系统验证账号
	if _, err := s.sessionService.LoginAndGetClient(ctx, sid, spwd); err != nil {
		return errors.New("请绑定i中南林APP账号")
	}

	// 更新数据库
	if err := s.repo.UpdateJwc(ctx, uid, sid, spwd); err != nil {
		return err
	}

	// 清除旧的会话缓存
	err := s.sessionService.InvalidateSession(ctx, uid)

	if err != nil {
		return common.NewAppError(common.CodeCacheError, "更新成功，删除缓存失败")
	}

	return nil
}

// CheckIsBind 检查是否绑定教务系统
func (s *userService) CheckIsBind(ctx context.Context, uid int) (bool, error) {
	user, err := s.repo.FindByID(ctx, uid)
	if err != nil {
		return false, err
	}

	return user.Sid != "" && user.Spwd != "", nil
}

// WeChatLogin 微信登录/注册
func (s *userService) WeChatLogin(ctx context.Context, code string) (string, *User, error) {

	// TODO: 实现微信登录逻辑
	// 1. 使用code换取openid
	// 2. 查找是否存在该openid的绑定
	// 3. 如果存在，直接登录；如果不存在，创建新用户
	return "", nil, nil
}

// WeChatBind 老用户绑定微信
func (s *userService) WeChatBind(ctx context.Context, uid int, code string) error {
	// TODO: 实现微信绑定逻辑
	// 1. 使用code换取openid
	// 2. 检查openid是否已被其他用户绑定
	// 3. 如果未绑定，创建绑定关系
	return nil
}
