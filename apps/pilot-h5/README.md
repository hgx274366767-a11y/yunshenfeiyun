# 云深飞运 H5 飞手端

川渝首个无人机吊运服务平台 - H5飞手端试点工具

## 技术栈

- **框架**: Vue 3 + TypeScript
- **构建工具**: Vite 6
- **UI 组件库**: Vant 4
- **状态管理**: Pinia
- **路由**: Vue Router 4
- **后端**: Supabase (PostgreSQL + Edge Functions)
- **样式**: SCSS

## 项目结构

```
src/
├── api/              # API 接口层
│   ├── auth.ts       # 认证相关
│   ├── orders.ts     # 订单相关
│   └── supabase.ts   # Supabase 客户端
├── composables/      # 组合式函数
├── router/           # 路由配置
├── stores/           # Pinia 状态管理
│   ├── auth.ts       # 认证状态
│   ├── orders.ts     # 订单状态
│   └── pilot.ts      # 飞手状态
├── styles/           # 全局样式
│   ├── variables.scss # 设计变量
│   ├── reset.scss    # 样式重置
│   └── global.scss   # 全局样式
├── types/            # TypeScript 类型定义
│   ├── index.ts      # 通用类型
│   └── database.ts   # 数据库类型
├── views/            # 页面组件
│   ├── auth/         # 登录页面
│   ├── orders/       # 订单列表/详情
│   ├── profile/      # 个人中心
│   ├── hall/         # 接单大厅
│   ├── order/        # 任务详情
│   └── task/         # 任务执行
├── App.vue           # 根组件
└── main.ts           # 入口文件
```

## 功能模块

1. **登录认证** - 手机号 + 验证码登录
2. **接单大厅** - 查看可抢订单列表
3. **订单详情** - 查看订单信息、接受订单
4. **任务执行** - 飞手执行任务流程
5. **个人中心** - 飞手信息、设置

## 快速开始

### 安装依赖

```bash
pnpm install
```

### 配置环境变量

复制 `.env.example` 为 `.env.local`，填入 Supabase 配置：

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 启动开发服务器

```bash
pnpm dev
```

### 构建生产版本

```bash
pnpm build
```

## 代码规范

- **TypeScript 严格模式** - 启用所有严格类型检查
- **ESLint** - 使用 @antfu/eslint-config
- **Prettier** - 统一代码格式
- **SCSS 变量** - 所有颜色、间距、字体使用变量

## 设计规范

基于 UI 原型提取的设计系统：

- **主色调**: #4361EE (品牌蓝)
- **字体大小**: 11px - 24px
- **圆角**: 6px - 16px
- **间距**: 4px - 32px

详见 `src/styles/variables.scss`
