import { DataSource } from 'typeorm';
import { Brand } from '../../modules/products/entities/brand.entity';

export class BrandsSeed {
  public async run(dataSource: DataSource): Promise<void> {
    const repo = dataSource.getRepository(Brand);
    await repo.delete({});

    const brands = [
      { id: 1, name: 'Nike', slug: 'nike' },
      { id: 2, name: 'Adidas', slug: 'adidas' },
      { id: 3, name: 'Puma', slug: 'puma' },
      { id: 4, name: 'Reebok', slug: 'reebok' },
      { id: 5, name: 'Under Armour', slug: 'under-armour' },
      { id: 6, name: 'New Balance', slug: 'new-balance' },
      { id: 7, name: 'Asics', slug: 'asics' },
      { id: 8, name: 'Salomon', slug: 'salomon' },
    ];

    await repo.save(brands);
    console.log('✅ Brands seeded');
  }
}
