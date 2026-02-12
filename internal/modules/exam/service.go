package exam

import (
	"context"
	"io"
	"log"
	"net/http"
	"net/url"
	"regexp"
	"spider-go/internal/cache"
	"spider-go/internal/common"
	"spider-go/internal/service"
	"spider-go/internal/shared"
	"strings"
	"time"

	"github.com/PuerkitoBio/goquery"
)

// ExamRepository 考试数据访问接口（用于离线查询）
type ExamRepository interface {
	GetExamsByUidAndTerm(ctx context.Context, uid int, term string) ([]ExamArrangement, error)
}

// ReconciliationTrigger 对账触发器接口（避免循环依赖）
type ReconciliationTrigger interface {
	TriggerExamSync(ctx context.Context, uid int)
}

// Service 考试服务接口
type Service interface {
	GetAllExams(ctx context.Context, uid int, term string) ([]ExamArrangement, error)
	// GetAllExamsForSync 获取考试安排（供对账模块使用，不触发递归同步）
	GetAllExamsForSync(ctx context.Context, uid int, term string) ([]ExamArrangement, error)
	// SetExamRepository 设置考试仓储（用于延迟注入）
	SetExamRepository(repo ExamRepository)
	// SetReconciliationTrigger 设置对账触发器（用于延迟注入）
	SetReconciliationTrigger(trigger ReconciliationTrigger)
}

// examService 考试服务实现
type examService struct {
	userQuery             shared.UserQuery
	sessionService        service.SessionService
	crawlerService        service.CrawlerService
	userDataCache         cache.UserDataCache
	examRepo              ExamRepository
	reconciliationTrigger ReconciliationTrigger
	examURL               string
}

// NewService 创建考试服务
func NewService(
	userQuery shared.UserQuery,
	sessionService service.SessionService,
	crawlerService service.CrawlerService,
	userDataCache cache.UserDataCache,
	examURL string,
) Service {
	return &examService{
		userQuery:      userQuery,
		sessionService: sessionService,
		crawlerService: crawlerService,
		userDataCache:  userDataCache,
		examURL:        examURL,
	}
}

// SetExamRepository 设置考试仓储（用于延迟注入）
func (s *examService) SetExamRepository(repo ExamRepository) {
	s.examRepo = repo
}

// SetReconciliationTrigger 设置对账触发器
func (s *examService) SetReconciliationTrigger(trigger ReconciliationTrigger) {
	s.reconciliationTrigger = trigger
}

// GetAllExams 获取考试安排
// 策略：先尝试从教务系统获取（2秒超时），超时则返回数据库数据
// 注意：登录失败等认证错误不降级，直接返回错误
func (s *examService) GetAllExams(ctx context.Context, uid int, term string) ([]ExamArrangement, error) {
	// 校验参数
	re := regexp.MustCompile(`^\d{4}-\d{4}-[12]$`)
	if !re.MatchString(term) {
		return nil, common.NewAppError(common.CodeJwcInvalidParams, "学期格式错误")
	}

	// 获取用户信息
	user, err := s.userQuery.GetUserByUid(ctx, uid)
	if err != nil {
		return nil, common.NewAppError(common.CodeUserNotFound, "用户不存在")
	}

	if user.Sid == "" || user.Spwd == "" {
		return nil, common.NewAppError(common.CodeJwcNotBound, "未绑定教务系统账号")
	}

	// 先查询缓存
	var cachedExams []ExamArrangement
	if err := s.userDataCache.GetExams(ctx, uid, term, &cachedExams); err == nil {
		return cachedExams, nil
	}

	// 创建带 2 秒超时的上下文
	timeoutCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()

	// 尝试从教务系统获取
	exams, err := s.fetchExamsFromJwc(timeoutCtx, uid, user.Sid, user.Spwd, term)

	if err == nil {
		// 成功从教务系统获取，异步触发对账更新
		s.triggerAsyncReconciliation(uid)
		return exams, nil
	}

	// 判断错误类型：登录失败/认证错误不降级，直接返回错误
	if s.isAuthenticationError(err) {
		log.Printf("[GetAllExams] 认证错误，清除绑定信息：uid=%d, err=%v", uid, err)
		// 清除用户的教务系统绑定
		if clearErr := s.userQuery.ClearJwcBinding(ctx, uid); clearErr != nil {
			log.Printf("[GetAllExams] 清除绑定信息失败：uid=%d, err=%v", uid, clearErr)
		}
		return nil, err
	}

	// 超时或网络错误，尝试从数据库获取
	log.Printf("[GetAllExams] 教务系统请求超时/网络错误，尝试从数据库获取：uid=%d, err=%v", uid, err)

	dbExams, dbErr := s.getExamsFromDatabase(ctx, uid, term)
	if dbErr == nil && len(dbExams) > 0 {
		return dbExams, nil
	}

	// 数据库也没有数据，返回原始错误
	return nil, err
}

// GetAllExamsForSync 获取考试安排（供对账模块使用，不触发递归同步）
func (s *examService) GetAllExamsForSync(ctx context.Context, uid int, term string) ([]ExamArrangement, error) {
	// 校验参数
	re := regexp.MustCompile(`^\d{4}-\d{4}-[12]$`)
	if !re.MatchString(term) {
		return nil, common.NewAppError(common.CodeJwcInvalidParams, "学期格式错误")
	}

	// 获取用户信息
	user, err := s.userQuery.GetUserByUid(ctx, uid)
	if err != nil {
		return nil, common.NewAppError(common.CodeUserNotFound, "用户不存在")
	}

	if user.Sid == "" || user.Spwd == "" {
		return nil, common.NewAppError(common.CodeJwcNotBound, "未绑定教务系统账号")
	}

	// 直接从教务系统获取，不触发同步
	return s.fetchExamsFromJwc(ctx, uid, user.Sid, user.Spwd, term)
}

// fetchExamsFromJwc 从教务系统获取考试安排
func (s *examService) fetchExamsFromJwc(ctx context.Context, uid int, sid, spwd, term string) ([]ExamArrangement, error) {
	// 获取会话
	cookies, err := s.getCookiesOrLogin(ctx, uid, sid, spwd)
	if err != nil {
		return nil, err
	}

	// 构造请求
	form := url.Values{}
	form.Add("xnxqid", term)

	// 发起请求
	body, err := s.crawlerService.FetchWithCookies(ctx, "POST", s.examURL, cookies, form)
	if err != nil {
		return nil, err
	}
	defer body.Close()

	// 解析响应
	exams, err := s.parseExamArrangementFromHTML(body)
	if err != nil {
		return nil, err
	}

	// 写入缓存（1小时过期）
	_ = s.userDataCache.CacheExams(ctx, uid, term, exams, time.Hour)

	return exams, nil
}

// getExamsFromDatabase 从数据库获取考试安排
func (s *examService) getExamsFromDatabase(ctx context.Context, uid int, term string) ([]ExamArrangement, error) {
	if s.examRepo == nil {
		return nil, common.NewAppError(common.CodeInternalError, "考试仓储未配置")
	}

	exams, err := s.examRepo.GetExamsByUidAndTerm(ctx, uid, term)
	if err != nil {
		return nil, err
	}

	return exams, nil
}

// isAuthenticationError 判断是否是认证相关错误
func (s *examService) isAuthenticationError(err error) bool {
	if err == nil {
		return false
	}

	if appErr, ok := err.(*common.AppError); ok {
		// 明确排除的非认证错误
		switch appErr.Code {
		case common.CodeJwcLoginTimeout, // 超时错误 - 应该降级到数据库
			common.CodeJwcRequestFailed, // 请求失败（网络/服务器错误）- 应该降级
			common.CodeJwcParseFailed:   // 解析失败 - 不是认证问题
			return false
		}

		// 真正的认证错误
		switch appErr.Code {
		case common.CodeJwcLoginFailed,
			common.CodeJwcNotBound,
			common.CodeUnauthorized:
			return true
		}
	}

	errMsg := err.Error()
	authKeywords := []string{
		"用户名或密码错误",
		"密码错误",
		"账号被锁",
		"认证失败",
	}
	for _, keyword := range authKeywords {
		if strings.Contains(errMsg, keyword) {
			return true
		}
	}

	return false
}

// triggerAsyncReconciliation 异步触发对账更新
func (s *examService) triggerAsyncReconciliation(uid int) {
	if s.reconciliationTrigger == nil {
		return
	}

	go func() {
		ctx := context.Background()
		s.reconciliationTrigger.TriggerExamSync(ctx, uid)
	}()
}

// getCookiesOrLogin 获取缓存的 cookies 或登录
func (s *examService) getCookiesOrLogin(ctx context.Context, uid int, sid, spwd string) ([]*http.Cookie, error) {
	cookies, err := s.sessionService.GetCachedCookies(ctx, uid)
	if err != nil {
		return nil, common.NewAppError(common.CodeCacheError, "缓存错误")
	}

	if len(cookies) > 0 {
		return cookies, nil
	}

	if err := s.sessionService.LoginAndCache(ctx, uid, sid, spwd); err != nil {
		return nil, err
	}

	cookies, err = s.sessionService.GetCachedCookies(ctx, uid)
	if err != nil || len(cookies) == 0 {
		return nil, common.NewAppError(common.CodeJwcLoginFailed, "获取会话失败")
	}

	return cookies, nil
}

// parseExamArrangementFromHTML 解析考试安排 HTML
func (s *examService) parseExamArrangementFromHTML(r io.Reader) ([]ExamArrangement, error) {
	doc, err := goquery.NewDocumentFromReader(r)
	if err != nil {
		return nil, common.NewAppError(common.CodeJwcParseFailed, "解析HTML失败")
	}

	title := strings.TrimSpace(doc.Find("title").Text())
	if title != "我的考试 - 考试安排查询" {
		return nil, common.NewAppError(common.CodeJwcParseFailed, "页面错误")
	}

	table := doc.Find("#dataList")
	if table.Length() == 0 {
		return nil, common.NewAppError(common.CodeJwcParseFailed, "未找到考试安排数据")
	}

	rows := table.Find("tr")
	if rows.Length() <= 1 {
		return nil, nil // 只有表头，无数据
	}

	// 检查是否显示"未查询到数据"
	if strings.Contains(rows.Eq(1).Text(), "未查询到数据") {
		return nil, nil
	}

	var exams []ExamArrangement

	rows.Each(func(i int, tr *goquery.Selection) {
		if i == 0 {
			return // 跳过表头
		}

		tds := tr.Find("td")
		if tds.Length() < 9 {
			return
		}

		trim := func(s string) string {
			s = strings.TrimSpace(s)
			s = strings.ReplaceAll(s, "\u00A0", "")
			return s
		}

		exams = append(exams, ExamArrangement{
			SerialNo:  trim(tds.Eq(0).Text()),
			ClassNo:   trim(tds.Eq(2).Text()),
			ClassName: trim(tds.Eq(3).Text()),
			Time:      trim(tds.Eq(4).Text()),
			Place:     trim(tds.Eq(5).Text()),
			Execution: trim(tds.Eq(8).Text()),
		})
	})

	return exams, nil
}
