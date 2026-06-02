import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ProductStatus {
  ON_SALE = 'ON_SALE',
  OFF_SALE = 'OFF_SALE',
}

export enum ProductCategory {
  FOOD = 'FOOD',
  DRINK = 'DRINK',
  FRESH = 'FRESH',
  DAILY = 'DAILY',
}

export enum OrderStatus {
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  PAID = 'PAID',
  PURCHASING = 'PURCHASING',
  DELIVERING = 'DELIVERING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

export enum PaymentStatus {
  INIT = 'INIT',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  CLOSED = 'CLOSED',
  REFUNDED = 'REFUNDED',
}

export enum AdminRole {
  ADMIN = 'ADMIN',
  DELIVERY = 'DELIVERY',
}

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('increment', { type: 'int', unsigned: true })
  id!: string;

  @Column({ length: 64, unique: true })
  openid!: string;

  @Column({ length: 64, nullable: true })
  nickname?: string;

  @Column({ name: 'avatar_url', length: 500, nullable: true })
  avatarUrl?: string;

  @Column({ length: 20, nullable: true })
  phone?: string;

  @Column({ type: 'tinyint', default: 1 })
  status!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

@Entity('admins')
export class AdminUserEntity {
  @PrimaryGeneratedColumn('increment', { type: 'int', unsigned: true })
  id!: string;

  @Column({ length: 64, unique: true })
  username!: string;

  @Column({ name: 'password_hash', length: 255 })
  passwordHash!: string;

  @Column({ type: 'simple-enum', enum: AdminRole, default: AdminRole.ADMIN })
  role!: AdminRole;

  @Column({ type: 'tinyint', default: 1 })
  status!: number;

  @Column({ name: 'last_login_at', nullable: true })
  lastLoginAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

@Entity('addresses')
export class AddressEntity {
  @PrimaryGeneratedColumn('increment', { type: 'int', unsigned: true })
  id!: string;

  @Column({ name: 'user_id', type: 'int', unsigned: true })
  userId!: string;

  @Column({ length: 32 })
  name!: string;

  @Column({ length: 20 })
  phone!: string;

  @Column({ name: 'community_name', length: 64, default: '' })
  communityName!: string;

  @Column({ name: 'building_no', length: 32 })
  buildingNo!: string;

  @Column({ name: 'unit_no', length: 32 })
  unitNo!: string;

  @Column({ name: 'room_no', length: 32 })
  roomNo!: string;

  @Column({ name: 'is_default', default: false })
  isDefault!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

@Entity('products')
export class ProductEntity {
  @PrimaryGeneratedColumn('increment', { type: 'int', unsigned: true })
  id!: string;

  @Column({ length: 120 })
  name!: string;

  @Column({ length: 255, nullable: true })
  subtitle?: string;

  @Column({ type: 'simple-enum', enum: ProductCategory, default: ProductCategory.FOOD })
  category!: ProductCategory;

  @Column({ name: 'cover_url', length: 500 })
  coverUrl!: string;

  @Column({ type: 'json', nullable: true })
  images?: string[];

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'int', unsigned: true })
  price!: number;

  @Column({ name: 'market_price', type: 'int', unsigned: true, nullable: true })
  marketPrice?: number;

  @Column({ type: 'int', unsigned: true, default: 0 })
  stock!: number;

  @Column({ type: 'int', unsigned: true, default: 0 })
  sales!: number;

  @Column({ type: 'simple-enum', enum: ProductStatus, default: ProductStatus.ON_SALE })
  status!: ProductStatus;

  @Column({ default: 0 })
  sort!: number;

  @Column({ type: 'int', unsigned: true, default: 0 })
  version!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

@Entity('carts')
@Index(['userId', 'productId'], { unique: true })
export class CartEntity {
  @PrimaryGeneratedColumn('increment', { type: 'int', unsigned: true })
  id!: string;

  @Column({ name: 'user_id', type: 'int', unsigned: true })
  userId!: string;

  @Column({ name: 'product_id', type: 'int', unsigned: true })
  productId!: string;

  @Column({ type: 'int', unsigned: true })
  quantity!: number;

  @ManyToOne(() => ProductEntity)
  @JoinColumn({ name: 'product_id' })
  product?: ProductEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

@Entity('orders')
export class OrderEntity {
  @PrimaryGeneratedColumn('increment', { type: 'int', unsigned: true })
  id!: string;

  @Column({ name: 'order_no', length: 32, unique: true })
  orderNo!: string;

  @Column({ name: 'user_id', type: 'int', unsigned: true })
  userId!: string;

  @Column({ name: 'address_id', type: 'int', unsigned: true })
  addressId!: string;

  @Column({ type: 'simple-enum', enum: OrderStatus, default: OrderStatus.PENDING_PAYMENT })
  status!: OrderStatus;

