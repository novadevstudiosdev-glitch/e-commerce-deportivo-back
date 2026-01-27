import { DataSource } from 'typeorm';
import { Product } from '../entities/product.entity';
import { generate250Products } from './utils/product-generator';
import type { ProductData } from './utils/product-generator';

const CATEGORY_BY_ID: Record<number, string> = {
  1: 'Calzado',
  2: 'Ropa',
  3: 'Accesorios',
  4: 'Equipamiento',
};

const TARGETS = ['Hombre', 'Mujer', 'Ni\u00f1o', 'Accesorio'] as const;
type TargetValue = (typeof TARGETS)[number];

const normalizeSize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const hasSmallSize = (sizes: string[]) => {
  if (sizes.includes('xs')) return true;
  return sizes.some((size) => {
    const num = Number(size);
    return Number.isFinite(num) && num > 0 && num <= 35;
  });
};

const normalizeCategory = (value: string) =>
  value.trim().toLowerCase();

const inferTarget = (data: ProductData, category: string): TargetValue => {
  const normalizedCategory = normalizeCategory(category);

  if (normalizedCategory === 'accesorios') {
    return 'Accesorio';
  }

  const sizes = (data.variants ?? []).map((variant) =>
    normalizeSize(variant.size),
  );
  const hasXL = sizes.includes('xl') || sizes.includes('xxl');

  if (normalizedCategory === 'ropa' && hasSmallSize(sizes) && !hasXL) {
    return 'Ni\u00f1o';
  }

  const hash = data.sku.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return hash % 2 === 0 ? 'Hombre' : 'Mujer';
};

export class ProductsSeed {
  public async run(dataSource: DataSource): Promise<void> {
    const productRepo = dataSource.getRepository(Product);

    await dataSource.query(
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "target" character varying(20) NOT NULL DEFAULT 'Hombre'`,
    );
    await dataSource.query(
      `CREATE INDEX IF NOT EXISTS "IDX_products_target" ON "products" ("target")`,
    );
    await dataSource.query(`TRUNCATE TABLE "products" CASCADE`);

    console.log('Seeding products...');

    const allProducts = generate250Products();
    const productsToSave = allProducts.map((data) => {
      const discount = data.discount_percentage || 0;
      const category = CATEGORY_BY_ID[data.category_id] ?? 'otros';
      const target = inferTarget(data, category);

      return productRepo.create({
        name: data.name,
        description: data.description,
        price: data.base_price.toFixed(2),
        currency: 'ARS',
        stock: data.stock,
        discountPercent: discount,
        category,
        target,
        images: data.images.length > 0 ? data.images : null,
        isActive: true,
        isFeatured: data.is_featured || false,
      });
    });

    await productRepo.save(productsToSave);
    console.log('Products seeded');
  }
}
