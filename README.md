# 成长计划

面向家庭的本地学习进度与积分奖励管理应用。第一版使用浏览器界面、本地 Node.js 后端和 SQLite 数据库，不需要账号或密码。

## 本地运行

```bash
npm install
npm run dev
```

打开 `http://127.0.0.1:5173`。API 运行在 `http://127.0.0.1:3001`。

## 数据目录

| 路径 | 内容 |
| --- | --- |
| `data/edu.sqlite` | 默认 Local Database，保存孩子档案、计划、评价、积分流水、奖励和错题 |
| `data/photos/` | 默认 Photo Library，保存学习提交和错题的图片文件；数据库只存相对路径和元数据 |

可用环境变量覆盖：

- `DATABASE_PATH`：SQLite 文件路径
- `PHOTO_LIBRARY`：Photo Library 目录
- `PORT`：API 端口，默认 `3001`（被占用时会自动改用空闲端口）
- `WEB_ROOT`：可选，已构建前端目录；未设置时若存在 `dist/index.html` 会自动托管

首次启动会自动创建目录并执行全部 SQLite 迁移。

## 安装包

Windows 安装程序把前端和本地后端包进同一个桌面应用，用户不需要单独安装 Node.js。安装后从桌面或开始菜单打开「成长计划」。

```bash
npm install
npm run dist:win
```

生成的安装文件在 `release/ChengZhangPlan-Setup-1.0.0.exe`。安装包数据目录：

| 路径 | 内容 |
| --- | --- |
| `%APPDATA%\成长计划\edu.sqlite` | Local Database |
| `%APPDATA%\成长计划\photos\` | Photo Library |

开发时也可以直接跑桌面外壳（会先编译前端和主进程）：

```bash
npm run desktop
```

生产模式的 Node 入口同样可以在同一端口托管已构建的前端：`npm run build:web && npm start`，然后打开 `http://127.0.0.1:3001`。

若下载 Electron 失败（常见于访问 GitHub 较慢的网络），先设置镜像再打包：

```powershell
$env:ELECTRON_MIRROR='https://npmmirror.com/mirrors/electron/'
npm run dist:win
```

## 检查

```bash
npm run typecheck
npm test
npm run test:e2e
npm run build
```

API 测试使用临时 SQLite 和临时 Photo Library。浏览器测试使用 `test-results/e2e.sqlite` 与 `test-results/e2e-photos`，每次启动前会清空。
