import {
  Module,
  MiddlewareConsumer,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import emailConfig from './config/email.config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LoggerMiddleware } from './common/middlewares/logger.middleware';

// Modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
// import { FilesModule } from './modules/files/files.module';
// import { NotificationsModule } from './modules/notifications/notifications.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { EmailModule } from './modules/email/email.module';
import { ShippingModule } from './modules/shipping/shipping.module';

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [emailConfig],
    }),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const readString = (key: string) => {
          const value = configService.get<string | Uint8Array>(key);
          if (typeof value === 'string') {
            return value;
          }
          if (value instanceof Uint8Array) {
            return Buffer.from(value).toString();
          }
          return undefined;
        };

        const databaseUrl = readString('DATABASE_URL');
        const useSsl =
          readString('DB_SSL') === 'true' ||
          (!!databaseUrl && databaseUrl.includes('supabase.co'));

        const nodeEnv = readString('NODE_ENV');

        return {
          type: 'postgres',
          ...(databaseUrl
            ? { url: databaseUrl }
            : {
                host: readString('DB_HOST'),
                port: +(readString('DB_PORT') ?? 5432),
                username: readString('DB_USERNAME'),
                password: readString('DB_PASSWORD'),
                database: readString('DB_DATABASE'),
              }),
          ssl: useSsl ? { rejectUnauthorized: false } : undefined,
          extra: useSsl ? { ssl: { rejectUnauthorized: false } } : undefined,
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize: nodeEnv === 'development',
          logging: nodeEnv === 'development',
        };
      },
      inject: [ConfigService],
    }),

    // Schedule (for cron jobs)
    ScheduleModule.forRoot(),

    // Feature modules
    AuthModule,
    UsersModule,
    // FilesModule,
    // NotificationsModule,
    DashboardModule,
    EmailModule,
    ShippingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware)
      .forRoutes({ path: '*path', method: RequestMethod.ALL });
  }
}
