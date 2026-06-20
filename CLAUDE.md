# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Spider-Go is a Go-based educational administration system crawler and management platform for CSUFT (Changsha University of Science and Technology). It provides a full-stack solution with REST APIs and a React frontend for querying grades, course schedules, exam schedules, and grade analysis.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Go 1.25 + Gin + GORM + MySQL + Redis |
| Frontend | React 19 + TypeScript + Vite + TailwindCSS v4 + Recharts |
| Auth | JWT (user + admin dual channel) |
| State | Zustand (frontend), Redis (backend cache) |
| Build | Go compiler, Vite bundler |

## Development Commands

### Backend
```bash
# Run directly (defaults to dev environment)
go run main.go

# Run with explicit environment
go run main.go -env=dev
go run main.go -env=production

# Build
go build -o spider-go-dev.exe

# Build optimized production binary
go build -ldflags="-s -w" -o spider-go.exe
```

**Environment Configuration**: The app uses `GO_ENV` environment variable or `-env` flag. Config files are loaded from:
- `config/config.dev.yaml` (development)
- `config/config.production.yaml` (production)

### Frontend
```bash
cd frontend

# Install dependencies
npm install

# Development (with HMR, Vite proxy /api → localhost:8080)
npm run dev

# Build for production
npm run build

# TypeScript check
npx tsc --noEmit
```

### Production Mode (Backend + Frontend unified)

When the backend is compiled and `frontend/dist/` exists, the Go server serves the frontend static files at `/` and API at `/api/*`. No separate web server needed.

```bash
cd frontend && npm run build
cd .. && go build -o spider-go-dev.exe
./spider-go-dev.exe -env=dev
# Visit http://localhost:8080
```

### Windows Auto-Start

To register the backend as a startup task (hidden, no console window):

1. Build: `go build -o spider-go-dev.exe`
2. Build frontend: `cd frontend && npm run build`
3. Place a `.vbs` script in the Startup folder:
   ```vbscript
   Set WshShell = CreateObject("WScript.Shell")
   WshShell.CurrentDirectory = "E:\spider-go\spider-go"
   WshShell.Run "E:\spider-go\spider-go\spider-go-dev.exe -env=dev", 0, False
   ```
4. Create a desktop shortcut pointing to `http://localhost:8080`

### Dependencies
```bash
# Go
go mod download
go mod tidy

# Frontend
cd frontend && npm install
```

**Go Version**: This project requires Go 1.25 or higher (see `go.mod`).

## Architecture

### Frontend (`frontend/`)

React 19 SPA with mobile-first design, served directly by the Go backend in production.

- **Pages**: 21 pages (15 user + 6 admin), routed via React Router v7
- **Layouts**: `MainLayout` (bottom tab bar for mobile), `AdminLayout` (sidebar), `AuthLayout` (centered card)
- **API Layer**: `src/api/client.ts` — dual Axios instances (user + admin JWT), interceptors handle 401 auto-redirect
- **Stores**: Zustand (`authStore` for JWT persistence, `appStore` for global state)
- **Key modules**: `api/auth.ts`, `api/user.ts`, `api/grades.ts`, `api/courses.ts`, `api/exams.ts`, `api/admin.ts`, etc.

### Backend (`internal/`)

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
│   ├── isdead/           # Health check endpoint
│   ├── notice/           # System notices
│   ├── power/            # Power query (electricity usage)
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

### Shared Utilities

**`internal/shared/`**: Cross-module utilities that don't belong to any single domain
- `UserQuery`: Common user query operations used across multiple modules (avoids circular dependencies)

**`internal/utils/`**: General purpose utilities
- Helper functions used throughout the application

### Dependency Injection Container

The entire application is built around a centralized dependency injection container (`internal/app/container.go`). **Never use global variables** - all dependencies flow through the container:

1. **Initialization order** (in `NewContainer`):
   - Config → DB → Redis → Repositories → Caches → Services → Modules
   - RSA public key fetched on startup
   - Default admin created if not exists

2. **Adding new components**:
   - **For new modules**: Create in `internal/modules/yourmodule/` following the module pattern below
   - Always add module initialization to `container.initModules()`
   - **Handling circular dependencies**: Use delayed injection via setter methods (see Grade ↔ Reconciliation modules example in `container.go:329-334`)

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

Educational system sessions are cached in Redis (DB 0):
- **Session cookies**: 1-hour expiration
- **TGC (Ticket Granting Cookie)**: One-time use - automatically deleted after being used for evaluation system login
- `SessionService` handles login and cookie caching
- Retry logic: 3 attempts for login
- RSA encryption for passwords using public key from CAS server
- Session cookies are extracted and cached per user (uid)

### Caching Strategy

