import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import express from 'express';
import passport from 'passport';
import type { Request, Response } from 'express';
import { AppModule } from './app.module';
import { applySwaggerExtras } from './swagger/swagger-extras';
import adminRoutes from './modules/admin/routes/admin.routes';
import meRoutes from './modules/users/routes/me.routes';
import userRoutes from './modules/users/routes/user.routes';
import adminProductRoutes from './modules/products/routes/admin.product.routes';
import productRoutes from './modules/products/routes/product.routes';
import orderRoutes from './modules/orders/routes/order.routes';
import cartRoutes from './modules/cart/routes/cart.routes';
import userOrderRoutes from './modules/orders/routes/user.orders.routes';
import adminOrderRoutes from './modules/orders/routes/admin.order.routes';
import paymentRoutes from './modules/payments/routes/payment.routes';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix
  app.setGlobalPrefix('api');

  // Passport
  app.use(passport.initialize());

  // Minimal callback page for OAuth tests (no frontend required).
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.use(express.json());
  expressApp.use(express.urlencoded({ extended: true }));
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

  expressApp.use('/api', meRoutes);
  expressApp.use('/api', adminRoutes);
  expressApp.use('/api', userRoutes);
  expressApp.use('/api/admin/products', adminProductRoutes);
  expressApp.use('/api', productRoutes);
  expressApp.use('/api', cartRoutes);
  expressApp.use('/api', userOrderRoutes);
  expressApp.use('/api', paymentRoutes);
  expressApp.use(orderRoutes);
  expressApp.use('/admin/orders', adminOrderRoutes);

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
    .setTitle('NovadevAPI')
    .setDescription(
      'API documentation for NovaDev e-commerce deportivo project',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User management')
    .addTag('products', 'Product catalog')
    .addTag('orders', 'Order management')
    .addTag('cart', 'Cart operations')
    .addTag('payments', 'Payment operations')
    .addTag('admin', 'Admin operations')
    .addTag('system', 'System utilities')
    .addTag('notifications', 'Notifications')
    .addTag('dashboard', 'Admin dashboard')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  const swaggerDocument = applySwaggerExtras(document);
  SwaggerModule.setup('api/docs', app, swaggerDocument, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();




