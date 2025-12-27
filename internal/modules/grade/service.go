package grade

import (
	"context"
	"io"
	"log"
	"math"
	"net/http"
	"net/http/cookiejar"
	"net/url"
	"regexp"
	"spider-go/internal/cache"
	"spider-go/internal/common"
	"spider-go/internal/service"
	"spider-go/internal/shared"
	"strconv"
	"strings"
	"time"

	"github.com/PuerkitoBio/goquery"
)

// Service 成绩服务接口
type Service interface {
	GetAllGrades(ctx context.Context, uid int) ([]Grade, *GPA, error)
	GetGradesByTerm(ctx context.Context, uid int, term string) ([]Grade, *GPA, error)
	GetGradesByYear(ctx context.Context, uid int, year string) ([]Grade, *GPA, error)
	GetLevelGrades(ctx context.Context, uid int) ([]LevelGrade, error)
	GetRegularGrades(ctx context.Context, uid int, term string, courseId string) (*RegularGrade, error)
	// 成绩分析接口
	GetRecentTermsGrades(ctx context.Context, uid int) (*TermsGradesAnalysis, error)
}

// gradeService 成绩服务实现
type gradeService struct {
	userQuery      shared.UserQuery
	sessionService service.SessionService
	crawlerService service.CrawlerService
	userDataCache  cache.UserDataCache
	configCache    cache.ConfigCache
	gradeURL       string
	gradeLevelURL  string
}

// NewService 创建成绩服务
func NewService(
	userQuery shared.UserQuery,
	sessionService service.SessionService,
	crawlerService service.CrawlerService,
	userDataCache cache.UserDataCache,
	configCache cache.ConfigCache,
	gradeURL string,
	gradeLevelURL string,
) Service {
	return &gradeService{
		userQuery:      userQuery,
		sessionService: sessionService,
		crawlerService: crawlerService,
		userDataCache:  userDataCache,
		configCache:    configCache,
		gradeURL:       gradeURL,
		gradeLevelURL:  gradeLevelURL,
	}
}

// GetAllGrades 获取所有成绩
func (s *gradeService) GetAllGrades(ctx context.Context, uid int) ([]Grade, *GPA, error) {
	// 获取用户信息
	user, err := s.userQuery.GetUserByUid(ctx, uid)
	if err != nil {
		return nil, nil, common.NewAppError(common.CodeUserNotFound, "用户不存在")
	}

	if user.Sid == "" || user.Spwd == "" {
		return nil, nil, common.NewAppError(common.CodeJwcNotBound, "未绑定教务系统账号")
	}

	// 先查询缓存
	type GradeData struct {
		Grades []Grade `json:"grades"`
		GPA    *GPA    `json:"gpa"`
	}
	var cachedData GradeData
	if err := s.userDataCache.GetGrades(ctx, uid, "", &cachedData); err == nil {
		return cachedData.Grades, cachedData.GPA, nil
	}

	// 获取会话
	cookies, err := s.getCookiesOrLogin(ctx, uid, user.Sid, user.Spwd)
	if err != nil {
		return nil, nil, err
	}

	// 构造请求
	form := url.Values{}
	form.Set("kksj", "")
	form.Set("kcxz", "")
	form.Set("kcmc", "")
	form.Set("xsfs", "all")

	// 发起请求
	body, err := s.crawlerService.FetchWithCookies(ctx, "POST", s.gradeURL, cookies, form)
	if err != nil {
		return nil, nil, err
	}
	defer body.Close()

	// 读取HTML内容用于提取平时分链接
	htmlBytes, err := io.ReadAll(body)
	if err != nil {
		return nil, nil, err
	}

	// 解析成绩
	gradeList, err := s.parseGradesFromHTML(strings.NewReader(string(htmlBytes)))
	if err != nil {
		return nil, nil, err
	}

	// 提取并缓存平时分链接
	s.extractAndCacheRegularGradeLinks(ctx, uid, "", string(htmlBytes))

	// 计算 GPA
	gpa := s.calculateGPA(gradeList)

	// 写入缓存（1小时过期）
	data := GradeData{
		Grades: gradeList,
		GPA:    gpa,
	}
	_ = s.userDataCache.CacheGrades(ctx, uid, "", data, time.Hour)

	return gradeList, gpa, nil
}