  @Column({ name: 'product_amount', type: 'int', unsigned: true })
  productAmount!: number;

  @Column({ name: 'delivery_fee', type: 'int', unsigned: true, default: 0 })
  deliveryFee!: number;

  @Column({ name: 'payable_amount', type: 'int', unsigned: true })
  payableAmount!: number;

  @Column({ name: 'paid_amount', type: 'int', unsigned: true, default: 0 })
  paidAmount!: number;

  @Column({ length: 255, nullable: true })
  remark?: string;

  @Column({ name: 'paid_at', nullable: true })
  paidAt?: Date;

  @Column({ name: 'user_deleted_at', nullable: true })
  userDeletedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

@Entity('order_items')
export class OrderItemEntity {
  @PrimaryGeneratedColumn('increment', { type: 'int', unsigned: true })
  id!: string;

  @Column({ name: 'order_id', type: 'int', unsigned: true })
  orderId!: string;

  @Column({ name: 'product_id', type: 'int', unsigned: true })
  productId!: string;

  @Column({ name: 'product_name', length: 120 })
  productName!: string;

  @Column({ name: 'product_cover_url', length: 500 })
  productCoverUrl!: string;

  @Column({ name: 'unit_price', type: 'int', unsigned: true })
  unitPrice!: number;

  @Column({ type: 'int', unsigned: true })
  quantity!: number;

  @Column({ name: 'total_price', type: 'int', unsigned: true })
  totalPrice!: number;
}

@Entity('payments')
export class PaymentEntity {
  @PrimaryGeneratedColumn('increment', { type: 'int', unsigned: true })
  id!: string;

  @Column({ name: 'order_id', type: 'int', unsigned: true })
  orderId!: string;

  @Column({ name: 'order_no', length: 32 })
  orderNo!: string;

  @Column({ name: 'out_trade_no', length: 32, unique: true })
  outTradeNo!: string;

  @Column({ name: 'transaction_id', length: 64, nullable: true, unique: true })
  transactionId?: string;

  @Column({ type: 'int', unsigned: true })
  amount!: number;

  @Column({ type: 'simple-enum', enum: PaymentStatus, default: PaymentStatus.INIT })
  status!: PaymentStatus;

  @Column({ name: 'raw_notify', type: 'json', nullable: true })
  rawNotify?: Record<string, unknown>;
}

@Entity('order_logs')
export class OrderLogEntity {
  @PrimaryGeneratedColumn('increment', { type: 'int', unsigned: true })
  id!: string;

  @Column({ name: 'order_id', type: 'int', unsigned: true })
  orderId!: string;

  @Column({ name: 'order_no', length: 32 })
  orderNo!: string;

  @Column({ name: 'from_status', length: 32, nullable: true })
  fromStatus?: string;

  @Column({ name: 'to_status', length: 32 })
  toStatus!: string;

  @Column({ name: 'operator_type', length: 32 })
  operatorType!: string;

  @Column({ name: 'operator_id', length: 64, nullable: true })
  operatorId?: string;

  @Column({ length: 255, nullable: true })
  remark?: string;
}

@Entity('login_logs')
export class LoginLogEntity {
  @PrimaryGeneratedColumn('increment', { type: 'int', unsigned: true })
  id!: string;

  @Column({ name: 'user_id', type: 'int', unsigned: true, nullable: true })
  userId?: string;

  @Column({ length: 64, nullable: true })
  openid?: string;

  @Column({ length: 64, nullable: true })
  ip?: string;

  @Column({ name: 'user_agent', length: 255, nullable: true })
  userAgent?: string;
}

@Entity('payment_logs')
export class PaymentLogEntity {
  @PrimaryGeneratedColumn('increment', { type: 'int', unsigned: true })
  id!: string;

  @Column({ name: 'order_no', length: 32 })
  orderNo!: string;

  @Column({ name: 'out_trade_no', length: 32, nullable: true })
  outTradeNo?: string;

  @Column({ name: 'event_type', length: 64 })
  eventType!: string;

  @Column({ type: 'json', nullable: true })
  payload?: Record<string, unknown>;
}

@Entity('exception_logs')
export class ExceptionLogEntity {
  @PrimaryGeneratedColumn('increment', { type: 'int', unsigned: true })
  id!: string;

  @Column({ length: 255 })
  path!: string;

  @Column({ length: 16 })
  method!: string;

  @Column({ type: 'text' })
  message!: string;

  @Column({ type: 'text', nullable: true })
  stack?: string;
}

export const entities = [
  UserEntity,
  AdminUserEntity,
  AddressEntity,
  ProductEntity,
  CartEntity,
  OrderEntity,
  OrderItemEntity,
  PaymentEntity,
  OrderLogEntity,
  LoginLogEntity,
  PaymentLogEntity,
  ExceptionLogEntity,
];
