import fs from 'fs';
import path from 'path';

const manualPath = path.join(process.cwd(), 'docs', 'Manual.md');
const outputDir = path.join(process.cwd(), 'docs', 'manual-chapters');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const content = fs.readFileSync(manualPath, 'utf-8');

// Encontrar todos los capítulos usando regex
const chapterRegex = /^## (\d+)\. (.+)$/gm;
const matches: Array<{number: number, title: string, index: number}> = [];
let match;

while ((match = chapterRegex.exec(content)) !== null) {
  matches.push({
    number: parseInt(match[1]),
    title: match[2],
    index: match.index
  });
}

console.log(`\n📚 Encontrados ${matches.length} capítulos:\n`);

// Dividir el contenido
for (let i = 0; i < matches.length; i++) {
  const currentChapter = matches[i];
  const nextChapter = matches[i + 1];

  // Extraer contenido del capítulo
  const startIndex = currentChapter.index;
  const endIndex = nextChapter ? nextChapter.index : content.length;
  const chapterContent = content.substring(startIndex, endIndex).trim();

  // Crear nombre de archivo
  const filename = `${String(currentChapter.number).padStart(2, '0')}-${currentChapter.title
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50)}.md`;

  const filePath = path.join(outputDir, filename);

  // Contenido completo con metadata
  const fullContent = `# Manual Portal BGB - ${currentChapter.title}\n\n_Capítulo ${currentChapter.number} del Manual Técnico Portal BGB (MoveIT)_\n\n---\n\n${chapterContent}`;

  fs.writeFileSync(filePath, fullContent, 'utf-8');

  // Estimar tokens
  const tokens = Math.ceil(fullContent.length / 4);
  const status = tokens > 8000 ? '⚠️ ' : '✅';

  console.log(`${status} Cap ${currentChapter.number}: ${currentChapter.title}`);
  console.log(`   → ${filename}`);
  console.log(`   → ~${tokens.toLocaleString()} tokens\n`);
}

console.log(`✅ Capítulos guardados en: docs/manual-chapters/\n`);
console.log(`Próximo paso: Cargar con load-knowledge-simple.ts`);
