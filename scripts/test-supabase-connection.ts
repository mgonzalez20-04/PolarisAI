/**
 * Script para probar la conexión a Supabase
 */

import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';

// Cargar variables de entorno
dotenvConfig({ path: resolve(process.cwd(), '.env.local') });

import { PrismaClient } from '@prisma/client';

async function testConnection() {
  console.log('='.repeat(60));
  console.log('Prueba de Conexión a Supabase (PostgreSQL)');
  console.log('='.repeat(60));
  console.log('');

  console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✓ Configurada' : '❌ NO CONFIGURADA');
  console.log('');

  if (!process.env.DATABASE_URL) {
    console.error('❌ Error: DATABASE_URL no encontrada en .env.local');
    process.exit(1);
  }

  const prisma = new PrismaClient();

  try {
    console.log('🔄 Intentando conectar a Supabase...');

    // Probar conexión simple
    await prisma.$connect();
    console.log('✅ Conexión establecida!');
    console.log('');

    // Probar consulta simple
    console.log('📋 Probando consulta simple...');
    const result = await prisma.$queryRaw`SELECT NOW() as timestamp, version() as version`;
    console.log('✅ Consulta exitosa:');
    console.log(result);
    console.log('');

    // Verificar tablas
    console.log('📋 Verificando tablas...');
    const tables = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
      LIMIT 10
    `;
    console.log('✅ Tablas encontradas:');
    console.log(tables);

    await prisma.$disconnect();
    console.log('');
    console.log('='.repeat(60));
    console.log('✅ CONEXIÓN A SUPABASE EXITOSA');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('');
    console.error('❌ ERROR DE CONEXIÓN');
    console.error('='.repeat(60));
    console.error(error);
    console.error('');
    console.error('Posibles soluciones:');
    console.error('1. Verifica que la instancia de Supabase esté activa');
    console.error('2. Verifica la contraseña en .env.local');
    console.error('3. Verifica que tu IP esté permitida en Supabase (Settings > Database > Connection Pooling)');
    console.error('4. Verifica que el SSL esté configurado correctamente');
    await prisma.$disconnect();
    process.exit(1);
  }
}

testConnection();
