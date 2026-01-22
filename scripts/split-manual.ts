/**
 * Script para dividir Manual.md en capítulos más pequeños
 * Para que puedan cargarse con embeddings (límite: 8192 tokens)
 */

import fs from 'fs';
import path from 'path';

const manualPath = path.join(process.cwd(), 'docs', 'Manual.md');
const outputDir = path.join(process.cwd(), 'docs', 'manual-chapters');

// Crear directorio de salida si no existe
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Leer el manual completo
const content = fs.readFileSync(manualPath, 'utf-8');

// Dividir por capítulos principales (## TITULO)
// Pero no por subcapítulos (### SUBTITULO)
const lines = content.split('\n');
const chapters: Array<{ title: string; content: string; number: number }> = [];
let currentChapter: { title: string; content: string[]; number: number } | null = null;

for (const line of lines) {
  // Detectar capítulo principal (## número. TITULO)
  // Formato: ## 1. INTRODUCCIÓN Y PROPÓSITO
  if (line.match(/^## \d+\. [A-ZÁÉÍÓÚÑ]/)) {
    // Guardar capítulo anterior
    if (currentChapter) {
      chapters.push({
        title: currentChapter.title,
        content: currentChapter.content.join('\n'),
        number: currentChapter.number,
      });
    }

    // Extraer número y título del capítulo
    const match = line.match(/^## (\d+)\. (.+)$/);
    if (match) {
      currentChapter = {
        title: match[2],
        content: [line],
        number: parseInt(match[1]),
      };
    }
  } else if (currentChapter) {
    currentChapter.content.push(line);
  }
}

// Guardar último capítulo
if (currentChapter) {
  chapters.push({
    title: currentChapter.title,
    content: currentChapter.content.join('\n'),
    number: currentChapter.number,
  });
}

console.log(`\n📚 Manual dividido en ${chapters.length} capítulos:\n`);

// Guardar cada capítulo
chapters.forEach((chapter) => {
  const filename = `${String(chapter.number).padStart(2, '0')}-${chapter.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')}.md`;

  const filePath = path.join(outputDir, filename);

  // Agregar metadatos al inicio
  const chapterContent = `# ${chapter.title}\n\n_Capítulo ${chapter.number} del Manual Técnico - Portal BGB (MoveIT)_\n\n---\n\n${chapter.content}`;

  fs.writeFileSync(filePath, chapterContent, 'utf-8');

  // Estimar tokens (aproximado: 1 token ≈ 4 caracteres)
  const estimatedTokens = Math.ceil(chapterContent.length / 4);
  console.log(`${chapter.number}. ${chapter.title}`);
  console.log(`   → ${filename}`);
  console.log(`   → ~${estimatedTokens.toLocaleString()} tokens`);
  console.log(`   → ${estimatedTokens > 8000 ? '⚠️ PUEDE SER DEMASIADO GRANDE' : '✅ OK'}\n`);
});

console.log(`✅ Capítulos guardados en: ${outputDir}`);
console.log(`\nPróximo paso: Cargar los capítulos con:`);
console.log(`npx tsx scripts/load-knowledge-simple.ts`);
