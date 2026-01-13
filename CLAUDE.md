# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Spider-Go is a Go-based educational administration system crawler and management platform for CSUFT (Changsha University of Science and Technology). It provides REST APIs for querying grades, course schedules, exam schedules, and grade analysis.

## Development Commands

### Running the Application
```bash
# Run directly (defaults to dev environment)
go run main.go

# Run with explicit environment
go run main.go -env=dev
go run main.go -env=production

# Build and run
go build -o spider-go
./spider-go

# Build for Windows
go build -o spider-go.exe

# Build optimized production binary
go build -ldflags="-s -w" -o spider-go-production.exe
```

**Environment Configuration**: The app uses `GO_ENV` environment variable or `-env` flag. Config files are loaded from:
- `config/config.dev.yaml` (development)
- `config/config.production.yaml` (production)

### Dependencies
```bash
# Install/update dependencies
go mod download

# Tidy dependencies
go mod tidy
```

### Database
The application uses GORM with auto-migration. Database tables are created automatically on startup. No migration commands needed.

## Architecture

### Current Architecture

The project follows a **domain-driven module architecture**:

```
internal/
├── modules/              # Domain-driven modules
│   ├── admin/            # Admin management
│   ├── config/           # System configuration
│   ├── course/           # Course schedules
│   ├── evaluation/       # Course evaluations
│   ├── exam/             # Exam schedules
│   ├── grade/            # Grade queries
│   ├── notice/           # System notices
│   ├── ranking/          # Grade rankings
│   ├── reconciliation/   # Data synchronization
│   ├── statistics/       # Statistics queries
│   └── user/             # User authentication
├── app/                  # App initialization and DI container
├── cache/                # Redis cache implementations
├── middleware/           # HTTP middlewares (auth, CORS)
├── scheduler/            # Cron job scheduler
├── service/              # Infrastructure services (session, crawler, email)
├── shared/               # Shared utilities across modules
└── utils/                # General utilities

pkg/                      # Reusable libraries
├── email/                # Email client
├── errors/               # Error handling
├── httpclient/           # HTTP client wrapper
└── redis/                # Redis client
```

**Note**: Some legacy service layer code still exists in `internal/service/` but only for infrastructure concerns (SessionService, CrawlerService, EmailService). Domain logic lives in modules.

### Dependency Injection Container

The entire application is built around a centralized dependency injection container (`internal/app/container.go`). **Never use global variables** - all dependencies flow through the container:

1. **Initialization order** (in `NewContainer`):
   - Config → DB → Redis → Repositories → Caches → Services → Modules
   - RSA public key fetched on startup
   - Default admin created if not exists

2. **Adding new components**:
   - **For new modules**: Create in `internal/modules/yourmodule/` following the module pattern below
   - Always add module initialization to `container.initModules()`

### Module Architecture

Each module in `internal/modules/` follows this structure:

```
yourmodule/
├── model.go       # Data models and DTOs
├── repository.go  # Database operations (if needed)
├── service.go     # Business logic
├── handler.go     # HTTP handlers
└── module.go      # Module assembly and DI
```

**Module pattern**:
- `module.go` creates the module and wires dependencies
- Module exposes `RegisterRoutes()` to register HTTP routes
- Module exposes `GetService()` for cross-module dependencies
- See `internal/modules/grade/` or `internal/modules/user/` for reference

### Configuration System

Configuration uses Viper with YAML. Two environments supported:
- **Development**: `config/config.dev.yaml` (loaded when `GO_ENV=dev` or `-env=dev`)
- **Production**: `config/config.production.yaml` (loaded when `GO_ENV=production` or `-env=production`)

**Educational System Access Modes**:
- **campus**: For on-campus network (direct URLs to jwgl.csuft.edu.cn)
- **webvpn**: For off-campus access (WebVPN URLs)

Switch modes by setting `jwc.mode` in config files. The container automatically injects the correct URLs into modules at startup.

### Session Management

Educational system sessions are cached in Redis (DB 0) with 1-hour expiration:
- `SessionService` handles login and cookie caching
- Retry logic: 3 attempts for login
- RSA encryption for passwords using public key from CAS server
- Session cookies are extracted and cached per user (uid)

### Caching Strategy

**Redis DB 0** (session Redis):
- User login sessions (1 hour expiration)
- DAU (Daily Active Users) statistics (30 days retention)
- System configuration (permanent)
- User data cache (grades, courses, exams)

**Redis DB 1** (captcha Redis):
- Email verification codes (5 minutes expiration)

### Authentication

**User JWT** (`middleware.AuthMiddleWare`):
- Uses JWT secret from config
- Automatically records DAU on each authenticated request
- Token contains uid, email

**Admin JWT** (`middleware.AdminAuthMiddleware`):
- Separate authentication from users
- Uses same JWT secret but different claims

### Scheduled Tasks

The application uses `github.com/robfig/cron/v3` for scheduled tasks. Task definitions are in `internal/scheduler/tasks/`:

**Current scheduled tasks** (configured in `main.go`):
- **RSA public key refresh**: Every hour (`0 * * * *`) - Fetches latest RSA public key from CAS server
- **Reset bind count**: Monthly on 1st at midnight (`0 0 1 * *`) - Resets user educational system binding limits
- **User data sync**: Daily at 2 AM (`0 2 * * *`) - Pre-caches user grades/courses/exams

