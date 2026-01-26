import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductTarget1769157000000 implements MigrationInterface {
  name = 'AddProductTarget1769157000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "products" ADD "target" character varying(20) NOT NULL DEFAULT 'Hombre'`,
    );
    await queryRunner.query(
      `UPDATE "products" SET "target" = 'Accesorio' WHERE "category" = 'accesorios'`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_products_target" ON "products" ("target")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_products_target"`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "target"`);
  }
}
