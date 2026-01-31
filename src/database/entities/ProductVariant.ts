import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'product_variants' })
export class ProductVariant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @Column({ type: 'varchar', length: 200, unique: true })
  sku: string;

  @Column({ name: 'size_id', type: 'uuid', nullable: true })
  sizeId: string | null;

  @Column({ name: 'color_id', type: 'uuid', nullable: true })
  colorId: string | null;

  @Column({ name: 'base_price', type: 'numeric', precision: 12, scale: 2 })
  basePrice: string;

  @Column({ name: 'discount_percentage', type: 'int', default: 0 })
  discountPercentage: number;

  @Column({ name: 'final_price', type: 'numeric', precision: 12, scale: 2, nullable: true })
  finalPrice: string | null;

  @Column({ type: 'int', default: 0 })
  stock: number;

  @Column({ name: 'low_stock_threshold', type: 'int', default: 0 })
  lowStockThreshold: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
