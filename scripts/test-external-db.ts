/**
 * Script de prueba para verificar la conexión a la base de datos externa (SQL Server)
 *
 * Uso: npx tsx scripts/test-external-db.ts
 */

import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';
import sql from 'mssql';

// Cargar variables de entorno desde .env.local
dotenvConfig({ path: resolve(process.cwd(), '.env.local') });

const config: sql.config = {
  server: process.env.EXTERNAL_DB_SERVER || '',
  database: process.env.EXTERNAL_DB_DATABASE || '',
  user: process.env.EXTERNAL_DB_USER || '',
  password: process.env.EXTERNAL_DB_PASSWORD || '',
  connectionTimeout: 15000, // 15 segundos para conectar
  requestTimeout: 30000, // 30 segundos para consultas
  options: {
    encrypt: false, // Desactivado para SQL Server sin SSL
    enableArithAbort: true,
  },
};

async function testConnection() {
  console.log('='.repeat(60));
  console.log('Prueba de Conexión a Base de Datos Externa (SQL Server)');
  console.log('='.repeat(60));
  console.log('');

  // Verificar configuración
  console.log('Configuración:');
  console.log(`  Servidor: ${config.server || '❌ NO CONFIGURADO'}`);
  console.log(`  Base de datos: ${config.database || '❌ NO CONFIGURADO'}`);
  console.log(`  Usuario: ${config.user || '❌ NO CONFIGURADO'}`);
  console.log(`  Contraseña: ${config.password ? '✓ Configurada' : '❌ NO CONFIGURADA'}`);
  console.log('');

  if (!config.server || !config.database || !config.user || !config.password) {
    console.error('❌ Error: Faltan variables de entorno.');
    console.error('');
    console.error('Agrega estas variables a tu archivo .env.local:');
    console.error('');
    console.error('EXTERNAL_DB_SERVER=tu-servidor.database.windows.net');
    console.error('EXTERNAL_DB_DATABASE=nombre_base_datos');
    console.error('EXTERNAL_DB_USER=usuario');
    console.error('EXTERNAL_DB_PASSWORD=contraseña');
    console.error('');
    process.exit(1);
  }

  try {
    console.log('🔄 Intentando conectar...');
    const pool = await sql.connect(config);
    console.log('✅ ¡Conexión exitosa!');
    console.log('');

    // Prueba 1: Listar tablas
    console.log('📋 Prueba 1: Listar tablas disponibles');
    try {
      const tablesResult = await pool
        .request()
        .query('SELECT TOP 10 TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = \'BASE TABLE\' ORDER BY TABLE_NAME');

      if (tablesResult.recordset.length > 0) {
        console.log(`✅ Se encontraron ${tablesResult.recordset.length} tablas:`);
        tablesResult.recordset.forEach((row: any, index: number) => {
          console.log(`   ${index + 1}. ${row.TABLE_NAME}`);
        });
      } else {
        console.log('⚠️  No se encontraron tablas (la BD puede estar vacía)');
      }
    } catch (error) {
      console.error('❌ Error al listar tablas:', error instanceof Error ? error.message : error);
    }
    console.log('');

    // Prueba 2: Consulta simple
    console.log('📋 Prueba 2: Consulta SELECT simple');
    try {
      const testQuery = 'SELECT GETDATE() as FechaHora, @@VERSION as Version';
      const result = await pool.request().query(testQuery);

      console.log('✅ Consulta ejecutada exitosamente:');
      console.log(`   Fecha/Hora del servidor: ${result.recordset[0].FechaHora}`);
      console.log(`   Versión: ${result.recordset[0].Version.split('\n')[0]}`);
    } catch (error) {
      console.error('❌ Error en consulta SELECT:', error instanceof Error ? error.message : error);
    }
    console.log('');

    // Prueba 3: Verificar permisos
    console.log('📋 Prueba 3: Verificar permisos del usuario');
    try {
      const permissionsQuery = `
        SELECT
          dp.name AS UsuarioORol,
          dp.type_desc AS Tipo,
          p.permission_name AS Permiso,
          p.state_desc AS Estado
        FROM sys.database_permissions p
        JOIN sys.database_principals dp ON p.grantee_principal_id = dp.principal_id
        WHERE dp.name = @username
      `;

      const permissionsResult = await pool
        .request()
        .input('username', sql.NVarChar, config.user)
        .query(permissionsQuery);

      if (permissionsResult.recordset.length > 0) {
        console.log(`✅ Permisos del usuario '${config.user}':`);
        permissionsResult.recordset.forEach((row: any) => {
          console.log(`   - ${row.Permiso} (${row.Estado})`);
        });
      } else {
        console.log(`⚠️  No se encontraron permisos específicos para '${config.user}'`);
        console.log('   El usuario puede tener permisos heredados de un rol.');
      }
    } catch (error) {
      console.error('❌ Error al verificar permisos:', error instanceof Error ? error.message : error);
    }
    console.log('');

    // Cerrar conexión
    await pool.close();
    console.log('✅ Conexión cerrada correctamente');
    console.log('');
    console.log('='.repeat(60));
    console.log('✅ TODAS LAS PRUEBAS COMPLETADAS EXITOSAMENTE');
    console.log('='.repeat(60));
    console.log('');
    console.log('El agente de IA ahora puede consultar tu base de datos externa.');
    console.log('Asegúrate de actualizar el manual (docs/07-base-datos-externa.md)');
    console.log('con las tablas y estructura específicas de tu base de datos.');
  } catch (error) {
    console.error('');
    console.error('❌ ERROR DE CONEXIÓN');
    console.error('='.repeat(60));

    if (error instanceof Error) {
      console.error('Mensaje:', error.message);

      // Ayuda específica según el error
      if (error.message.includes('Login failed')) {
        console.error('');
        console.error('Problema: Credenciales incorrectas');
        console.error('Solución:');
        console.error('  1. Verifica el usuario y contraseña en .env.local');
        console.error('  2. Asegúrate de que el usuario existe en SQL Server');
        console.error('  3. Verifica que el usuario tiene permisos en la base de datos');
      } else if (error.message.includes('Cannot open server') || error.message.includes('connect ETIMEDOUT')) {
        console.error('');
        console.error('Problema: No se puede conectar al servidor');
        console.error('Solución:');
        console.error('  1. Verifica que el servidor esté accesible desde tu red');
        console.error('  2. Verifica el firewall (puerto 1433)');
        console.error('  3. Para Azure SQL, agrega tu IP en el firewall del portal');
      } else if (error.message.includes('Cannot open database')) {
        console.error('');
        console.error('Problema: Base de datos no encontrada');
        console.error('Solución:');
        console.error('  1. Verifica el nombre de la base de datos en .env.local');
        console.error('  2. Asegúrate de que la base de datos existe');
        console.error('  3. Verifica que el usuario tiene acceso a esa base de datos');
      }
    } else {
      console.error('Error desconocido:', error);
    }

    console.error('');
    process.exit(1);
  }
}

// Ejecutar prueba
testConnection();
