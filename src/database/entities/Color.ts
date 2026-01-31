import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'colors' })
export class Color {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 60 })
  name: string;

  @Column({ type: 'varchar', length: 12, nullable: true })
  hex: string | null;
}