// GetGradesByTerm 根据学期获取成绩
func (s *gradeService) GetGradesByTerm(ctx context.Context, uid int, term string) ([]Grade, *GPA, error) {
	// 校验参数
	re := regexp.MustCompile(`^\d{4}-\d{4}-[12]$`)
	if !re.MatchString(term) {
		return nil, nil, common.NewAppError(common.CodeJwcInvalidParams, "学期格式错误")
	}

	// 获取用户信息
	user, err := s.userQuery.GetUserByUid(ctx, uid)
	if err != nil {
		return nil, nil, common.NewAppError(common.CodeUserNotFound, "用户不存在")
	}

	if user.Sid == "" || user.Spwd == "" {
		return nil, nil, common.NewAppError(common.CodeJwcNotBound, "未绑定教务系统账号")
	}

	// 先查询缓存
	type GradeData struct {
		Grades []Grade `json:"grades"`
		GPA    *GPA    `json:"gpa"`
	}
	var cachedData GradeData
	if err := s.userDataCache.GetGrades(ctx, uid, term, &cachedData); err == nil {
		return cachedData.Grades, cachedData.GPA, nil
	}

	// 获取会话
	cookies, err := s.getCookiesOrLogin(ctx, uid, user.Sid, user.Spwd)
	if err != nil {
		return nil, nil, err
	}

	// 构造请求
	form := url.Values{}
	form.Set("kksj", term)
	form.Set("kcxz", "")
	form.Set("kcmc", "")
	form.Set("xsfs", "all")

	// 发起请求
	body, err := s.crawlerService.FetchWithCookies(ctx, "POST", s.gradeURL, cookies, form)
	if err != nil {
		return nil, nil, err
	}
	defer body.Close()

	// 读取HTML内容用于提取平时分链接
	htmlBytes, err := io.ReadAll(body)
	if err != nil {
		return nil, nil, err
	}

	// 解析成绩
	gradeList, err := s.parseGradesFromHTML(strings.NewReader(string(htmlBytes)))
	if err != nil {
		return nil, nil, err
	}

	// 提取并缓存平时分链接
	s.extractAndCacheRegularGradeLinks(ctx, uid, term, string(htmlBytes))

	// 计算 GPA
	gpa := s.calculateGPA(gradeList)

	// 写入缓存（1小时过期）
	data := GradeData{
		Grades: gradeList,
		GPA:    gpa,
	}
	_ = s.userDataCache.CacheGrades(ctx, uid, term, data, time.Hour)

	return gradeList, gpa, nil
}

