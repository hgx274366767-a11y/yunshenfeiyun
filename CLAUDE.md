# 云深飞运 - 项目中枢

## 一、项目概述

### 1.1 公司与业务

- **公司**：云深飞运（重庆）科技有限公司
- **定位**：川渝首个无人机吊运服务平台，定位"低空货拉拉"
- **核心能力**：垂直上下山吊运，解决山区"公路到不了、人力背运慢"的痛点，覆盖农资/农产品/林木/基建建材等多品类吊运，不是低空物流配送

**服务场景**：

| 场景类型 | 具体内容 | 优先级 |
|---------|---------|-------|
| 农资上山 | 化肥、种子、农药等从公路边吊运至山上农田/村社 | ★★★ |
| 农产品下山 | 巫山脆李、中药材等从山上吊运至公路集散点 | ★★★ |
| 基建建材吊运 | 光伏板、水泥、砂石等从公路边吊运至山上施工点 | ★★★ |
| 应急吊运 | 药品、急救物资短距垂直吊运（如道路中断时） | ★★☆ |
| 林业物资上山 | 护林设备、防火物资等 | ★★☆ |

**核心模式**：平台撮合型（不做运营商），连接需求端（农户/合作社/企业）与运力端（持证飞手/无人机运营方）

### 1.2 团队背景

- 4人大学生团队，公司已注册
- 当前进展：小程序Demo已有设计方案，动态定价算法已有完整代码
- 运营机型：大疆T100（吊运载重85kg，抗风4级）起步，后续扩展大疆FlyCart系列及其他厂商吊运无人机型号；覆盖农产品、林木物资、基建建材（光伏板、水泥等）多品类吊运场景

---

## 二、技术栈决策

### 2.1 技术选型

| 层级 | 技术选型 | 说明 |
|------|---------|------|
| 前端框架 | UniApp (Vue3 + TypeScript + Vant Weapp) | 一套代码编译到微信/支付宝/H5 |
| 客户端小程序 | 微信小程序（独立AppID） | 面向农户/合作社/企业 |
| 飞手端小程序 | 微信小程序（独立AppID） | 面向持证飞手/运营方 |
| 后端服务 | 火山引擎Supabase | PostgreSQL + Auth + Realtime + Storage + Edge Functions（字节跳动国内版） |
| 管理后台 | Directus | 自动生成后台UI，开箱即用 |
| AI开发工具 | Claude Code + GStack | Y Combinator CEO开源的AI工作流框架 |
| 客户端地图 | 腾讯位置服务（腾讯地图SDK） | 客户端地图选点、距离计算 |
| 飞手导航 | 高德地图 | 飞手端导航跳转（URL Scheme跳转） |
| 支付服务 | 微信支付（V3 API） | JSAPI支付，需商户号 |

### 2.2 火山引擎Supabase选型理由

- 国内节点低延迟：服务器位于国内，API响应更快
- 数据合规：符合国内数据法规要求
- Serverless按需付费：闲置零收费，MVP阶段成本低（约50-100元/月）
- 微信认证开箱即用：内置微信登录支持
- 100%兼容Supabase API：代码无需修改，连接地址换成火山引擎即可
- 迁移灵活性：未来可零成本迁移到Supabase官方或自建

---

## 三、项目目录结构规范

```
yunshen-drone-delivery/
├── CLAUDE.md
├── apps/
│   ├── client/
│   │   └── src/
│   │       ├── pages/
│   │       ├── components/
│   │       ├── api/
│   │       ├── services/insurance/    # 保险服务（策略模式）
│   │       ├── store/
│   │       └── utils/
│   └── pilot/
│       └── src/
│           ├── pages/
│           │   ├── index/             # 接单大厅（分层抢单）
│           │   ├── task/execute/     # 任务执行 + 高德导航
│           │   └── flight-log/       # 飞行记录上传（CSV）
│           └── ...
├── supabase/
│   ├── migrations/001_initial_schema.sql
│   └── functions/
│       ├── pricing/
│       ├── order-grab/               # 分层抢单
│       ├── auto-dispatch/            # 自动派单
│       ├── flight-record/            # 飞行记录解析
│       ├── insurance/                # 保险服务
│       └── ...
└── admin/
```

