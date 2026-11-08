# 产品知识库

一个 Next.js 练习项目。页面、接口、SQL 和 Agent 在同一个仓库里，用来看清一次提问怎么走完。

提问时的路径：

1. 页面把当前型号和问题发给 `app/api/chat/route.ts`
2. 接口调用对话模型
3. 模型选择 `searchDocs` 或 `getSpec`
4. 工具执行 SQL，只查当前型号
5. 模型根据工具结果写出回答，页面流式显示，并展开引用

## 目录对应哪一层

- `app/components/Workbench.tsx`：前端。型号、手册、参数、对话、工具轨迹、引用
- `app/api/chat/route.ts`：后端接口。这就是 Agent 循环
- `app/api/catalog/route.ts`：后端接口。左边的资料直接来自数据库
- `app/api/search/route.ts`：只检索、不生成回答，用来单独看切片对不对
- `db/schema.sql`、`db/seed.sql`：手写 SQL
- `lib/tools.ts`：两个工具。型号用页面传来的 `productId`，不采用模型自己填的型号
- `content/`：两份说明书。X1 和 X2 的容量、指示灯不同；功率只写在参数表

## 启动

复制环境变量：

```bash
copy .env.example .env.local
```

在 `.env.local` 填入硅基流动的 `AI_API_KEY`。对话模型 `THUDM/GLM-4-9B-0414` 和嵌入模型 `BAAI/bge-m3`（1024 维）在其价格页标为免费。换嵌入模型时，要同时改 `db/schema.sql` 里的 `vector(1024)`，再重新执行 `npm run db:setup` 和 `npm run ingest`。

数据库二选一，端口都是 `54329`。

没有 Docker 时，在一个终端启动本机 PostgreSQL（PGlite，带 pgvector）：

```bash
npm run db:up
```

已安装 Docker 时，改用：

```bash
docker compose up -d
```

然后在另一个终端：

```bash
npm run db:setup
npm run ingest
npm run dev
```

打开 http://localhost:3000 。先切换 X1 和 X2，确认左边的参数变了。再问「额定功率是多少」和「支持无线充电吗」。问 X1 时，工具结果里不能出现 `8000mAh` 或无线充电。

验收：

```bash
npm run eval
```

八个问题要能答出手册或参数表里的原文；资料没写的要回答「资料里没有」。
