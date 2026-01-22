const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const folders = await prisma.folder.findMany({
      orderBy: { folderPath: 'asc' }
    });

    console.log(`\nTotal carpetas: ${folders.length}\n`);

    folders.forEach(f => {
      console.log(`- ${f.displayName}`);
      console.log(`  Path: ${f.folderPath}`);
      console.log(`  Visible: ${f.isVisible}`);
      console.log(`  Parent: ${f.parentFolderId || 'null'}`);
      console.log(`  Unread: ${f.unreadCount}/${f.totalCount}`);
      console.log('');
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
})();
