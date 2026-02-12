package share

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"spider-go/internal/common"
	"spider-go/internal/modules/course"
	"spider-go/internal/shared"
)

// Service 分享服务接口
type Service interface {
	CreateShareToken(ctx context.Context, uid int, req *CreateShareRequest) (*CreateShareResponse, error)
	GetSharedCourse(ctx context.Context, token string) (*SharedCourseResponse, error)
}

type shareService struct {
	userQuery     shared.UserQuery
	courseService course.Service
}

// NewService 创建分享服务
func NewService(userQuery shared.UserQuery, courseService course.Service) Service {
	return &shareService{
		userQuery:     userQuery,
		courseService: courseService,
	}
}

func (s *shareService) CreateShareToken(ctx context.Context, uid int, req *CreateShareRequest) (*CreateShareResponse, error) {
	token := ShareToken{Uid: uid, Term: req.Term, Week: req.Week}
	data, err := json.Marshal(token)
	if err != nil {
		return nil, common.NewAppError(common.CodeInternalError, "生成分享token失败")
	}
	encoded := base64.RawURLEncoding.EncodeToString(data)
	return &CreateShareResponse{Token: encoded}, nil
}

func (s *shareService) GetSharedCourse(ctx context.Context, token string) (*SharedCourseResponse, error) {
	data, err := base64.RawURLEncoding.DecodeString(token)
	if err != nil {
		return nil, common.NewAppError(common.CodeInvalidParams, "无效的分享token")
	}

	var st ShareToken
	if err := json.Unmarshal(data, &st); err != nil {
		return nil, common.NewAppError(common.CodeInvalidParams, "无效的分享token")
	}

	if st.Uid <= 0 || st.Term == "" || st.Week < 1 || st.Week > 20 {
		return nil, common.NewAppError(common.CodeInvalidParams, "分享参数无效")
	}

	u, err := s.userQuery.GetUserByUid(ctx, st.Uid)
	if err != nil {
		return nil, common.NewAppError(common.CodeUserNotFound, "用户不存在")
	}

	schedule, err := s.courseService.GetCourseTableByWeek(ctx, st.Uid, st.Week, st.Term)
	if err != nil {
		return nil, err
	}

	return &SharedCourseResponse{
		UserName: u.Name,
		Term:     st.Term,
		Week:     st.Week,
		Schedule: schedule,
	}, nil
}
