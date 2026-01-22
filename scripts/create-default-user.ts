import { PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();

async function createDefaultUser() {
  console.log('🔑 Creando usuario por defecto...\n');

  const email = 'admin@inbox-copilot.com';
  const password = 'admin123'; // Puedes cambiarlo después
  const name = 'Administrador';

  try {
    // Verificar si ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.log(`⚠️  El usuario ${email} ya existe.`);
      console.log(`📧 Email: ${email}`);
      console.log(`🆔 ID: ${existingUser.id}`);
      console.log(`\nSi olvidaste la contraseña, elimina el usuario y ejecuta este script de nuevo.`);
      return;
    }

    // Hashear contraseña
    const hashedPassword = await hash(password, 10);

    // Crear usuario
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: 'admin',
      },
    });

    console.log('✅ Usuario creado exitosamente!\n');
    console.log('📧 Email:', email);
    console.log('🔒 Password:', password);
    console.log('🆔 ID:', user.id);
    console.log('👤 Rol:', user.role);
    console.log('\n🌐 Inicia sesión en: http://localhost:3000/auth/signin');
    console.log('\n⚠️  IMPORTANTE: Cambia la contraseña después del primer login!');
  } catch (error) {
    console.error('❌ Error al crear usuario:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createDefaultUser()
  .catch((error) => {
    console.error('Error fatal:', error);
    process.exit(1);
  });
