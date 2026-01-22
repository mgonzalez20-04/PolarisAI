/**
 * Health Check Cron Job
 *
 * Este script ejecuta health checks periódicos contra la base de datos.
 *
 * Variables de entorno requeridas:
 * - NEXT_PUBLIC_APP_URL: URL de la aplicación (ej: http://localhost:3000)
 * - HEALTH_CHECK_TOKEN: Token secreto para autenticar los health checks
 * - HEALTH_CHECK_SCHEDULE: Expresión cron (ej: "*/5 * * * *" para cada 5 minutos)
 *
 * Uso:
 *   node scripts/health-check-cron.js
 *
 * Ejemplos de expresiones cron:
 *   "*/5 * * * *"  - Cada 5 minutos
 *   "0 * * * *"    - Cada hora
 *   "0 */2 * * *"  - Cada 2 horas
 *   "0 9 * * *"    - Todos los días a las 9:00 AM
 *   "0 9 * * 1-5"  - Lunes a Viernes a las 9:00 AM
 */

const cron = require('node-cron');
const https = require('https');
const http = require('http');

// Configuración
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const HEALTH_CHECK_TOKEN = process.env.HEALTH_CHECK_TOKEN;
const SCHEDULE = process.env.HEALTH_CHECK_SCHEDULE || '*/5 * * * *'; // Por defecto cada 5 minutos

if (!HEALTH_CHECK_TOKEN) {
  console.error('❌ Error: HEALTH_CHECK_TOKEN no está configurado');
  console.error('Por favor, configura la variable de entorno HEALTH_CHECK_TOKEN');
  process.exit(1);
}

// Función para ejecutar el health check
async function runHealthCheck() {
  return new Promise((resolve, reject) => {
    const url = new URL('/api/health/check', APP_URL);
    url.searchParams.append('token', HEALTH_CHECK_TOKEN);

    const protocol = url.protocol === 'https:' ? https : http;

    const req = protocol.get(url.toString(), (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve(result);
        } catch (error) {
          reject(new Error(`Error parsing response: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

// Validar expresión cron
if (!cron.validate(SCHEDULE)) {
  console.error(`❌ Error: Expresión cron inválida: ${SCHEDULE}`);
  console.error('Ejemplos válidos:');
  console.error('  */5 * * * *  - Cada 5 minutos');
  console.error('  0 * * * *    - Cada hora');
  console.error('  0 9 * * 1-5  - Lunes a Viernes a las 9:00 AM');
  process.exit(1);
}

console.log('🏥 Health Check Cron Job iniciado');
console.log(`📅 Programación: ${SCHEDULE}`);
console.log(`🌐 URL: ${APP_URL}`);
console.log('');

// Ejecutar inmediatamente al inicio
console.log('⚡ Ejecutando health check inicial...');
runHealthCheck()
  .then((result) => {
    const status = result.isHealthy ? '✅ Saludable' : '❌ No saludable';
    console.log(`${status} - Tiempo de respuesta: ${result.responseTime}ms`);
    if (result.errorMessage) {
      console.log(`   Error: ${result.errorMessage}`);
    }
  })
  .catch((error) => {
    console.error('❌ Error ejecutando health check:', error.message);
  });

// Programar ejecuciones periódicas
const task = cron.schedule(SCHEDULE, async () => {
  const timestamp = new Date().toLocaleString('es-ES');
  console.log(`\n⏰ [${timestamp}] Ejecutando health check programado...`);

  try {
    const result = await runHealthCheck();
    const status = result.isHealthy ? '✅ Saludable' : '❌ No saludable';
    console.log(`${status} - Tiempo de respuesta: ${result.responseTime}ms`);

    if (result.errorMessage) {
      console.log(`   Error: ${result.errorMessage}`);
    }
  } catch (error) {
    console.error('❌ Error ejecutando health check:', error.message);
  }
});

// Manejar señales de terminación
process.on('SIGINT', () => {
  console.log('\n👋 Deteniendo Health Check Cron Job...');
  task.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Deteniendo Health Check Cron Job...');
  task.stop();
  process.exit(0);
});