**Redis DB 0** (session Redis):
- User login sessions (1 hour expiration)
- TGC cookies (one-time use, deleted after evaluation login)
- Evaluation system accessToken (30 minutes expiration)
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

### WeChat Integration

The application supports WeChat login and binding:
- WeChat configuration in `wx` section of config files (`app_id`, `app_secret`)
- WeChat-specific error codes in `60xxx` series
- Users can bind their WeChat account to the educational system account

### Scheduled Tasks

The application uses `github.com/robfig/cron/v3` for scheduled tasks. Task definitions are in `internal/scheduler/tasks/`:

**Current scheduled tasks** (configured in `main.go`):
- **RSA public key refresh**: Every hour (`0 * * * *`) - Fetches latest RSA public key from CAS server
- **Reset bind count**: Monthly on 1st at midnight (`0 0 1 * *`) - Resets user educational system binding limits
- **User data sync**: Monthly on 1st at 2 AM (`0 2 1 * *`) - Pre-caches user grades/courses/exams for all bound users

**Adding a new scheduled task**:
1. Create task in `internal/scheduler/tasks/your_task.go` implementing the `Task` interface
2. Add task to scheduler in `main.go` `initScheduler()` function

### Error Handling

Custom error system in `internal/common/errors.go` and `pkg/errors/errors.go`:
- `AppError` with error codes - defines standardized error structure
- Error codes are centralized in `pkg/errors/errors.go` and re-exported from `internal/common/errors.go` for backward compatibility
- Standardized response format via `internal/common/response.go`
- Always use `NewAppError(code, message)` for service-level errors
- Use `IsAppError(err)` to check if an error is an AppError

**Common error codes**:
- `40xxx` series: Client errors (invalid params, unauthorized, not found, etc.)
- `50xxx` series: Server errors (internal error, database error, cache error, etc.)
- `60xxx` series: WeChat-specific errors

**Grade Query Error Handling**:
The grade module has sophisticated error handling with different strategies based on error type:
- **Unevaluated courses error** (`CodeJwcNotEvaluated`): Returns error directly without clearing binding or falling back to database
- **Authentication errors** (login failed, not bound, unauthorized): Clears user binding and returns error without database fallback
- **Timeout/network errors**: Falls back to database cache if available

### Evaluation System

**Auto-Evaluation Logic**:
- Scoring strategy: Assigns full marks to all questions, then randomly selects ONE question to deduct 1 point
- This makes automated evaluations appear more natural and realistic
- Uses `math/rand` for random question selection

**Token Management**:
- Evaluation system uses separate `accessToken` (30-minute expiration)
- TGC cookies are one-time use and deleted immediately after obtaining accessToken
- Login flow: CAS login → Get TGC → Access evaluation redirect → Get userToken → Call doLogin → Get accessToken

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
5. **Register routes**: Call `container.YourModule.RegisterRoutes(...)` in `api.SetupRoutes()` function in `internal/api/routes.go`

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

- **No tests exist yet** - the project currently lacks unit and integration tests. There are no test files or testing infrastructure set up.
- **Auto-migration only** - GORM creates tables on startup, no manual migrations
- **Go 1.25 required** - The project requires Go 1.25 or higher as specified in `go.mod`
- **Default admin**: Created on first startup with email `admin@spider-go.com` / password `123456` (change immediately in production)
- **CORS**: Configured per environment in config files under `cors` section
- **Graceful shutdown**: SIGINT/SIGTERM signals trigger cleanup of DB and Redis connections
- **Module cross-dependencies**: Some modules depend on each other (e.g., grade → reconciliation). These are set up via delayed injection in `container.initModules()` to avoid circular dependencies.

## Database Schema

Tables auto-created by GORM (auto-migration on startup):
- `users`: User accounts and bound educational system credentials
- `administrators`: Admin accounts (separate from users)
- `notices`: System notifications with display flags
- Grade/course/exam data tables: Cached educational system data for offline access
- WeChat binding tables: User-WeChat account associations

All tables are created automatically via GORM's auto-migration feature. The schema is inferred from struct tags in model files.

## Configuration Checklist for Deployment

Before deploying, update `config/config.production.yaml`:
1. Change `jwt.secret` to a strong random value
2. Update `database` credentials and connection info
3. Update `redis.session` and `redis.captcha` credentials
4. Configure `email` SMTP settings for verification codes
5. Set correct `cors.allow_origins` for your frontend domain(s)
6. Choose appropriate `jwc.mode` (campus vs webvpn) based on network
7. Configure `wx.app_id` and `wx.app_secret` for WeChat integration (if using)
8. Review and configure OSS settings if file upload functionality is needed
9. Change default admin password after first login via admin API
