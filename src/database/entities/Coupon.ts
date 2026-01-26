import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export const COUPON_TYPES = ['percent', 'fixed'] as const;
export type CouponType = (typeof COUPON_TYPES)[number];

@Entity({ name: 'coupons' })
@Index(['code'], { unique: true })
export class Coupon {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  code: string;

  @Column({ type: 'varchar', length: 20 })
  type: CouponType;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  value: string;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @Column({ name: 'starts_at', type: 'timestamptz', nullable: true })
  startsAt: Date | null;

  @Column({ name: 'ends_at', type: 'timestamptz', nullable: true })
  endsAt: Date | null;

  @Column({
    name: 'min_order_total',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  minOrderTotal: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
