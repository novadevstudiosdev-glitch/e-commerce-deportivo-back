import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateRolesToUsuario1769520000000 implements MigrationInterface {
    name = 'UpdateRolesToUsuario1769520000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`UPDATE "users" SET "role" = 'usuario' WHERE "role" = 'customer'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`UPDATE "users" SET "role" = 'customer' WHERE "role" = 'usuario'`);
    }
}