---

## 四、数据库核心表清单

完整建表SQL在 Step 3 中提供，此处仅列出表清单和核心关系。

### 核心表

| 表名 | 说明 | 核心字段 |
|------|------|---------|
| users | 用户表 | id, phone, role, credit_score, credit_level |
| pilots | 飞手表 | user_id, license_, drone_, online_status, cert_status |
| orders | 订单表 | user_id, pilot_id, status, deposit_type, is_large_order |
| dispatch_logs | 派单日志表 | order_id, pilot_id, dispatch_type, score_breakdown |
| flight_records | 飞行记录表 | order_id, file_url, parsed_data, anomalies |
| insurance_policies | 保险保单表 | order_id, policy_number, coverage_type, premium |
| insurance_providers | 保险提供商配置表 | provider_code, api_endpoint, rates |
| deposits | 保证金记录表 | user_id, order_id, deposit_type, amount |

### 核心关系

- users ──1:1── pilots
- users ──1:N── orders
- orders ──1:1── insurance_policies
- orders ──1:N── dispatch_logs
- orders ──1:N── flight_records

---

## 五、代码规范

### 5.1 命名约定

| 类型 | 规范 | 示例 |
|------|------|------|
| 文件名 | 小写字母+下划线 | order_service.ts |
| 类名 | PascalCase | PricingEngine |
| 函数名 | camelCase | calculatePrice |
| 常量 | UPPER_SNAKE_CASE | UNIT_PRICE |
| 数据库表 | snake_case | flight_records |
| API路由 | kebab-case | /order-grab |

### 5.2 代码风格

- TypeScript：严格模式启用
- ESLint：使用 @typescript-eslint
- Prettier：单引号、分号、2空格缩进
- 注释：公共API必须JSDoc注释

### 5.3 Git提交规范

| 类型 | 用途 |
|------|------|
| feat | 新功能 |
| fix | 修复bug |
| docs | 文档更新 |
| style | 代码格式 |
| refactor | 重构 |
| test | 测试 |
| chore | 构建/工具 |

---

## 六、配置化规范

**原则**：所有可能变更的规则、阈值、系数都必须做成配置项存数据库，不能硬编码。

### 6.1 必须配置化的项

| 模块 | 配置项 | 存储位置 |
|------|--------|---------|
| 动态定价 | 单价基准、载重系数、地形因子等 | pricing_config |
| 信用分 | 等级阈值、加减分值、封顶值 | credit_score_config |
| 保险 | 费率、保额比例 | insurance_config |
| 保证金 | 比例、大额阈值 | payment_config |
| 分层抢单 | 时间窗口、各等级权限 | grab_config |
| 自动派单 | 触发时长、确认超时、免扣次数 | dispatch_config |

### 6.2 配置获取方式

```typescript
// 通过 Supabase 获取配置
const { data } = await supabase
  .from('system_config')
  .select('config_key, config_value')
  .eq('config_group', 'pricing')
  .eq('is_active', true);
```

---

## 七、API设计规范

### 7.1 RESTful规范

| 方法 | 用途 | 示例 |
|------|------|------|
| GET | 查询资源 | GET /orders/:id |
| POST | 创建资源 | POST /orders |
| PATCH | 部分更新 | PATCH /orders/:id/status |
| DELETE | 删除资源 | DELETE /orders/:id |

### 7.2 响应格式

```json
// 成功响应
{
  "success": true,
  "data": { ... }
}

// 错误响应
{
  "success": false,
  "error": {
    "code": "ORDER_NOT_FOUND",
    "message": "订单不存在"
  }
}
```

---

## 八、环境变量

```bash
# 火山引擎Supabase
SUPABASE_URL=https://xxx.volcengineapi.com
SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# 微信
WX_CLIENT_APPID=wx_xxx
WX_PILOT_APPID=wx_xxx
WX_PAY_MCHID=xxx
WX_PAY_V3_SECRET=xxx

# 高德地图
AMAP_KEY=xxx

# 腾讯位置服务
QQMAP_KEY=xxx
```

---

## 九、CEO产品规划评审结果（2026-05-14）

### 9.1 评审决策

