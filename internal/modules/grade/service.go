package grade

import (
	"context"
	"io"
	"log"
	"math"
	"net/http"
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
	GetLevelGrades(ctx context.Context, uid int) ([]LevelGrade, error)
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
		return nil, nil, common.NewAppError(common.CodeJwcNotBound, "")
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

	// 解析成绩
	gradeList, err := s.parseGradesFromHTML(body)
	if err != nil {
		return nil, nil, err
	}

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
		return nil, nil, common.NewAppError(common.CodeJwcNotBound, "")
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

	// 解析成绩
	gradeList, err := s.parseGradesFromHTML(body)
	if err != nil {
		return nil, nil, err
	}

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

// GetLevelGrades 获取等级考试成绩
func (s *gradeService) GetLevelGrades(ctx context.Context, uid int) ([]LevelGrade, error) {
	// 获取用户信息
	user, err := s.userQuery.GetUserByUid(ctx, uid)
	if err != nil {
		return nil, common.NewAppError(common.CodeUserNotFound, "用户不存在")
	}

	if user.Sid == "" || user.Spwd == "" {
		return nil, common.NewAppError(common.CodeJwcNotBound, "")
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
		if g.Property != "必修" {
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
		m[key] = g
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
