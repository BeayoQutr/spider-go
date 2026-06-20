# Spider-Go

中南林业科技大学教务系统爬虫与管理平台。提供成绩查询、课程表、考试安排、教评、排名分析等功能。

## 技术栈

| 层 | 技术 |
|---|---|
| 后端 | Go 1.25 + Gin + GORM + MySQL + Redis |
| 前端 | React 19 + TypeScript + Vite + TailwindCSS v4 + Recharts |
| 工具 | JWT 鉴权、Cron 定时任务、Gomail 邮件服务 |

## 快速开始

### 环境要求

- Go 1.25+
- MySQL 8.0+
- Redis 5.0+
- Node.js 20+（仅开发前端时需要）

### 1. 配置

```bash
cp config/config.dev.yaml.example config/config.dev.yaml
```

编辑 `config/config.dev.yaml`，填写你的数据库、Redis、邮箱等配置。

### 2. 启动后端

```bash
go run main.go -env=dev
```

默认监听 `http://localhost:8080`，API 路径为 `/api/*`。

### 3. 启动前端（开发模式）

```bash
cd frontend
npm install
npm run dev
```

开发模式下 Vite 代理 `/api` 到 `localhost:8080`，访问 `http://localhost:5173`。

### 4. 生产部署

```bash
# 编译后端
go build -o spider-go.exe

# 构建前端
cd frontend && npm run build

# 启动（后端同时提供前端静态文件）
./spider-go.exe -env=dev
```

访问 `http://localhost:8080`，前后端合一（后端默认提供 `frontend/dist/` 下的静态文件）。

## 项目结构

```
spider-go/
├── main.go                  # 入口：启动服务器 + 定时任务 + 静态文件
├── config/                  # 配置文件（YAML）
├── internal/
│   ├── api/                 # 路由注册
│   ├── app/                 # 依赖注入容器
│   ├── cache/               # Redis 缓存层
│   ├── middleware/           # JWT / CORS 中间件
│   ├── modules/             # 业务模块（DDD 分层）
│   │   ├── user/            #   用户认证与绑定
│   │   ├── grade/           #   成绩查询与分析
│   │   ├── course/          #   课程表
│   │   ├── exam/            #   考试安排
│   │   ├── evaluation/      #   教学评价
│   │   ├── ranking/         #   排名查询
│   │   ├── reconciliation/  #   数据同步
│   │   └── ...              #   更多模块
│   ├── scheduler/           # 定时任务（Cron）
│   ├── service/             # 基础设施服务（会话/爬虫/邮件）
│   └── shared/              # 跨模块工具
├── pkg/                     # 可复用库
│   ├── email/               #   邮件客户端
│   ├── errors/              #   错误码体系
│   ├── httpclient/          #   HTTP 客户端
│   └── redis/               #   Redis 客户端
├── frontend/                # React 前端
│   ├── src/
│   │   ├── api/             #   API 调用层
│   │   ├── pages/           #   页面组件
│   │   ├── components/      #   通用组件
│   │   └── stores/          #   Zustand 状态管理
│   └── package.json
└── API.md                   # API 接口文档
```

## Windows 开机自启

将后端注册为 Windows 服务：

1. 编译：`go build -o spider-go-dev.exe`
2. 构建前端：`cd frontend && npm run build`
3. 将 `spider-go-dev.exe` 的快捷方式放入启动文件夹，或使用 VBS 脚本：
   ```vbscript
   Set WshShell = CreateObject("WScript.Shell")
   WshShell.CurrentDirectory = "项目目录路径"
   WshShell.Run "项目目录路径\spider-go-dev.exe -env=dev", 0, False
   ```
4. 桌面创建快捷方式指向 `http://localhost:8080`

## 默认管理员

| 邮箱 | 密码 |
|---|---|
| admin@spider-go.com | 123456 |

首次启动自动创建，请尽快修改密码。

## 许可证

MIT
