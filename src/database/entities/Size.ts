import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'sizes' })
export class Size {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 40 })
  name: string;

  @Column({ type: 'varchar', length: 20 })
  type: 'ropa' | 'calzado' | 'unico';

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;
}
