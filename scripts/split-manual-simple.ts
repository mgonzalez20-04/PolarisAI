import fs from 'fs';
import path from 'path';

const manualPath = path.join(process.cwd(), 'docs', 'Manual.md');
const outputDir = path.join(process.cwd(), 'docs', 'manual-chapters');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const content = fs.readFileSync(manualPath, 'utf-8');
const lines = content.split('\n');

interface Chapter {
  number: number;
  title: string;
  startLine: number;
  endLine?: number;
}

const chapters: Chapter[] = [];

// Encontrar todos los capítulos
lines.forEach((line, index) => {
  if (line.startsWith('## ') && /^## \d+\./.test(line)) {
    const match = line.match(/^## (\d+)\. (.+)$/);
    if (match) {
      // Marcar el final del capítulo anterior
      if (chapters.length > 0) {
        chapters[chapters.length - 1].endLine = index - 1;
      }

      chapters.push({
        number: parseInt(match[1]),
        title: match[2],
        startLine: index,
      });
    }
  }
});

// Marcar el final del último capítulo
if (chapters.length > 0) {
  chapters[chapters.length - 1].endLine = lines.length - 1;
}

console.log(`\n📚 Encontrados ${chapters.length} capítulos en el Manual:\n`);

// Guardar cada capítulo
chapters.forEach((chapter) => {
  const chapterLines = lines.slice(chapter.startLine, (chapter.endLine || lines.length) + 1);
  const chapterContent = chapterLines.join('\n');

  const filename = `${String(chapter.number).padStart(2, '0')}-${chapter.title
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Quitar acentos
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50)}.md`;

  const filePath = path.join(outputDir, filename);

  // Agregar encabezado
  const fullContent = `# Manual Portal BGB - ${chapter.title}\n\n_Capítulo ${chapter.number} del Manual Técnico_\n\n---\n\n${chapterContent}`;

  fs.writeFileSync(filePath, fullContent, 'utf-8');

  const tokens = Math.ceil(fullContent.length / 4);
  const status = tokens > 8000 ? '⚠️  GRANDE' : '✅ OK';

  console.log(`${chapter.number}. ${chapter.title}`);
  console.log(`   Archivo: ${filename}`);
  console.log(`   Tokens: ~${tokens.toLocaleString()} ${status}\n`);
});

console.log(`✅ Capítulos guardados en: docs/manual-chapters/`);
