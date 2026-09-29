import 'reflect-metadata'
import { resolve } from 'node:path'
import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import dotenv from 'dotenv'

dotenv.config({ path: resolve(__dirname, '../../../.env') })

async function bootstrap(): Promise<void> {
  const { AppModule } = await import('./app.module')
  const app = await NestFactory.create(AppModule)
  app.setGlobalPrefix('api')
  const allowedOrigins = (process.env.WEB_ORIGIN ?? 'http://localhost:5173,http://localhost:5174,http://localhost:8081,http://localhost:8082')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  })

  const openApiConfig = new DocumentBuilder()
    .setTitle('Luxxie API')
    .setDescription('API do Luxxie para imóveis, autenticação e busca geográfica.')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build()
  const document = SwaggerModule.createDocument(app, openApiConfig)
  SwaggerModule.setup('docs', app, document, { swaggerOptions: { persistAuthorization: true } })

  const port = Number(process.env.PORT ?? 3000)
  await app.listen(port, '0.0.0.0')
  process.stdout.write(`Luxxie API listening on port ${port}\n`)
}

bootstrap().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
