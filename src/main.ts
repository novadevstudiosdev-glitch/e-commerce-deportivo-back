import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import passport from 'passport';
import type { Request, Response } from 'express';
import { AppModule } from './app.module';
import adminRoutes from './routes/admin.routes';
import meRoutes from './routes/me.routes';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix
  app.setGlobalPrefix('api');

  // Passport
  app.use(passport.initialize());

  // Minimal callback page for OAuth tests (no frontend required).
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.get('/auth/callback', (req: Request, res: Response) => {
    const token = req.query.token;
    const error = req.query.error;

    if (error) {
      return res.status(400).send(`OAuth error: ${error}`);
    }

    if (!token || Array.isArray(token)) {
      return res.status(400).send('Missing token');
    }

    return res.send(`token=${token}`);
  });

  expressApp.use(meRoutes);
  expressApp.use(adminRoutes);

  // CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('somosHenry API')
    .setDescription(
      'API documentation for NovaDev e-commerce deportivo project',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User management')
    .addTag('notifications', 'Notifications')
    .addTag('dashboard', 'Admin dashboard')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();
