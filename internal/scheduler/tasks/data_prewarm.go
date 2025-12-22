package tasks

import (
	"context"
	"log"
	"spider-go/internal/modules/course"
	"spider-go/internal/modules/exam"
	"spider-go/internal/modules/grade"
	"spider-go/internal/shared"
)

// DataPrewarmTask 数据预热任务
type DataPrewarmTask struct {
	userQuery     shared.UserQuery
	gradeService  grade.Service
	courseService course.Service
	examService   exam.Service
}

// NewDataPrewarmTask 创建数据预热任务
func NewDataPrewarmTask(
	userQuery shared.UserQuery,
	gradeService grade.Service,
	courseService course.Service,
	examService exam.Service,
) *DataPrewarmTask {
	return &DataPrewarmTask{
		userQuery:     userQuery,
		gradeService:  gradeService,
		courseService: courseService,
		examService:   examService,
	}
}

// Name 任务名称
func (t *DataPrewarmTask) Name() string {
	return "数据预热"
}

// Cron Cron 表达式（每天凌晨2点执行）
func (t *DataPrewarmTask) Cron() string {
	return "0 2 * * *"
}

// Run 执行任务
func (t *DataPrewarmTask) Run(ctx context.Context) error {
	log.Println("开始执行数据预热任务...")

	// 获取所有已绑定教务系统的用户
	users, err := t.userQuery.GetAllBoundUsers(ctx)
	if err != nil {
		log.Printf("获取用户列表失败: %v", err)
		return err
	}

	successCount := 0
	failCount := 0

	// 为每个用户预热数据
	for _, user := range users {
		if err := t.prewarmUserData(ctx, user.Uid); err != nil {
			log.Printf("预热用户 %d 数据失败: %v", user.Uid, err)
			failCount++
		} else {
			successCount++
		}
	}

	log.Printf("数据预热任务完成: 成功 %d, 失败 %d, 总计 %d", successCount, failCount, len(users))
	return nil
}

// prewarmUserData 预热单个用户的数据
func (t *DataPrewarmTask) prewarmUserData(ctx context.Context, uid int) error {
	// 预热成绩数据（会自动缓存）
	_, _, _ = t.gradeService.GetAllGrades(ctx, uid)

	// 预热课表数据（会自动缓存，使用当前周）
	// 注意: 需要获取当前周数和学期，这里简单起见只预热第1周的课表
	_, _ = t.courseService.GetCourseTableByWeek(ctx, uid, 1, "")

	// 预热考试数据（会自动缓存）
	_, _ = t.examService.GetAllExams(ctx, uid, "")

	return nil
}
