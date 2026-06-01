# BUG 检查记录

执行时间：2026-05-31

已执行检查：

- JSON 配置校验：`backend` 与 `miniprogram` 下所有 JSON 文件均可解析。
- 空文件检查：未发现空的源码、配置、文档或 SQL 文件。
- TODO/FIXME/console.log 检查：未发现遗留调试标记。
- 后端依赖安装：已安装 Node.js/npm，并完成 `npm install`。
- 后端构建：`npm run build` 通过。
- 后端单元测试：`npm test` 通过。
- 静态代码审查：修复了以下问题：
  - 小程序 JSON 读取检查需显式使用 UTF-8，文件本身编码正常。
  - `CartEntity.product` 增加 `@JoinColumn({ name: 'product_id' })`，避免关系字段映射歧义。
  - `JwtAuthGuard` 依赖的 `JwtModule` 改为从全局 `AuthModule` 导出，避免业务模块守卫注入失败。
  - 支付预下单重复调用时复用已有 `Payment`，避免唯一索引冲突。
  - 财务统计 SQL 避免使用 `order` 作为别名，规避 MySQL 关键字风险。
  - Excel 导出返回值转为 `Buffer`，便于 Express 正确发送文件。
  - 移除未使用的 `bcrypt`，避免无意义的原生编译依赖。
  - 固定 `@sqltools/formatter` 到可用版本，修复 TypeORM/Jest 运行时解析失败。

注意事项：

- `npm install` 报告 33 个依赖审计告警，主要来自间接依赖。生产上线前建议结合 lockfile 执行一次人工审计，不建议直接 `npm audit fix --force` 破坏 NestJS 依赖树。
- 端到端测试需要 MySQL 和 Redis 已启动后再运行：

```bash
npm run test:e2e
```