- **实现方案**：方案A — 双端小程序MVP（UniApp + Supabase），全链路下单到完成
- **评审模式**：SCOPE EXPANSION（范围扩展）
- **团队**：4人，预计6-10周

### 9.2 MVP扩展范围（4项已加入）

| # | 扩展功能 | 工作量 | 核心要点 |
|---|---------|--------|---------|
| 1 | 实时飞行追踪 | M | Supabase Realtime + 腾讯地图SDK，飞手手机GPS每5秒上报，前台WebSocket/后台10秒轮询回退 |
| 2 | 应急救援模式 | S | Directus后台一键开启，所有在线飞手广播通知，应急订单0佣金红色置顶 |
| 3 | 供需预测（规则驱动） | M | 静态作物日历配置表，管理员配置"6月=巫山脆李采收季"，提前3天自动通知区域内飞手。V2升级为ML模型 |
| 4 | 保险全自动 | S | 下单自动生成保单记录（MVP平台内部记录，V2对接真实保险API），保费内置约3%，理赔入口在订单详情页 |

### 9.3 推迟到V2

- 语音下单（微信语音→订单草稿）
- 村级信任网络（同村优先匹配+邻里推荐）
- ML供需预测模型
- 真实保险公司API对接
- 无人机SDK机载遥测
- GPS真实性校验（反模拟器）

### 9.4 非功能性需求（MVP）

| 指标 | 目标 |
|------|------|
| 位置更新延迟 | <5s p95（前台），<15s（后台轮询） |
| 订单创建→飞手通知 | <3s |
| 定价计算响应 | <500ms |
| 可用性 | 99%（单节点Supabase，MVP接受约7h/月不可用） |
| GPS轨迹保留 | 90天 |

### 9.5 核心边界情况处理

| 场景 | 处理 |
|------|------|
| GPS信号丢失（山区常见） | 显示"信号弱"，保留最后位置，超5分钟标记"位置异常" |
| 无飞手接单 | 15分钟后通知用户"暂无飞手可用"，订单挂起 |
| 飞手途中取消 | 订单重回抢单池，通知用户"飞手已变更" |
| 地图选点失败 | 回退手动输入地址+管理员补录距离 |
| 支付SDK未就绪 | 先存"待支付"订单，SDK就绪后从列表重新发起 |
| 小程序退后台 | WebSocket断开→10秒轮询，前台恢复→切回Realtime |
| 空状态 | 客户端引导"发布第一个需求"，飞手端"暂无订单，有新单会通知" |
| 并发抢单 | 数据库行级锁保证唯一飞手 |

### 9.6 团队分工建议

| 角色 | 负责 |
|------|------|
| 前端A（客户端） | UniApp客户端小程序全部页面 + 腾讯地图SDK集成 |
| 前端B（飞手端+管理） | UniApp飞手端全部页面 + Directus管理后台配置 |
| 后端A（数据+逻辑） | Supabase数据库+迁移、定价Edge Function、派单/抢单逻辑 |
| 后端B（集成+基础设施） | 微信支付V3、地图SDK服务端、Realtime通道、认证 |

### 9.7 关键路径警告

- **微信支付商户号审核**：3-4周（微信侧不可压缩），是整个项目的关键路径
- **小程序审核**：两个AppID独立审核，各1-2周
- 建议：今天开始申请微信支付商户号，审核期间并行开发前端页面+后端Edge Function

### 9.8 错误处理原则

- 定价计算服务端100%完成（客户端只传参不传价）
- 所有微信API调用走Edge Function（secret只存环境变量）
- 3个不可恢复错误：雷电/大风≥6级→禁止作业、签名验证失败→拒绝回调、并发抢单冲突→先到先得
- 所有外部API调用（天气、地图）必须有fallback默认值

### 9.9 数据库迁移策略

- 只增不改（forward-only migrations）
- 废弃列用`deprecated_`前缀标记，V2清理
- 不写down migration

### 9.10 UI设计策略

- 先出全部设计稿再开发（参赛项目需要视觉统一性）
- Vant Weapp组件库 + 品牌色
- 目标用户40-60岁农户：最小字号16px，图标配中文，价格数字最大号
- 颜色语义：绿色=完成/安全，红色=应急/需注意，橙色=进行中

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore
