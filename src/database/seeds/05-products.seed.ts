import { DataSource } from 'typeorm';
import { Product } from '../entities/product.entity';
import { generate250Products } from './utils/product-generator';

const CATEGORY_BY_ID: Record<number, string> = {
  1: 'calzado',
  2: 'ropa',
  3: 'accesorios',
  4: 'equipamiento',
};

export class ProductsSeed {
  public async run(dataSource: DataSource): Promise<void> {
    const productRepo = dataSource.getRepository(Product);
    await productRepo.clear();

    console.log('Seeding products...');

    const allProducts = generate250Products();
    const productsToSave = allProducts.map((data) => {
      const discount = data.discount_percentage || 0;
      const finalPrice = data.base_price * (1 - discount / 100);
      const category = CATEGORY_BY_ID[data.category_id] ?? 'otros';

      return productRepo.create({
        name: data.name,
        description: data.description,
        price: finalPrice.toFixed(2),
        currency: 'ARS',
        stock: data.stock,
        category,
        images: data.images.length > 0 ? data.images : null,
        isActive: true,
        isFeatured: data.is_featured || false,
      });
    });

    await productRepo.save(productsToSave);
    console.log('Products seeded');
  }
}
