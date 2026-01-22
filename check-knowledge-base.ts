import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';
dotenvConfig({ path: resolve(process.cwd(), '.env.local') });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkKnowledgeBase() {
  try {
    const total = await prisma.knowledgeDocument.count();

    const docs = await prisma.knowledgeDocument.findMany({
      select: { category: true, title: true, source: true },
      orderBy: { source: 'asc' }
    });

    console.log('\n📚 BASE DE CONOCIMIENTOS COMPLETA\n');
    console.log(`Total documentos: ${total}\n`);

    // Agrupar por categoría
    const grouped: Record<string, string[]> = {};
    docs.forEach(doc => {
      const cat = doc.category || 'sin-categoria';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(doc.title);
    });

    console.log('Por categoría:');
    Object.entries(grouped).forEach(([cat, titles]) => {
      console.log(`\n✅ ${cat} (${titles.length} documentos)`);
      titles.slice(0, 3).forEach(t => console.log(`   • ${t}`));
      if (titles.length > 3) {
        console.log(`   ... y ${titles.length - 3} más`);
      }
    });

    console.log('\n✅ Base de conocimientos lista para n8n/OpenAI');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkKnowledgeBase();