// GetGradesByYear 根据学年获取成绩
func (s *gradeService) GetGradesByYear(ctx context.Context, uid int, year string) ([]Grade, *GPA, error) {
	// 校验参数格式：2023-2024
	re := regexp.MustCompile(`^\d{4}-\d{4}$`)
	if !re.MatchString(year) {
		return nil, nil, common.NewAppError(common.CodeJwcInvalidParams, "学年格式错误")
	}

	// 获取用户信息
	user, err := s.userQuery.GetUserByUid(ctx, uid)
	if err != nil {
		return nil, nil, common.NewAppError(common.CodeUserNotFound, "用户不存在")
	}

	if user.Sid == "" || user.Spwd == "" {
		return nil, nil, common.NewAppError(common.CodeJwcNotBound, "未绑定教务系统账号")
	}

	// 先查询缓存
	type GradeData struct {
		Grades []Grade `json:"grades"`
		GPA    *GPA    `json:"gpa"`
	}
	var cachedData GradeData
	cacheKey := year // 使用学年作为缓存键
	if err := s.userDataCache.GetGrades(ctx, uid, cacheKey, &cachedData); err == nil {
		return cachedData.Grades, cachedData.GPA, nil
	}

	// 构造两个学期的标识
	term1 := year + "-1"
	term2 := year + "-2"

	// 获取会话
	cookies, err := s.getCookiesOrLogin(ctx, uid, user.Sid, user.Spwd)
	if err != nil {
		return nil, nil, err
	}

	// 获取第一学期成绩
	form1 := url.Values{}
	form1.Set("kksj", term1)
	form1.Set("kcxz", "")
	form1.Set("kcmc", "")
	form1.Set("xsfs", "all")

	body1, err := s.crawlerService.FetchWithCookies(ctx, "POST", s.gradeURL, cookies, form1)
	if err != nil {
		return nil, nil, err
	}

	// 读取第一学期HTML内容
	htmlBytes1, err := io.ReadAll(body1)
	body1.Close()
	if err != nil {
		return nil, nil, err
	}

	gradeList1, err := s.parseGradesFromHTML(strings.NewReader(string(htmlBytes1)))
	if err != nil {
		return nil, nil, err
	}

	// 提取并缓存第一学期的平时分链接
	s.extractAndCacheRegularGradeLinks(ctx, uid, term1, string(htmlBytes1))

	// 获取第二学期成绩
	form2 := url.Values{}
	form2.Set("kksj", term2)
	form2.Set("kcxz", "")
	form2.Set("kcmc", "")
	form2.Set("xsfs", "all")

	body2, err := s.crawlerService.FetchWithCookies(ctx, "POST", s.gradeURL, cookies, form2)
	if err != nil {
		return nil, nil, err
	}

	// 读取第二学期HTML内容
	htmlBytes2, err := io.ReadAll(body2)
	body2.Close()
	if err != nil {
		return nil, nil, err
	}

	gradeList2, err := s.parseGradesFromHTML(strings.NewReader(string(htmlBytes2)))
	if err != nil {
		return nil, nil, err
	}

	// 提取并缓存第二学期的平时分链接
	s.extractAndCacheRegularGradeLinks(ctx, uid, term2, string(htmlBytes2))

	// 合并两个学期的成绩
	allGrades := append(gradeList1, gradeList2...)

	// 计算学年 GPA（使用相同的计算方法）
	gpa := s.calculateGPA(allGrades)

	// 写入缓存（1小时过期）
	data := GradeData{
		Grades: allGrades,
		GPA:    gpa,
	}
	_ = s.userDataCache.CacheGrades(ctx, uid, cacheKey, data, time.Hour)

	return allGrades, gpa, nil
}

// GetLevelGrades 获取等级考试成绩
func (s *gradeService) GetLevelGrades(ctx context.Context, uid int) ([]LevelGrade, error) {
	// 获取用户信息
	user, err := s.userQuery.GetUserByUid(ctx, uid)
	if err != nil {
		return nil, common.NewAppError(common.CodeUserNotFound, "用户不存在")
	}

	if user.Sid == "" || user.Spwd == "" {
		return nil, common.NewAppError(common.CodeJwcNotBound, "未绑定教务系统账号")
	}

	// 获取会话
	cookies, err := s.getCookiesOrLogin(ctx, uid, user.Sid, user.Spwd)
	if err != nil {
		return nil, err
	}

	// 发起请求
	body, err := s.crawlerService.FetchWithCookies(ctx, "GET", s.gradeLevelURL, cookies, nil)
	if err != nil {
		return nil, err
	}
	defer body.Close()

	// 解析成绩
	return s.parseLevelGradesFromHTML(body)
}

