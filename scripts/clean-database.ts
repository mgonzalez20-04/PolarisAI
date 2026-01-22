import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanDatabase() {
  console.log('🧹 Limpiando base de datos...\n');

  try {
    // 1. Eliminar mensajes de conversaciones del agente
    const deletedMessages = await prisma.agentMessage.deleteMany({});
    console.log(`✅ Eliminados ${deletedMessages.count} mensajes del agente`);

    // 2. Eliminar conversaciones del agente
    const deletedConversations = await prisma.agentConversation.deleteMany({});
    console.log(`✅ Eliminadas ${deletedConversations.count} conversaciones del agente`);

    // 3. Eliminar feedback del agente
    const deletedFeedback = await prisma.agentFeedback.deleteMany({});
    console.log(`✅ Eliminados ${deletedFeedback.count} registros de feedback`);

    // 4. Eliminar métricas del agente
    const deletedMetrics = await prisma.agentMetrics.deleteMany({});
    console.log(`✅ Eliminadas ${deletedMetrics.count} métricas del agente`);

    // 5. Eliminar casos
    const deletedCases = await prisma.case.deleteMany({});
    console.log(`✅ Eliminados ${deletedCases.count} casos`);

    // 6. Eliminar relaciones email-tag
    const deletedEmailTags = await prisma.emailTag.deleteMany({});
    console.log(`✅ Eliminadas ${deletedEmailTags.count} relaciones email-tag`);

    // 7. Eliminar emails
    const deletedEmails = await prisma.email.deleteMany({});
    console.log(`✅ Eliminados ${deletedEmails.count} correos`);

    // 8. Eliminar tags
    const deletedTags = await prisma.tag.deleteMany({});
    console.log(`✅ Eliminados ${deletedTags.count} tags`);

    // 9. Eliminar carpetas
    const deletedFolders = await prisma.folder.deleteMany({});
    console.log(`✅ Eliminadas ${deletedFolders.count} carpetas`);

    // 10. Eliminar chunks de conocimiento
    const deletedChunks = await prisma.knowledgeChunk.deleteMany({});
    console.log(`✅ Eliminados ${deletedChunks.count} chunks de conocimiento`);

    // 11. Eliminar documentos de conocimiento
    const deletedDocs = await prisma.knowledgeDocument.deleteMany({});
    console.log(`✅ Eliminados ${deletedDocs.count} documentos de conocimiento`);

    // 12. Eliminar sesiones
    const deletedSessions = await prisma.session.deleteMany({});
    console.log(`✅ Eliminadas ${deletedSessions.count} sesiones`);

    // 13. Eliminar usuarios
    const deletedUsers = await prisma.user.deleteMany({});
    console.log(`✅ Eliminados ${deletedUsers.count} usuarios`);

    console.log('\n✨ Base de datos limpiada exitosamente!');
    console.log('📝 Ahora puedes conectar con una nueva cuenta de Microsoft.');
  } catch (error) {
    console.error('❌ Error al limpiar la base de datos:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

cleanDatabase()
  .catch((error) => {
    console.error('Error fatal:', error);
    process.exit(1);
  });
