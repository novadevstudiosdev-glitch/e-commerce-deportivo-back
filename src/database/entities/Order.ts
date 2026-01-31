import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { OrderItem } from './OrderItem';
import { Payment } from './Payment';

export const ORDER_STATUSES = [
  'pendiente_pago',
  'pagado',
  'en_preparacion',
  'enviado',
  'entregado',
  'reembolsado',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

@Entity({ name: 'orders' })
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 20, default: 'pendiente_pago' })
  status: OrderStatus;

  @Column({ type: 'varchar', length: 3, default: 'ARS' })
  currency: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  subtotal: string;

  @Column({
    name: 'shipping_total',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  shippingTotal: string;

  @Column({
    name: 'discount_total',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  discountTotal: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  total: string;

  @Column({ name: 'shipping_provider', type: 'varchar', length: 40, nullable: true })
  shippingProvider: string | null;

  @Column({ name: 'shipping_type', type: 'varchar', length: 20, nullable: true })
  shippingType: string | null;

  @Column({ name: 'shipping_price', type: 'numeric', precision: 12, scale: 2, nullable: true })
  shippingPrice: string | null;

  @Column({ name: 'shipping_meta', type: 'jsonb', nullable: true })
  shippingMeta: Record<string, unknown> | null;

  @Column({ name: 'shipping_address', type: 'jsonb', nullable: true })
  shippingAddress: Record<string, unknown> | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @OneToMany(() => OrderItem, (item) => item.order)
  items: OrderItem[];

  @OneToOne(() => Payment, (payment) => payment.order, { nullable: true })
  payment: Payment | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