**Adding a new scheduled task**:
1. Create task in `internal/scheduler/tasks/your_task.go` implementing the `Task` interface
2. Add task to scheduler in `main.go` `initScheduler()` function

### Error Handling

Custom error system in `internal/common/errors.go`:
- `AppError` with error codes
- Standardized response format via `internal/common/response.go`
- Always use `NewAppError` for service-level errors

### Crawler Service

`CrawlerService` is a thin wrapper around HTTP client:
- Used by grade/course/exam services
- Takes cookies from `SessionService`
- Parses HTML with goquery

## Key Design Patterns

### Service Dependencies
Services are composed, not global:
```go
// ✓ Good: Dependencies injected
func NewGradeService(
    userRepo repository.UserRepository,
    sessionService service.SessionService,
    crawlerService service.CrawlerService,
    cache cache.UserDataCache,
    gradeURL string,
) GradeService

// ✗ Bad: Global variables
var globalDB *gorm.DB
```

### Mode-Aware URL Injection
Services receive URLs based on config mode:
```go
currentMode := c.Config.Jwc.GetCurrentModeConfig()
c.GradeService = service.NewGradeService(
    ...,
    currentMode.GradeURL,      // Campus or WebVPN URL
    currentMode.GradeLevelURL,
)
```

### Context Propagation
Always pass `context.Context` through service calls for cancellation and timeouts:
```go
func (s *gradeService) GetAllGrades(ctx context.Context, uid int) ([]Grade, error)
```

## Common Tasks

### Adding a New Module

1. **Create module directory**: `internal/modules/yourmodule/`
2. **Create files**:
   - `model.go` - Data models and DTOs
   - `service.go` - Business logic interface and implementation
   - `handler.go` - HTTP handlers
   - `module.go` - Module assembly and DI wiring
   - `repository.go` - Database operations (optional, if needed)
3. **Implement the module**:
   ```go
   // module.go
   type Module struct {
       handler *Handler
       service Service
   }

   func NewModule(deps...) *Module {
       svc := NewService(deps...)
       handler := NewHandler(svc)
       return &Module{handler: handler, service: svc}
   }

   func (m *Module) RegisterRoutes(r *gin.RouterGroup) {
       m.handler.RegisterRoutes(r)
   }

   func (m *Module) GetService() Service {
       return m.service
   }
   ```
4. **Register in container**: Add to `internal/app/container.go`:
   - Add module field to `Container` struct
   - Initialize in `initModules()` method
5. **Register routes**: Add `container.YourModule.RegisterRoutes(...)` in `internal/api/routes.go`

### Adding a Scheduled Task

1. Create task file `internal/scheduler/tasks/your_task.go`:
   ```go
   type YourTask struct {
       // dependencies
   }

   func (t *YourTask) Name() string { return "Task Name" }
   func (t *YourTask) Cron() string { return "0 2 * * *" } // cron expression
   func (t *YourTask) Run(ctx context.Context) error {
       // task logic
   }
   ```
2. Add to scheduler in `main.go` `initScheduler()`:
   ```go
   s.AddTask(tasks.NewYourTask(dependencies...))
   ```

### Adding Redis Cache

1. Define cache interface in `internal/cache/xxx_cache.go`:
   ```go
   type YourCache interface {
       Get(ctx context.Context, key string) (value, error)
       Set(ctx context.Context, key string, value, ttl time.Duration) error
   }
   ```
2. Implement with Redis client (use `*redis.Client` from container)
3. Add cache field to `Container` struct in `internal/app/container.go`
4. Initialize in `container.initCaches()` method
5. Inject cache into modules that need it

### Changing Educational System Mode

Edit `config/config.dev.yaml` or `config/config.production.yaml`:
```yaml
jwc:
  mode: "webvpn"  # or "campus"
```
Restart application. No code changes needed - URLs are injected automatically.

## Important Notes

- **No tests exist yet** - the project currently lacks unit and integration tests
- **Auto-migration only** - GORM creates tables on startup, no manual migrations
- **Default admin**: Created on first startup with email `admin@spider-go.com` / password `123456` (change immediately in production)
- **CORS**: Configured per environment in config files under `cors` section
- **Graceful shutdown**: SIGINT/SIGTERM signals trigger cleanup of DB and Redis connections
- **Module cross-dependencies**: Some modules depend on each other (e.g., grade → reconciliation). These are set up via delayed injection in `container.initModules()` to avoid circular dependencies.

## Database Schema

Tables auto-created by GORM:
- `users`: User accounts and bound educational system credentials
- `administrators`: Admin accounts (separate from users)
- `notices`: System notifications with display flags

## Configuration Checklist for Deployment

Before deploying, update `config/config.production.yaml`:
1. Change `jwt.secret` to a strong random value
2. Update `database` credentials and connection info
3. Update `redis.session` and `redis.captcha` credentials
4. Configure `email` SMTP settings for verification codes
5. Set correct `cors.allow_origins` for your frontend domain(s)
6. Choose appropriate `jwc.mode` (campus vs webvpn) based on network
7. Change default admin password after first login via admin API