func (s *gradeService) GetRegularGrades(ctx context.Context, uid int, term string, courseId string) (*RegularGrade, error) {
	// 先从redis数据库里获取平时分链接，没有则返回空
	// 这个方法要求用户必须先调用过 GetGradesByTerm 或 GetGradesByYear，才能获取到缓存的平时分链接
	// 这样可以防止爬虫等非法访问
	link, err := s.getRegularGradeLink(ctx, uid, term, courseId)
	if err != nil {
		// 如果缓存不存在，直接返回错误，不再查表和登录
		return nil, err
	}

	// 获取会话cookies (从缓存中获取，不需要查数据库)
	cookies, err := s.sessionService.GetCachedCookies(ctx, uid)
	if err != nil || len(cookies) == 0 {
		return nil, common.NewAppError(common.CodeUnauthorized, "会话已过期，请重新获取成绩")
	}

	// 创建 HTTP 客户端并手动发起请求以获取状态码
	jar, _ := cookiejar.New(nil)
	client := &http.Client{
		Jar: jar,
	}

	// 将 cookies 添加到 jar
	parsedURL, _ := url.Parse(link)
	client.Jar.SetCookies(parsedURL, cookies)

	// 发起请求
	resp, err := client.Get(link)
	if err != nil {
		return nil, common.NewAppError(common.CodeJwcRequestFailed, "获取平时分失败")
	}
	defer resp.Body.Close()

	// 检查状态码
	if resp.StatusCode == 404 {
		return nil, common.NewAppError(common.CodeJwcNoRegularGrade, "该课程没有平时分数据")
	}

	if resp.StatusCode != 200 {
		return nil, common.NewAppError(common.CodeJwcRequestFailed, "获取平时分失败")
	}

	// 解析平时分HTML
	regularGrade, err := s.parseRegularGradeFromHTML(resp.Body)
	if err != nil {
		return nil, err
	}

	return regularGrade, nil
}

