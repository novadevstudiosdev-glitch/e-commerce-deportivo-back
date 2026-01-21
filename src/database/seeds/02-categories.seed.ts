import { DataSource } from 'typeorm';
import { Category } from '../../modules/products/entities/category.entity';

export class CategoriesSeed {
  public async run(dataSource: DataSource): Promise<void> {
    const repo = dataSource.getRepository(Category);
    await repo.delete({});

    const categories = [
      {
        id: 1,
        name: 'Calzado',
        slug: 'calzado',
        description: 'Zapatillas deportivas para todos los deportes',
        display_order: 1,
      },
      {
        id: 2,
        name: 'Ropa',
        slug: 'ropa',
        description: 'Indumentaria deportiva de alto rendimiento',
        display_order: 2,
      },
      {
        id: 3,
        name: 'Accesorios',
        slug: 'accesorios',
        description: 'Complementos y accesorios deportivos',
        display_order: 3,
      },
      {
        id: 4,
        name: 'Equipamiento',
        slug: 'equipamiento',
        description: 'Equipamiento profesional para entrenar',
        display_order: 4,
      },
    ];

    await repo.save(categories);
    console.log('✅ Categories seeded');
  }
}
