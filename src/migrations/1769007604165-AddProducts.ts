import { MigrationInterface, QueryRunner } from "typeorm";

export class AddProducts1769007604165 implements MigrationInterface {
    name = 'AddProducts1769007604165'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`SELECT 1`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`SELECT 1`);
    }

}