// getCookiesOrLogin 获取缓存的 cookies 或登录
func (s *gradeService) getCookiesOrLogin(ctx context.Context, uid int, sid, spwd string) ([]*http.Cookie, error) {
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

// parseGradesFromHTML 解析成绩 HTML
func (s *gradeService) parseGradesFromHTML(r io.Reader) ([]Grade, error) {
	doc, err := goquery.NewDocumentFromReader(r)
	if err != nil {
		return nil, common.NewAppError(common.CodeJwcParseFailed, "解析HTML失败")
	}

	table := doc.Find("#dataList")
	if table.Length() == 0 {
		return nil, common.NewAppError(common.CodeJwcParseFailed, "未找到成绩数据")
	}

	var grades []Grade
	table.Find("tr").Each(func(i int, tr *goquery.Selection) {
		tds := tr.Find("td")
		if tds.Length() < 13 {
			return
		}

		trim := func(s string) string {
			return strings.TrimSpace(strings.ReplaceAll(s, "\u00A0", ""))
		}

		serialNo := trim(tds.Eq(0).Text())
		term := trim(tds.Eq(1).Text())
		code := trim(tds.Eq(2).Text())
		subject := trim(tds.Eq(3).Text())
		score := trim(tds.Eq(4).Text())
		credit := parseFloatSafe(trim(tds.Eq(5).Text()))
		gpa := parseFloatSafe(trim(tds.Eq(7).Text()))
		flag := trim(tds.Eq(8).Text()) // 成绩标志（缓考等）

		// 处理 status
		statusNormalRegexp := regexp.MustCompile(`^正常考试$|.*重.*`)
		var status int
		if statusNormalRegexp.MatchString(trim(tds.Eq(10).Text())) {
			status = 0
		} else {
			status = 1
		}

		property := trim(tds.Eq(11).Text())

		if subject == "" && score == "" {
			return
		}

		grades = append(grades, Grade{
			SerialNo: serialNo,
			Term:     term,
			Code:     code,
			Subject:  subject,
			Score:    score,
			Credit:   credit,
			Gpa:      gpa,
			Status:   status,
			Property: property,
			Flag:     flag,
		})
	})

	if len(grades) == 0 {
		return nil, common.NewAppError(common.CodeJwcParseFailed, "未解析到成绩")
	}

	return grades, nil
}

// parseLevelGradesFromHTML 解析等级考试成绩 HTML
func (s *gradeService) parseLevelGradesFromHTML(r io.Reader) ([]LevelGrade, error) {
	doc, err := goquery.NewDocumentFromReader(r)
	if err != nil {
		return nil, common.NewAppError(common.CodeJwcParseFailed, "解析HTML失败")
	}

	table := doc.Find("#dataList")
	if table.Length() == 0 {
		return nil, common.NewAppError(common.CodeJwcParseFailed, "未找到等级考试数据")
	}

	var levelGrades []LevelGrade
	table.Find("tr").Each(func(i int, s *goquery.Selection) {
		tds := s.Find("td")
		if tds.Length() < 9 {
			return
		}

		trim := func(s string) string {
			return strings.ReplaceAll(s, "\u00A0", "")
		}

		no := trim(tds.Eq(0).Text())
		courseName := trim(tds.Eq(1).Text())

		// 处理分数类和等级类成绩
		var levGrade string
		if trim(tds.Eq(4).Text()) == "" {
			levGrade = trim(tds.Eq(7).Text())
		} else {
			levGrade = trim(tds.Eq(4).Text())
		}

		time := trim(tds.Eq(8).Text())

		levelGrades = append(levelGrades, LevelGrade{
			No:         no,
			CourseName: courseName,
			LevGrade:   levGrade,
			Time:       time,
		})
	})

	return levelGrades, nil
}

// calculateGPA 计算 GPA
func (s *gradeService) calculateGPA(gradeArray []Grade) *GPA {
	distinct := s.distinctGrades(gradeArray)

	var (
		sumScore   float64
		sumGp      float64
		sumCredit  float64
		num2       int
		sumScore2  float64
		sumCredit2 float64
	)

	for _, g := range distinct {
		//只算必修
		if g.Property != "必修" {
			continue
		}

		// 跳过缓考成绩，不计入GPA计算
		if g.Flag == "缓考" {
			continue
		}

		scoreText := g.Score

		// BasicPoint
		if g.Status == 0 {
			gradeD := mapGradeToScoreForBasic(scoreText)
			sumScore2 += gradeD * g.Credit
			sumCredit2 += g.Credit
		}

		// GPA & APF
		numericScore, isNum := parseNumeric(scoreText)

		if isNum && g.Status == 0 && numericScore >= 59.9 {
			sumScore += numericScore
			gp := s.getCourseGp(g, scoreText)
			sumGp += gp * g.Credit
			sumCredit += g.Credit
			num2++
		} else {
			if g.Status == 0 && !isNum {
				gp := s.getCourseGp(g, scoreText)
				score := gp*10.0 + 50.0
				sumScore += score
				sumGp += gp * g.Credit
				sumCredit += g.Credit
				num2++
			} else {
				if g.Status == 1 && isNum && numericScore >= 59.9 {
					sumScore += 60.0
					gp := s.getCourseGp(g, scoreText)
					sumGp += gp * 1.0
					sumCredit += g.Credit
					num2++
				} else if g.Status == 1 && !isNum && (scoreText == "及格" || scoreText == "合格") {
					gp := s.getCourseGp(g, scoreText)
					sumScore += 60.0
					sumGp += gp * 1.0
					sumCredit += g.Credit
					num2++
				} else if g.Status == 1 && !isNum && (scoreText == "不及格" || scoreText == "不合格") {
					sumCredit += g.Credit
					num2++
				} else if g.Status == 1 && isNum && numericScore <= 59.9 {
					sumCredit += g.Credit
					num2++
				} else {
					sumCredit += g.Credit
					num2++
					if isNum {
						sumScore += numericScore
					} else {
						log.Println("特殊成绩样式:", scoreText)
					}
				}
			}
		}
	}

	var gpa, apf, basic float64
	if sumCredit != 0 {
		gpa = sumGp / sumCredit
	}
	if num2 != 0 {
		apf = sumScore / float64(num2)
	}
	if sumCredit2 != 0 {
		basic = sumScore2 / sumCredit2
	}

	if math.IsNaN(gpa) {
		gpa = 0
	}
	if math.IsNaN(apf) {
		apf = 0
	}
	if math.IsNaN(basic) {
		basic = 0
	}

	return &GPA{
		AverageGPA:   round3(gpa),
		AverageScore: round3(apf),
		BasicScore:   round3(basic),
	}
}

// distinctGrades 去重成绩
func (s *gradeService) distinctGrades(grades []Grade) []Grade {
	m := make(map[string]Grade)
	for _, g := range grades {
		key := g.SerialNo + "|" + g.Code + "|" + g.Term

		// 如果key已存在，优先保留非缓考的成绩
		if existing, exists := m[key]; exists {
			// 如果现有记录是缓考，但新记录不是，则替换
			if existing.Flag == "缓考" && g.Flag != "缓考" {
				m[key] = g
			}
			// 否则保留现有记录（包括：现有不是缓考，或两者都是缓考，或两者都不是缓考）
		} else {
			m[key] = g
		}
	}
	res := make([]Grade, 0, len(m))
	for _, g := range m {
		res = append(res, g)
	}
	return res
}

// getCourseGp 获取课程绩点
func (s *gradeService) getCourseGp(g Grade, scoreText string) float64 {
	if !math.IsNaN(g.Gpa) && g.Gpa > 0 {
		return g.Gpa
	}
	return handelGp(scoreText)
}

// 辅助函数
func parseFloatSafe(s string) float64 {
	s = strings.TrimSpace(s)
	if s == "" {
		return 0
	}
	s = strings.ReplaceAll(s, ",", "")
	v, _ := strconv.ParseFloat(s, 64)
	return v
}

func parseNumeric(s string) (float64, bool) {
	v, err := strconv.ParseFloat(s, 64)
	if err != nil {
		return 0, false
	}
	return v, true
}

func mapGradeToScoreForBasic(scoreText string) float64 {
	switch scoreText {
	case "不及格", "不合格":
		return 50.0
	case "及格", "合格":
		return 60.0
	case "中":
		return 70.0
	case "良":
		return 80.0
	case "优":
		return 90.0
	default:
		if v, ok := parseNumeric(scoreText); ok {
			return v
		}
		return 0
	}
}

func handelGp(scoreText string) float64 {
	switch scoreText {
	case "不及格", "不合格":
		return 0
	case "及格", "合格":
		return 1.0
	case "中":
		return 2.0
	case "良":
		return 3.0
	case "优":
		return 4.0
	}

	score, ok := parseNumeric(scoreText)
	if !ok {
		log.Println("额外成绩样式:", scoreText)
		return 0
	}

	raw := (score - 50.0) / 10.0
	raw = round3(raw)
	if raw <= 0.1 {
		return 0
	}
	return raw
}

func round3(v float64) float64 {
	return math.Round(v*1000) / 1000
}

// GetRecentTermsGrades 获取最近三个学期的成绩分析
func (s *gradeService) GetRecentTermsGrades(ctx context.Context, uid int) (*TermsGradesAnalysis, error) {
	// 1. 获取最近三个学期
	terms, err := s.configCache.GetPreviousTerms(ctx, 3)
	if err != nil {
		return nil, common.NewAppError(common.CodeInternalError, "获取学期失败")
	}

	// 2. 获取所有成绩
	allGrades, overallGPA, err := s.GetAllGrades(ctx, uid)
	if err != nil {
		return nil, err
	}

	// 3. 按学期分组成绩（只统计 GPA，不返回具体成绩列表）
	termsData := make([]TermGradesData, 0)
	for _, term := range terms {
		termGrades := s.filterGradesByTerm(allGrades, term)

		var termGPA *GPA
		if len(termGrades) == 0 {
			// 如果该学期没有成绩，返回空统计
			termGPA = &GPA{
				AverageGPA:   0,
				AverageScore: 0,
				BasicScore:   0,
			}
		} else {
			// 计算该学期的 GPA
			termGPA = s.calculateGPA(termGrades)
		}

		// 只添加学期和统计数据，不包含具体成绩列表
		termsData = append(termsData, TermGradesData{
			Term: term,
			GPA:  termGPA,
		})
	}

	// 4. 趋势分析
	trendAnalysis := s.analyzeTrend(termsData)

	return &TermsGradesAnalysis{
		CurrentTerm:   terms[0],
		TermsData:     termsData,
		OverallGPA:    overallGPA,
		TrendAnalysis: trendAnalysis,
	}, nil
}

// filterGradesByTerm 按学期过滤成绩
func (s *gradeService) filterGradesByTerm(grades []Grade, term string) []Grade {
	filtered := make([]Grade, 0)
	for _, grade := range grades {
		if grade.Term == term {
			filtered = append(filtered, grade)
		}
	}
	return filtered
}

// analyzeTrend 分析成绩趋势
func (s *gradeService) analyzeTrend(termsData []TermGradesData) *TrendAnalysis {
	if len(termsData) < 2 {
		return &TrendAnalysis{
			GPATrend:     "数据不足",
			ScoreTrend:   "数据不足",
			BestTerm:     "",
			BestTermGPA:  0,
			WorstTerm:    "",
			WorstTermGPA: 0,
		}
	}

	// 找出最好和最差的学期
	var bestTerm, worstTerm string
	var bestGPA, worstGPA float64 = 0, 999.0
	firstValidGPA := true

	gpas := make([]float64, 0)
	for _, data := range termsData {
		// 检查该学期是否有有效的 GPA 数据
		if data.GPA == nil || (data.GPA.AverageGPA == 0 && data.GPA.AverageScore == 0) {
			continue
		}

		gpa := data.GPA.AverageGPA
		gpas = append(gpas, gpa)

		// 初始化最好和最差的 GPA
		if firstValidGPA {
			bestGPA = gpa
			worstGPA = gpa
			bestTerm = data.Term
			worstTerm = data.Term
			firstValidGPA = false
			continue
		}

		// 更新最好的学期
		if gpa > bestGPA {
			bestGPA = gpa
			bestTerm = data.Term
		}

		// 更新最差的学期
		if gpa < worstGPA {
			worstGPA = gpa
			worstTerm = data.Term
		}
	}

	// 如果没有有效数据
	if len(gpas) == 0 {
		return &TrendAnalysis{
			GPATrend:     "暂无数据",
			ScoreTrend:   "暂无数据",
			BestTerm:     "",
			BestTermGPA:  0,
			WorstTerm:    "",
			WorstTermGPA: 0,
		}
	}

	// 分析趋势（比较最近两个学期）
	gpaTrend := "稳定"
	scoreTrend := "稳定"

	if len(gpas) >= 2 {
		// gpas[0] 是当前学期，gpas[1] 是上一学期
		diff := gpas[0] - gpas[1]
		if diff > 0.1 {
			gpaTrend = "上升"
			scoreTrend = "上升"
		} else if diff < -0.1 {
			gpaTrend = "下降"
			scoreTrend = "下降"
		}
	}

	return &TrendAnalysis{
		GPATrend:     gpaTrend,
		ScoreTrend:   scoreTrend,
		BestTerm:     bestTerm,
		BestTermGPA:  bestGPA,
		WorstTerm:    worstTerm,
		WorstTermGPA: worstGPA,
	}
}

// extractAndCacheRegularGradeLinks 从HTML中提取平时分链接并缓存到Redis Hash
func (s *gradeService) extractAndCacheRegularGradeLinks(ctx context.Context, uid int, term string, htmlContent string) {
	regularGradeLinks := make(map[string]interface{})

	// 正则提取: 课程编号和平时分链接
	// HTML结构:
	// <tr class="aaaaDel" style="visibility:hidden;">
	//   <td>...</td>
	//   <td>2025-2026-1</td>
	//   <td align="left" style="width: 110px;">230090475</td>  <- 课程编号
	//   <td>...</td>
	//   <!-- <td>...<a href="/jsxsd/kscj/pscj_list.do?...">...</a></td> --> <- 平时分链接在注释中
	//   ...
	// </tr>

	// 提取所有隐藏的tr标签内容 (包含注释)
	trRegex := regexp.MustCompile(`(?s)<tr[^>]*class="aaaaDel"[^>]*>.*?</tr>`)
	trMatches := trRegex.FindAllString(htmlContent, -1)

	// 正则提取课程编号 (第3个td)
	courseCodeRegex := regexp.MustCompile(`<td align="left"[^>]*>(\d+)</td>`)

	// 正则提取平时分链接 (在HTML注释中)
	regularLinkRegex := regexp.MustCompile(`/jsxsd/kscj/pscj_list\.do\?[^'">\s]+`)

	for _, trContent := range trMatches {
		// 提取课程编号
		codeMatches := courseCodeRegex.FindStringSubmatch(trContent)
		if len(codeMatches) < 2 {
			continue
		}
		courseCode := codeMatches[1]

		// 提取平时分链接
		linkMatches := regularLinkRegex.FindStringSubmatch(trContent)
		if len(linkMatches) > 0 {
			regularLink := linkMatches[0]
			regularGradeLinks[courseCode] = regularLink
		}
	}

	// 如果没有提取到链接,不执行缓存操作
	if len(regularGradeLinks) == 0 {
		return
	}

	// 缓存到Redis Hash (1小时过期)
	_ = s.userDataCache.CacheRegularGrades(ctx, uid, term, regularGradeLinks, time.Hour)
}

// getRegularGradeLink 根据课程编号获取平时分链接
// 从Redis Hash中查询指定课程的平时分链接
func (s *gradeService) getRegularGradeLink(ctx context.Context, uid int, term string, courseCode string) (string, error) {
	// 从缓存中获取平时分链接映射
	var regularGradeLinks map[string]string
	err := s.userDataCache.GetRegularGrades(ctx, uid, term, &regularGradeLinks)
	if err != nil {
		return "", common.NewAppError(common.CodeCacheError, "平时分链接缓存不存在")
	}

	// 查找指定课程编号的链接
	link, exists := regularGradeLinks[courseCode]
	if !exists {
		return "", common.NewAppError(common.CodeJwcNoRegularGrade, "该课程没有平时分数据")
	}
	link = "http://jwgl.csuft.edu.cn" + link
	return link, nil
}

// parseRegularGradeFromHTML 解析平时分 HTML
func (s *gradeService) parseRegularGradeFromHTML(r io.Reader) (*RegularGrade, error) {
	doc, err := goquery.NewDocumentFromReader(r)
	if err != nil {
		return nil, common.NewAppError(common.CodeJwcParseFailed, "解析平时分HTML失败")
	}

	table := doc.Find("#dataList")
	if table.Length() == 0 {
		return nil, common.NewAppError(common.CodeJwcParseFailed, "未找到平时分数据")
	}

	// 查找数据行 (跳过表头)
	dataRow := table.Find("tr").Eq(1)
	if dataRow.Length() == 0 {
		return nil, common.NewAppError(common.CodeJwcParseFailed, "未找到平时分数据行")
	}

	tds := dataRow.Find("td")
	if tds.Length() < 5 {
		return nil, common.NewAppError(common.CodeJwcParseFailed, "平时分数据格式错误")
	}

	trim := func(s string) string {
		return strings.TrimSpace(strings.ReplaceAll(s, "\u00A0", ""))
	}

	// 解析数据
	// HTML 结构:
	// <tr>
	//   <td>1</td>                    <!-- 序号 -->
	//   <td>100</td>                  <!-- 期末成绩 -->
	//   <td>40%</td>                  <!-- 期末成绩比例 -->
	//   <td>69.17</td>                <!-- 平时成绩 -->
	//   <td>60%</td>                  <!-- 平时成绩比例 -->
	//   <td>82</td>                   <!-- 总成绩 -->
	// </tr>

	regularGrade := &RegularGrade{
		FinalExamScore: trim(tds.Eq(1).Text()),
		FinalExamRatio: trim(tds.Eq(2).Text()),
		RegularScore:   trim(tds.Eq(3).Text()),
		RegularRatio:   trim(tds.Eq(4).Text()),
		FinalScore:     trim(tds.Eq(5).Text()),
	}

	return regularGrade, nil
}
