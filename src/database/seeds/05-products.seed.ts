import { DataSource } from 'typeorm';
import { Product } from '../../modules/products/entities/product.entity';
import { ProductImage } from '../../modules/products/entities/product-image.entity';
import { ProductVariant } from '../../modules/products/entities/product-variant.entity';

export class ProductsSeed {
  public async run(dataSource: DataSource): Promise<void> {
    const productRepo = dataSource.getRepository(Product);
    const imageRepo = dataSource.getRepository(ProductImage);
    const variantRepo = dataSource.getRepository(ProductVariant);

    // Limpiar tablas
    await variantRepo.delete({});
    await imageRepo.delete({});
    await productRepo.delete({});

    console.log('Seeding products...');

    // Helper function
    const createProduct = async (data: {
      sku: string;
      name: string;
      slug: string;
      description: string;
      category_id: number;
      sport_id: number | null;
      brand_id: number | null;
      base_price: number;
      discount_percentage?: number;
      stock: number;
      is_featured?: boolean;
      images: string[];
      variants: Array<{
        color: string;
        color_hex: string;
        size: string;
        stock: number;
      }>;
    }) => {
      const discount = data.discount_percentage || 0;
      const final_price = parseFloat(
        (data.base_price * (1 - discount / 100)).toFixed(2),
      );

      const product = await productRepo.save({
        sku: data.sku,
        name: data.name,
        slug: data.slug,
        description: data.description,
        category_id: data.category_id,
        sport_id: data.sport_id,
        brand_id: data.brand_id,
        base_price: data.base_price,
        discount_percentage: discount,
        final_price,
        stock: data.stock,
        low_stock_threshold: 10,
        is_featured: data.is_featured || false,
        is_active: true,
      });

      // Images
      for (let i = 0; i < data.images.length; i++) {
        await imageRepo.save({
          product_id: product.id,
          image_url: data.images[i],
          alt_text: data.name,
          display_order: i,
          is_primary: i === 0,
        });
      }

      // Variants
      for (const variant of data.variants) {
        await variantRepo.save({
          product_id: product.id,
          color: variant.color,
          color_hex: variant.color_hex,
          size: variant.size,
          sku_variant: `${data.sku}-${variant.color.substring(0, 3).toUpperCase()}-${variant.size}`,
          stock: variant.stock,
          additional_price: 0,
          is_active: true,
        });
      }

      return product;
    };

    // Importar productos generados
    const { generate250Products } = await import('./utils/product-generator');
    const allProducts = generate250Products();

    // Crear todos los productos
    for (const productData of allProducts) {
      await createProduct(productData);
    }

    /* EJEMPLO MANUAL (por si prefieres hacerlo manualmente):
    await createProduct({
      sku: 'ZRP-2024-001',
      name: 'Zapatillas Running Pro Elite',
      slug: 'zapatillas-running-pro-elite',
      description: 'Zapatillas de running profesionales con tecnología de amortiguación avanzada que absorbe el impacto. Perfectas para largas distancias y entrenamientos intensos.',
      category_id: 1,
      sport_id: 1,
      brand_id: 1,
      base_price: 129.99,
      discount_percentage: 31,
      stock: 45,
      is_featured: true,
      images: [
        'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800',
        'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800',
      ],
      variants: [
        { color: 'Azul', color_hex: '#4169E1', size: '38', stock: 8 },
        { color: 'Azul', color_hex: '#4169E1', size: '39', stock: 10 },
        { color: 'Azul', color_hex: '#4169E1', size: '40', stock: 12 },
        { color: 'Azul', color_hex: '#4169E1', size: '41', stock: 15 },
        { color: 'Negro', color_hex: '#000000', size: '40', stock: 8 },
        { color: 'Negro', color_hex: '#000000', size: '42', stock: 10 },
      ],
    });

    // ... [AQUÍ IRÍAN LOS OTROS 249 PRODUCTOS]
    // Por razones de espacio, te muestro la estructura
    // Tú puedes generar el resto siguiendo este patrón

    console.log('✅ Products seeded successfully!');
  }
*/
  }
}
