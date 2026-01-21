import { DataSource } from 'typeorm';
import { Sport } from '../../modules/products/entities/sport.entity';

export class SportsSeed {
  public async run(dataSource: DataSource): Promise<void> {
    const repo = dataSource.getRepository(Sport);
    await repo.delete({});

    const sports = [
      { id: 1, name: 'Running', slug: 'running' },
      { id: 2, name: 'Fútbol', slug: 'futbol' },
      { id: 3, name: 'Natación', slug: 'natacion' },
      { id: 4, name: 'Rugby', slug: 'rugby' },
      { id: 5, name: 'Hockey', slug: 'hockey' },
      { id: 6, name: 'Fitness', slug: 'fitness' },
      { id: 7, name: 'Ciclismo', slug: 'ciclismo' },
      { id: 8, name: 'Tenis', slug: 'tenis' },
      { id: 9, name: 'Baloncesto', slug: 'baloncesto' },
    ];

    await repo.save(sports);
    console.log('✅ Sports seeded');
  }
}
