# 成长计划

面向家庭的本地学习进度与积分奖励管理应用。第一版使用浏览器界面、本地 Node.js 后端和 SQLite 数据库，不需要账号或密码。

## 本地运行

```bash
npm install
npm run dev
```

打开 `http://127.0.0.1:5173`。API 运行在 `http://127.0.0.1:3001`，SQLite 数据默认保存在 `data/edu.sqlite`。

## 检查

```bash
npm run typecheck
npm test
npm run test:e2e
npm run build
```
