# 数据库设计

数据库：MySQL 8，字符集 `utf8mb4`，金额单位统一使用“分”，避免浮点误差。

核心设计：

- 商品库存使用 `stock` + `version` 乐观锁扣减。
- 订单主表保存金额快照，订单明细保存商品价格快照。
- 支付回调通过 `transaction_id` 和 `out_trade_no` 唯一索引实现幂等。
- 日志按业务拆为登录、订单、支付、异常日志。
- 地址字段按需求拆分：姓名、手机号、栋号、单元号、门牌号。

完整 SQL 见 [backend/src/database/schema.sql](../backend/src/database/schema.sql)。

