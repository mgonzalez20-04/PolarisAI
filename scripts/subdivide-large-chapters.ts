import fs from 'fs';
import path from 'path';

const chaptersDir = path.join(process.cwd(), 'docs', 'manual-chapters');
const largeChapters = [
  '03-modelo-de-base-de-datos.md',
  '04-modulos-funcionales.md',
  '05-flujos-de-negocio-criticos.md'
];

console.log('\n🔪 Subdividiendo capítulos grandes...\n');

for (const chapterFile of largeChapters) {
  const filePath = path.join(chaptersDir, chapterFile);

  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  No encontrado: ${chapterFile}`);
    continue;
  }

  const content = fs.readFileSync(filePath, 'utf-8');

  // Encontrar subsecciones (###)
  const subsectionRegex = /^### (\d+\.\d+) (.+)$/gm;
  const matches: Array<{number: string, title: string, index: number}> = [];
  let match;

  while ((match = subsectionRegex.exec(content)) !== null) {
    matches.push({
      number: match[1],
      title: match[2],
      index: match.index
    });
  }

  if (matches.length === 0) {
    console.log(`⚠️  ${chapterFile}: No se encontraron subsecciones\n`);
    continue;
  }

  console.log(`📄 ${chapterFile}: ${matches.length} subsecciones\n`);

  // Obtener el capítulo principal (## X. TITULO)
  const mainChapterMatch = content.match(/^## (\d+)\. (.+)$/m);
  if (!mainChapterMatch) continue;

  const mainChapterNum = mainChapterMatch[1];
  const mainChapterTitle = mainChapterMatch[2];

  // Agrupar subsecciones en partes que no excedan 7000 tokens
  const parts: Array<{subsections: typeof matches, content: string}> = [];
  let currentPart: typeof matches = [];
  let currentPartContent = '';
  let currentPartTokens = 0;

  // Agregar encabezado inicial antes de la primera subsección
  const firstSubsectionIndex = matches[0].index;
  const introContent = content.substring(0, firstSubsectionIndex).trim();

  for (let i = 0; i < matches.length; i++) {
    const subsection = matches[i];
    const nextSubsection = matches[i + 1];

    const startIndex = subsection.index;
    const endIndex = nextSubsection ? nextSubsection.index : content.length;
    const subsectionContent = content.substring(startIndex, endIndex).trim();
    const subsectionTokens = Math.ceil(subsectionContent.length / 4);

    // Si agregar esta subsección excede el límite, guardar la parte actual
    if (currentPartTokens + subsectionTokens > 7000 && currentPart.length > 0) {
      parts.push({
        subsections: [...currentPart],
        content: currentPartContent
      });
      currentPart = [];
      currentPartContent = '';
      currentPartTokens = 0;
    }

    currentPart.push(subsection);
    currentPartContent += (currentPartContent ? '\n\n' : '') + subsectionContent;
    currentPartTokens += subsectionTokens;
  }

  // Agregar última parte
  if (currentPart.length > 0) {
    parts.push({
      subsections: currentPart,
      content: currentPartContent
    });
  }

  console.log(`   → Dividido en ${parts.length} partes\n`);

  // Guardar cada parte
  parts.forEach((part, index) => {
    const partNumber = index + 1;
    const filename = chapterFile.replace('.md', `-parte-${partNumber}.md`);
    const filePath = path.join(chaptersDir, filename);

    const firstSection = part.subsections[0].number;
    const lastSection = part.subsections[part.subsections.length - 1].number;
    const sectionRange = firstSection === lastSection ? firstSection : `${firstSection}-${lastSection}`;

    const fullContent = `# Manual Portal BGB - ${mainChapterTitle} (Parte ${partNumber})\n\n_Capítulo ${mainChapterNum} - Secciones ${sectionRange}_\n\n---\n\n${index === 0 ? introContent + '\n\n---\n\n' : ''}${part.content}`;

    fs.writeFileSync(filePath, fullContent, 'utf-8');

    const tokens = Math.ceil(fullContent.length / 4);
    console.log(`   ✅ Parte ${partNumber}: ${part.subsections.length} subsecciones, ~${tokens.toLocaleString()} tokens`);
    console.log(`      → ${filename}`);
  });

  // Eliminar archivo original grande
  fs.unlinkSync(filePath);
  console.log(`   🗑️  Eliminado: ${chapterFile}\n`);
}

console.log('✅ Subdivisión completada\n');
