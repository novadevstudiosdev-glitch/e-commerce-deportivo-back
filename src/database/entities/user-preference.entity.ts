import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity({ name: 'user_preferences' })
export class UserPreference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid', unique: true })
  userId: string;

  @OneToOne(() => User, (user) => user.preference, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'boolean', default: false })
  newsletter: boolean;

  @Column({ type: 'boolean', default: false })
  promotions: boolean;

  @Column({ name: 'order_updates', type: 'boolean', default: false })
  orderUpdates: boolean;

  @Column({ name: 'new_products', type: 'boolean', default: false })
  newProducts: boolean;

  @Column({ name: 'preferred_shoe_size', type: 'varchar', nullable: true })
  preferredShoeSize: string | null;

  @Column({ name: 'preferred_clothing_size', type: 'varchar', nullable: true })
  preferredClothingSize: string | null;

  @Column({ name: 'favorite_sports', type: 'jsonb', nullable: true })
  favoriteSports: string[] | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
