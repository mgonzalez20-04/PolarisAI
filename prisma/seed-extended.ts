import { PrismaClient } from "@prisma/client";
import { hash } from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting extended seed...");

  // Create sample user for seed data
  // NOTE: This user is only used to associate sample resolved cases
  // You cannot sign in with this account (credentials auth is disabled)
  const hashedPassword = await hash("sample123", 10);
  const user = await prisma.user.upsert({
    where: { email: "sample@seed-data.local" },
    update: {},
    create: {
      email: "sample@seed-data.local",
      name: "Sample Seed User",
      password: hashedPassword,
      role: "user",
    },
  });

  console.log("Created sample user for seed data:", user.email);

  // Array de correos de ejemplo (25 correos)
  const demoEmails = [
    {
      messageId: "bmw-001",
      subject: "Problema con sistema iDrive - Pantalla negra",
      from: "Carlos Martínez",
      fromEmail: "carlos.martinez@gmail.com",
      receivedAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hora
      bodyPreview: "Mi BMW X5 2023 muestra pantalla negra en el iDrive después de la última actualización...",
      isRead: false,
      priority: "high",
      hasCase: false,
    },
    {
      messageId: "bmw-002",
      subject: "Consulta: Mantenimiento programado 50.000 km",
      from: "Laura Sánchez",
      fromEmail: "laura.sanchez@outlook.com",
      receivedAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 horas
      bodyPreview: "Hola, mi BMW Serie 3 está por cumplir 50.000 km. ¿Qué incluye el mantenimiento?",
      isRead: false,
      priority: "normal",
      hasCase: false,
    },
    {
      messageId: "bmw-003",
      subject: "ERROR: Sistema de frenos - Luz amarilla",
      from: "Miguel Rodríguez",
      fromEmail: "miguel.r@hotmail.com",
      receivedAt: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 horas
      bodyPreview: "Se encendió la luz de advertencia de frenos. El coche frena bien pero me preocupa...",
      isRead: false,
      priority: "high",
      hasCase: false,
    },
    {
      messageId: "bmw-004",
      subject: "Solicitud de presupuesto - Cambio de neumáticos",
      from: "Ana García",
      fromEmail: "ana.garcia@empresa.com",
      receivedAt: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 horas
      bodyPreview: "Necesito cambiar los 4 neumáticos de mi BMW Serie 5. ¿Pueden enviarme presupuesto?",
      isRead: true,
      priority: "normal",
      hasCase: false,
    },
    {
      messageId: "bmw-005",
      subject: "BMW ConnectedDrive no sincroniza con mi teléfono",
      from: "Roberto López",
      fromEmail: "roberto.lopez@icloud.com",
      receivedAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 horas
      bodyPreview: "No logro conectar mi iPhone 15 con el sistema. Ya reinicié el Bluetooth...",
      isRead: false,
      priority: "normal",
      hasCase: false,
    },
    {
      messageId: "bmw-006",
      subject: "Ruido extraño en la suspensión delantera",
      from: "Patricia Fernández",
      fromEmail: "patricia.f@gmail.com",
      receivedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 día
      bodyPreview: "Desde hace una semana escucho un ruido metálico al pasar por baches...",
      isRead: true,
      priority: "normal",
      hasCase: false,
    },
    {
      messageId: "bmw-007",
      subject: "URGENTE: Batería descargada - No arranca",
      from: "David Moreno",
      fromEmail: "david.moreno@yahoo.com",
      receivedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 días
      bodyPreview: "Mi BMW está en el parking del trabajo y no arranca. La batería está muerta...",
      isRead: true,
      priority: "high",
      hasCase: false,
    },
    {
      messageId: "bmw-008",
      subject: "Cambio de aceite - Disponibilidad esta semana",
      from: "Elena Ruiz",
      fromEmail: "elena.ruiz@correo.com",
      receivedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 días
      bodyPreview: "¿Tienen disponibilidad esta semana para cambio de aceite y filtros?",
      isRead: true,
      priority: "normal",
      hasCase: false,
    },
    {
      messageId: "bmw-009",
      subject: "Pregunta: Garantía extendida - ¿Vale la pena?",
      from: "Francisco Jiménez",
      fromEmail: "fjimenez@mail.com",
      receivedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 días
      bodyPreview: "Mi garantía vence en 2 meses. ¿Recomiendan contratar la extensión?",
      isRead: true,
      priority: "normal",
      hasCase: false,
    },
    {
      messageId: "bmw-010",
      subject: "Aceite en el piso debajo del motor",
      from: "Isabel Torres",
      fromEmail: "isabel.torres@email.com",
      receivedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 días
      bodyPreview: "Noté manchas de aceite en mi plaza de garaje. Parece venir del motor...",
      isRead: true,
      priority: "high",
      hasCase: false,
    },
    {
      messageId: "bmw-011",
      subject: "Cita para revisión pre-ITV",
      from: "Javier Castro",
      fromEmail: "jcastro@provider.com",
      receivedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), // 6 días
      bodyPreview: "La ITV vence el próximo mes. ¿Pueden hacer revisión previa?",
      isRead: true,
      priority: "normal",
      hasCase: false,
    },
    {
      messageId: "bmw-012",
      subject: "Sistema de navegación desactualizado",
      from: "Carmen Ortiz",
      fromEmail: "carmen.ortiz@domain.com",
      receivedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 días
      bodyPreview: "Los mapas están muy antiguos. ¿Cómo actualizo el GPS?",
      isRead: true,
      priority: "normal",
      hasCase: false,
    },
    {
      messageId: "bmw-013",
      subject: "Consumo elevado de combustible últimamente",
      from: "Antonio Vega",
      fromEmail: "avega@email.net",
      receivedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 días
      bodyPreview: "El consumo ha subido de 6L/100km a 9L/100km sin razón aparente...",
      isRead: true,
      priority: "normal",
      hasCase: false,
    },
    {
      messageId: "bmw-014",
      subject: "Luces LED delanteras - Una no funciona",
      from: "Marta Delgado",
      fromEmail: "marta.d@mail.com",
      receivedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000), // 9 días
      bodyPreview: "La luz LED delantera derecha dejó de funcionar. ¿Es costoso el cambio?",
      isRead: true,
      priority: "normal",
      hasCase: false,
    },
    {
      messageId: "bmw-015",
      subject: "Vibración en el volante a alta velocidad",
      from: "Sergio Campos",
      fromEmail: "sergio.campos@email.com",
      receivedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 días
      bodyPreview: "A partir de 120 km/h el volante vibra. ¿Puede ser el equilibrado?",
      isRead: true,
      priority: "normal",
      hasCase: false,
    },
    {
      messageId: "bmw-016",
      subject: "Recall - Actualización de software del motor",
      from: "Lucía Romero",
      fromEmail: "lucia.romero@provider.com",
      receivedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000), // 12 días
      bodyPreview: "Recibí una carta sobre un recall. ¿Debo llevar el coche cuanto antes?",
      isRead: true,
      priority: "high",
      hasCase: false,
    },
    {
      messageId: "bmw-017",
      subject: "Aire acondicionado no enfría lo suficiente",
      from: "Pablo Navarro",
      fromEmail: "pnavarro@email.com",
      receivedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 días
      bodyPreview: "Con el calor de estos días, el A/C no enfría como antes. ¿Necesita carga?",
      isRead: true,
      priority: "normal",
      hasCase: false,
    },
    {
      messageId: "bmw-018",
      subject: "Error en el cuadro: Check Engine",
      from: "Raquel Medina",
      fromEmail: "raquel.m@mail.com",
      receivedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 días
      bodyPreview: "Se encendió el Check Engine esta mañana. El coche funciona normal pero me preocupa...",
      isRead: true,
      priority: "high",
      hasCase: false,
    },
    {
      messageId: "bmw-019",
      subject: "Pastillas de freno - ¿Cuándo cambiarlas?",
      from: "Alberto Gil",
      fromEmail: "alberto.gil@domain.com",
      receivedAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000), // 18 días
      bodyPreview: "Tengo 45.000 km. ¿Es momento de revisar las pastillas de freno?",
      isRead: true,
      priority: "normal",
      hasCase: false,
    },
    {
      messageId: "bmw-020",
      subject: "Sistema Start-Stop no funciona",
      from: "Cristina Herrera",
      fromEmail: "cristina.h@email.com",
      receivedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), // 20 días
      bodyPreview: "El sistema Start-Stop dejó de funcionar hace unos días. Siempre muestra desactivado...",
      isRead: true,
      priority: "normal",
      hasCase: false,
    },
    {
      messageId: "bmw-021",
      subject: "Financiación para nuevo BMW Serie 4",
      from: "Manuel Prieto",
      fromEmail: "manuel.prieto@email.com",
      receivedAt: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000), // 22 días
      bodyPreview: "Estoy interesado en el Serie 4. ¿Pueden enviarme opciones de financiación?",
      isRead: true,
      priority: "normal",
      hasCase: false,
    },
    {
      messageId: "bmw-022",
      subject: "Pérdida de potencia en aceleraciones",
      from: "Beatriz Molina",
      fromEmail: "beatriz.molina@mail.com",
      receivedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000), // 25 días
      bodyPreview: "Siento que el motor ha perdido potencia. Al acelerar no responde como antes...",
      isRead: true,
      priority: "high",
      hasCase: false,
    },
    {
      messageId: "bmw-023",
      subject: "Sensor de aparcamiento defectuoso",
      from: "Óscar Ramos",
      fromEmail: "oscar.ramos@provider.com",
      receivedAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000), // 28 días
      bodyPreview: "Los sensores traseros pitam constantemente incluso sin obstáculos...",
      isRead: true,
      priority: "normal",
      hasCase: false,
    },
    {
      messageId: "bmw-024",
      subject: "Test drive BMW iX eléctrico",
      from: "Silvia Domínguez",
      fromEmail: "silvia.d@email.com",
      receivedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 días
      bodyPreview: "Me gustaría probar el nuevo BMW iX. ¿Tienen unidades disponibles para test drive?",
      isRead: true,
      priority: "normal",
      hasCase: false,
    },
    {
      messageId: "bmw-025",
      subject: "Limpiaparabrisas dejan marcas en el cristal",
      from: "Jorge Blanco",
      fromEmail: "jorge.blanco@mail.com",
      receivedAt: new Date(Date.now() - 32 * 24 * 60 * 60 * 1000), // 32 días
      bodyPreview: "Las escobillas limpiaparabrisas están dejando rayas. ¿Son originales BMW?",
      isRead: true,
      priority: "normal",
      hasCase: false,
    },
  ];

  console.log(`Creating ${demoEmails.length} demo emails...`);

  for (const emailData of demoEmails) {
    await prisma.email.create({
      data: {
        ...emailData,
        userId: user.id,
        to: "soporte@bmw.es",
        bodyText: emailData.bodyPreview,
        bodyHtml: `<p>${emailData.bodyPreview}</p>`,
      },
    });
  }

  console.log(`✅ Created ${demoEmails.length} emails successfully!`);
  console.log("Seed completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
