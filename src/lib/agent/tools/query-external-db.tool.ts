/**
 * Herramienta para consultar la base de datos externa (SQL Server)
 *
 * Permite al agente ejecutar consultas SQL de solo lectura para:
 * - Verificar estados de transportes, pedidos, etc.
 * - Obtener información de clientes
 * - Consultar cualquier tabla según el manual
 *
 * SEGURIDAD:
 * - Solo permite SELECT (lectura)
 * - Previene SQL injection mediante validación
 * - Timeout de 30 segundos
 */

import sql from 'mssql';
import { BaseTool, ToolInput, ToolOutput } from './base-tool';

// Configuración de conexión (desde variables de entorno)
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
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

// Pool de conexiones reutilizable
let pool: sql.ConnectionPool | null = null;

/**
 * Obtiene o crea el pool de conexiones
 */
async function getPool(): Promise<sql.ConnectionPool> {
  if (!pool) {
    pool = await sql.connect(config);
  }
  return pool;
}

export class QueryExternalDatabaseTool extends BaseTool {
  name = 'query_external_database';
  description = `Consulta la base de datos externa del negocio para obtener información real y actualizada.

Usa esta herramienta cuando necesites:
- Verificar el estado actual de un transporte, pedido, envío
- Consultar información de clientes
- Verificar stock, productos, inventario
- Obtener detalles de cualquier entidad del sistema

**IMPORTANTE**: Solo puedes hacer consultas SELECT (lectura). No puedes modificar datos.

**Formato de la consulta**:
- Escribe SQL estándar de SQL Server
- Usa TOP para limitar resultados: SELECT TOP 100 * FROM tabla
- Referencia a tablas con esquema si es necesario: dbo.Transportes

**Ejemplos**:
- SELECT TOP 10 * FROM Transportes WHERE id = 'TR-12345'
- SELECT estado, fecha FROM Pedidos WHERE cliente_id = 123 ORDER BY fecha DESC
- SELECT COUNT(*) FROM Envios WHERE estado = 'ERROR'

La herramienta devolverá los resultados en formato JSON.`;

  inputSchema = {
    type: 'object' as const,
    properties: {
      query: {
        type: 'string',
        description: 'Consulta SQL SELECT a ejecutar en la base de datos externa',
      },
      reason: {
        type: 'string',
        description: 'Explicación breve de por qué necesitas hacer esta consulta',
      },
    },
    required: ['query', 'reason'],
  };

  /**
   * Valida que la consulta sea segura
   */
  private validateQuery(query: string): { valid: boolean; error?: string } {
    const normalizedQuery = query.trim().toUpperCase();

    // Solo permitir SELECT
    if (!normalizedQuery.startsWith('SELECT')) {
      return {
        valid: false,
        error: 'Solo se permiten consultas SELECT (lectura). No puedes modificar datos.',
      };
    }

    // Bloquear palabras clave peligrosas
    const dangerousKeywords = [
      'INSERT',
      'UPDATE',
      'DELETE',
      'DROP',
      'CREATE',
      'ALTER',
      'TRUNCATE',
      'EXEC',
      'EXECUTE',
      'SP_',
      'XP_',
      'OPENROWSET',
      'OPENDATASOURCE',
    ];

    for (const keyword of dangerousKeywords) {
      if (normalizedQuery.includes(keyword)) {
        return {
          valid: false,
          error: `Palabra clave prohibida detectada: ${keyword}. Solo se permiten consultas de lectura.`,
        };
      }
    }

    // Verificar múltiples statements (prevenir SQL injection)
    if (query.includes(';') && query.trim().split(';').filter(s => s.trim()).length > 1) {
      return {
        valid: false,
        error: 'Solo se permite una consulta a la vez. No uses múltiples statements con ";"',
      };
    }

    return { valid: true };
  }

  async execute(input: ToolInput): Promise<ToolOutput> {
    const { query, reason } = input;

    console.log(`[QueryExternalDB] Razón: ${reason}`);
    console.log(`[QueryExternalDB] Query: ${query}`);

    try {
      // Validar configuración
      if (
        !config.server ||
        !config.database ||
        !config.user ||
        !config.password
      ) {
        return {
          success: false,
          error:
            'Base de datos externa no configurada. Faltan variables de entorno: EXTERNAL_DB_SERVER, EXTERNAL_DB_DATABASE, EXTERNAL_DB_USER, EXTERNAL_DB_PASSWORD',
          data: null,
        };
      }

      // Validar consulta
      const validation = this.validateQuery(query);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error || 'Consulta no válida',
          data: null,
        };
      }

      // Ejecutar consulta
      const connectionPool = await getPool();
      const result = await connectionPool.request().query(query);

      // Formatear resultado
      const data = {
        rowCount: result.recordset.length,
        rows: result.recordset,
        columns: result.recordset.columns
          ? Object.keys(result.recordset.columns)
          : [],
      };

      console.log(`[QueryExternalDB] ✓ Query exitoso: ${data.rowCount} filas`);

      return {
        success: true,
        data: {
          ...data,
          message: `Consulta ejecutada exitosamente. ${data.rowCount} resultado(s) encontrado(s).`,
        },
      };
    } catch (error) {
      console.error('[QueryExternalDB] Error:', error);

      // Formatear error para el agente
      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';

      return {
        success: false,
        error: `Error al consultar la base de datos: ${errorMessage}`,
        data: null,
      };
    }
  }
}
