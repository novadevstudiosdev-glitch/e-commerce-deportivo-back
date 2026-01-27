import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1768945666105 implements MigrationInterface {
    name = 'InitialSchema1768945666105'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "addresses" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "full_name" character varying NOT NULL, "phone" character varying NOT NULL, "street_address" character varying NOT NULL, "city" character varying NOT NULL, "state" character varying NOT NULL, "postal_code" character varying NOT NULL, "country" character varying NOT NULL, "is_default" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_745d8f43d3af10ab8247465e450" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "user_preferences" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "newsletter" boolean NOT NULL DEFAULT false, "promotions" boolean NOT NULL DEFAULT false, "order_updates" boolean NOT NULL DEFAULT false, "new_products" boolean NOT NULL DEFAULT false, "preferred_shoe_size" character varying, "preferred_clothing_size" character varying, "favorite_sports" jsonb, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_458057fa75b66e68a275647da2e" UNIQUE ("user_id"), CONSTRAINT "REL_458057fa75b66e68a275647da2" UNIQUE ("user_id"), CONSTRAINT "PK_e8cfb5b31af61cd363a6b6d7c25" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "password" character varying, "google_id" character varying, "role" character varying NOT NULL DEFAULT 'usuario', "is_active" boolean NOT NULL DEFAULT true, "email_verified" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "user_profiles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "first_name" character varying NOT NULL, "last_name" character varying NOT NULL, "dni" character varying, "phone" character varying, "date_of_birth" date, "avatar_url" character varying, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_6ca9503d77ae39b4b5a6cc3ba88" UNIQUE ("user_id"), CONSTRAINT "REL_6ca9503d77ae39b4b5a6cc3ba8" UNIQUE ("user_id"), CONSTRAINT "PK_1ec6662219f4605723f1e41b6cb" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "addresses" ADD CONSTRAINT "FK_16aac8a9f6f9c1dd6bcb75ec023" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_preferences" ADD CONSTRAINT "FK_458057fa75b66e68a275647da2e" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_profiles" ADD CONSTRAINT "FK_6ca9503d77ae39b4b5a6cc3ba88" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_profiles" DROP CONSTRAINT "FK_6ca9503d77ae39b4b5a6cc3ba88"`);
        await queryRunner.query(`ALTER TABLE "user_preferences" DROP CONSTRAINT "FK_458057fa75b66e68a275647da2e"`);
        await queryRunner.query(`ALTER TABLE "addresses" DROP CONSTRAINT "FK_16aac8a9f6f9c1dd6bcb75ec023"`);
        await queryRunner.query(`DROP TABLE "user_profiles"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TABLE "user_preferences"`);
        await queryRunner.query(`DROP TABLE "addresses"`);
    }

}
