import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'products' })
@Index(['category'])
@Index(['target'])
@Index(['price'])
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 240, nullable: true })
  slug: string | null;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'category_id', type: 'uuid', nullable: true })
  categoryId: string | null;

  @Column({ name: 'brand_id', type: 'uuid', nullable: true })
  brandId: string | null;

  @Column({ name: 'sport_id', type: 'uuid', nullable: true })
  sportId: string | null;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  price: string;

  @Column({ type: 'varchar', length: 3, default: 'ARS' })
  currency: string;

  @Column({ name: 'discount_percent', type: 'int', default: 0 })
  discountPercent: number;

  @Column({ type: 'int', default: 0 })
  stock: number;

  @Column({ name: 'low_stock_threshold', type: 'int', default: 10 })
  lowStockThreshold: number;

  @Column({ type: 'varchar', length: 80 })
  category: string;

  @Column({ type: 'varchar', length: 20, default: 'Hombre' })
  target: string;

  @Column({ type: 'jsonb', nullable: true })
  images: string[] | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'is_featured', type: 'boolean', default: false })
  isFeatured: boolean;

  @Column({ name: 'view_count', type: 'int', default: 0 })
  viewCount: number;

  @Column({ name: 'sales_count', type: 'int', default: 0 })
  salesCount: number;

  @Column({ name: 'rating_average', type: 'numeric', precision: 3, scale: 2, default: 0 })
  ratingAverage: string;

  @Column({ name: 'rating_count', type: 'int', default: 0 })
  ratingCount: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
