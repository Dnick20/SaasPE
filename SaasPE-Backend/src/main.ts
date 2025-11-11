import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import {
  validateEnvironment,
  logValidationResults,
} from './shared/config/env-validation';
import { validateEnvWithZod } from './shared/config/env-schema';
import { GlobalExceptionFilter } from './shared/filters/global-exception.filter';
import { initSentry } from './config/sentry';

const logger = new Logger('Bootstrap');

async function bootstrap() {
  // Initialize Sentry error tracking FIRST (before anything else)
  initSentry();

  // Validate environment variables before starting application
  // Using both legacy validation and new Zod-based validation
  try {
    // New Zod-based validation (type-safe)
    const envConfig = validateEnvWithZod();
    logger.log('Environment validation with Zod succeeded');

    // Legacy validation for backwards compatibility
    const validationResult = validateEnvironment();
    logValidationResults(validationResult);
  } catch (error) {
    logger.error('Environment validation failed - cannot start application');
    process.exit(1);
  }

  const app = await NestFactory.create(AppModule);

  // Enable cookie parser
  app.use(cookieParser());

  // Global prefix for all routes
  app.setGlobalPrefix('api/v1');

  // Global exception filter for consistent error handling
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS configuration
  app.enableCors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        'http://localhost:3001',
        'http://localhost:3002',
        'http://localhost:3003',
        process.env.FRONTEND_URL,
        'https://app.saasope.com',
      ].filter(Boolean);

      // Allow all Vercel preview deployments
      if (!origin || allowedOrigins.includes(origin) || origin.includes('vercel.app')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  });

  // Swagger/OpenAPI documentation
  const config = new DocumentBuilder()
    .setTitle('SaasPE API')
    .setDescription('Agency Automation Platform API Documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User management endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger documentation: http://localhost:${port}/api/docs`);
}
bootstrap();
