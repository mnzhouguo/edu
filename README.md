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
- `PORT`：API 端口，默认 `3001`

首次启动会自动创建目录并执行全部 SQLite 迁移。

## 检查

```bash
npm run typecheck
npm test
npm run test:e2e
npm run build
```

API 测试使用临时 SQLite 和临时 Photo Library。浏览器测试使用 `test-results/e2e.sqlite` 与 `test-results/e2e-photos`，每次启动前会清空。
