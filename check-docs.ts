import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';
dotenvConfig({ path: resolve(process.cwd(), '.env.local') });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDocs() {
  try {
    const docs = await prisma.knowledgeDocument.findMany({
      where: { source: { startsWith: 'docs/' } },
      select: { title: true, category: true },
      orderBy: { createdAt: 'asc' }
    });

    console.log(`\n📚 Documentos cargados en la base de conocimientos: ${docs.length}\n`);

    docs.forEach((d, i) => {
      console.log(`${i + 1}. ${d.title}`);
      console.log(`   Categoría: ${d.category}\n`);
    });

    console.log('✅ La base de conocimientos está lista para búsquedas vectoriales');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDocs();
