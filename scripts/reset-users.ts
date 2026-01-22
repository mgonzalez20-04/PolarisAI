import { PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();

async function resetUsers() {
  console.log('🗑️  Eliminando todos los usuarios...\n');

  try {
    // 1. Eliminar todos los usuarios (y en cascada sus relaciones)
    const deleted = await prisma.user.deleteMany({});
    console.log(`✅ Eliminados ${deleted.count} usuarios\n`);

    // 2. Crear nuevo usuario admin
    const email = 'admin@local.com';
    const password = 'admin';
    const name = 'admin';

    const hashedPassword = await hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: 'admin',
      },
    });

    console.log('✅ Nuevo usuario creado:\n');
    console.log('📧 Email:', email);
    console.log('🔒 Password:', password);
    console.log('🆔 ID:', user.id);
    console.log('👤 Rol:', user.role);
    console.log('\n🌐 Inicia sesión en: http://localhost:3000/auth/signin');
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

resetUsers()
  .catch((error) => {
    console.error('Error fatal:', error);
    process.exit(1);
  });
