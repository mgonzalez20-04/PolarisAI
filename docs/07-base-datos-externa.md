# Base de Datos Externa

## ¿Qué es la base de datos externa?

La base de datos externa es la base de datos de producción de tu negocio (SQL Server) que contiene toda la información operativa real:
- Transportes y envíos
- Clientes
- Pedidos y órdenes
- Productos e inventario
- Etc.

El agente de IA tiene acceso de **solo lectura** a esta base de datos para ayudarte a resolver incidencias con información real y actualizada.

## Cómo usa el agente la base de datos

Cuando recibes un email de soporte, el agente puede:

### 1. Verificar información en tiempo real

**Ejemplo:**
```
Cliente: "El transporte TR-12345 está en error"

Agente (internamente):
- Usa la herramienta query_external_database
- Ejecuta: SELECT * FROM Transportes WHERE id = 'TR-12345'
- Obtiene el estado real del transporte
- Consulta el manual para saber qué significa ese error
- Responde con una solución basada en datos reales
```

### 2. Consultar múltiples fuentes

El agente combina:
- **Datos reales** de la base de datos externa (estado actual)
- **Manual de procedimientos** (cómo resolver el problema)
- **Casos históricos** (cómo se resolvió antes)

### 3. Validar información del cliente

Puede verificar si:
- El transporte existe
- El cliente tiene los permisos correctos
- El pedido está en el estado que dice el cliente
- Etc.

## Consultas que puede hacer el agente

El agente puede ejecutar consultas SQL SELECT en cualquier tabla. Ejemplos:

### Consultar transportes
```sql
SELECT TOP 10 * FROM Transportes WHERE id = 'TR-12345'
SELECT estado, fecha_actualizacion FROM Transportes WHERE cliente_id = 100
SELECT COUNT(*) FROM Transportes WHERE estado = 'ERROR'
```

### Consultar clientes
```sql
SELECT * FROM Clientes WHERE id = 123
SELECT email, telefono FROM Clientes WHERE nombre LIKE '%Empresa%'
```

### Consultar pedidos
```sql
SELECT * FROM Pedidos WHERE numero_pedido = 'PED-2024-001'
SELECT estado, total FROM Pedidos WHERE cliente_id = 100 ORDER BY fecha DESC
```

### Consultar productos/inventario
```sql
SELECT stock_actual FROM Productos WHERE sku = 'PROD-123'
SELECT * FROM Inventario WHERE almacen_id = 5 AND stock_actual < stock_minimo
```

## Limitaciones de seguridad

Por seguridad, el agente tiene las siguientes restricciones:

### ✅ Permitido (Solo lectura)
- `SELECT`: Consultar cualquier tabla
- `TOP N`: Limitar resultados
- `WHERE`: Filtrar datos
- `ORDER BY`: Ordenar resultados
- `JOIN`: Combinar tablas
- `COUNT`, `SUM`, `AVG`: Funciones de agregación

### ❌ Prohibido (Sin modificaciones)
- `INSERT`: No puede crear registros
- `UPDATE`: No puede modificar datos
- `DELETE`: No puede eliminar datos
- `DROP`, `CREATE`, `ALTER`: No puede modificar estructura
- `EXEC`, `EXECUTE`: No puede ejecutar procedimientos
- Múltiples statements (`;`): Solo una consulta a la vez

## Cómo ayuda esto en el soporte

### Escenario 1: Transporte en error

**Sin acceso a BD:**
```
Agente: "Según el manual, los errores de transporte pueden deberse a..."
[Respuesta genérica sin verificar el caso específico]
```

**Con acceso a BD:**
```
Agente:
- Consulto el transporte TR-12345 en el sistema
- Estado actual: ERROR_DIRECCION_INVALIDA
- Fecha del error: 2024-01-15 10:30
- Intentos de entrega: 2

Según el manual, este error ocurre cuando la dirección no está
completa. He verificado el registro y efectivamente falta el código postal.

Solución:
1. Actualizar la dirección en el sistema con el código postal correcto
2. Reasignar el transporte para nuevo intento
3. El transportista recibirá la actualización automáticamente
```

### Escenario 2: Cliente no recibe notificaciones

**Sin acceso a BD:**
```
Agente: "Verifica que el email esté bien configurado"
```

**Con acceso a BD:**
```
Agente:
- Consulto el cliente ID 456 en el sistema
- Email registrado: cliente@ejemplo.com
- Estado de notificaciones: DESACTIVADAS
- Última actualización: 2024-01-10

El cliente tiene las notificaciones desactivadas desde hace 6 días.

Solución:
1. Reactivar notificaciones en Configuración > Notificaciones
2. Verificar bandeja de spam si no llegan después de reactivar
3. Enviar email de prueba para confirmar
```

### Escenario 3: Pedido no aparece en el sistema

**Sin acceso a BD:**
```
Agente: "Puede ser un problema de sincronización"
```

**Con acceso a BD:**
```
Agente:
- Busco pedido PED-2024-5678 en el sistema
- Resultado: ENCONTRADO
- Estado: PENDIENTE_PAGO
- Fecha de creación: 2024-01-15 09:00
- Visible para el cliente: NO (porque está pendiente de pago)

El pedido SÍ existe en el sistema pero no es visible para el cliente
porque está pendiente de pago. El cliente probablemente no completó
el proceso de pago.

Solución:
1. Enviar enlace de pago al cliente
2. Una vez pagado, el pedido será visible automáticamente
3. Si el cliente ya pagó, verificar integración con pasarela de pago
```

## Estructura de tablas (Ejemplo)

**Nota:** Esta es una estructura de ejemplo. Debes actualizar esta sección con las tablas reales de tu base de datos.

### Tabla: Transportes
```sql
CREATE TABLE Transportes (
  id VARCHAR(50) PRIMARY KEY,
  cliente_id INT,
  numero_tracking VARCHAR(100),
  estado VARCHAR(50), -- PENDIENTE, EN_TRANSITO, ENTREGADO, ERROR, etc.
  tipo_error VARCHAR(100), -- ERROR_DIRECCION, ERROR_ENTREGA, etc.
  origen VARCHAR(200),
  destino VARCHAR(200),
  fecha_creacion DATETIME,
  fecha_actualizacion DATETIME,
  intentos_entrega INT
)
```

### Tabla: Clientes
```sql
CREATE TABLE Clientes (
  id INT PRIMARY KEY,
  nombre VARCHAR(200),
  email VARCHAR(200),
  telefono VARCHAR(50),
  direccion VARCHAR(500),
  notificaciones_activas BIT,
  fecha_registro DATETIME
)
```

### Tabla: Pedidos
```sql
CREATE TABLE Pedidos (
  id INT PRIMARY KEY,
  numero_pedido VARCHAR(50) UNIQUE,
  cliente_id INT,
  estado VARCHAR(50), -- PENDIENTE_PAGO, PAGADO, EN_PROCESO, ENVIADO, ENTREGADO
  total DECIMAL(10,2),
  fecha_creacion DATETIME,
  visible_cliente BIT
)
```

### Tabla: Productos
```sql
CREATE TABLE Productos (
  id INT PRIMARY KEY,
  sku VARCHAR(50) UNIQUE,
  nombre VARCHAR(200),
  descripcion TEXT,
  precio DECIMAL(10,2),
  stock_actual INT,
  stock_minimo INT
)
```

## Estados y códigos de error comunes

### Estados de Transportes
- `PENDIENTE`: Transporte creado, esperando asignación
- `EN_TRANSITO`: En camino al destino
- `ENTREGADO`: Entregado exitosamente
- `ERROR`: Error durante el proceso
- `CANCELADO`: Cancelado por el cliente o sistema

### Tipos de error de transportes
- `ERROR_DIRECCION_INVALIDA`: Dirección incompleta o incorrecta
- `ERROR_DESTINATARIO_AUSENTE`: No hay nadie para recibir
- `ERROR_RECHAZO_PAQUETE`: Destinatario rechazó el paquete
- `ERROR_ZONA_NO_CUBIERTA`: Fuera del área de cobertura
- `ERROR_SISTEMA`: Error técnico del sistema

### Estados de Pedidos
- `PENDIENTE_PAGO`: Creado pero sin pagar
- `PAGADO`: Pago confirmado
- `EN_PROCESO`: Preparando el pedido
- `ENVIADO`: En camino
- `ENTREGADO`: Recibido por el cliente
- `CANCELADO`: Cancelado
- `DEVUELTO`: Devuelto por el cliente

## Mejores prácticas al usar la base de datos

### Para el agente:

1. **Siempre usa TOP para limitar resultados**
   ```sql
   -- ✅ Bueno
   SELECT TOP 10 * FROM Transportes WHERE estado = 'ERROR'

   -- ❌ Malo (puede devolver millones de filas)
   SELECT * FROM Transportes
   ```

2. **Usa filtros específicos**
   ```sql
   -- ✅ Bueno
   SELECT * FROM Transportes WHERE id = 'TR-12345'

   -- ❌ Malo (demasiado genérico)
   SELECT * FROM Transportes WHERE estado = 'ERROR'
   ```

3. **Explica qué estás buscando**
   - Antes de consultar, el agente debe entender qué información necesita
   - Después de consultar, debe interpretar los resultados en el contexto

### Para los usuarios:

1. **Proporciona IDs específicos**
   - "El transporte TR-12345 tiene error" es mejor que "Hay un transporte con error"

2. **Menciona el contexto**
   - "El cliente ID 456 no recibe emails" ayuda al agente a consultar el cliente correcto

3. **Verifica que el agente consultó la BD**
   - Las respuestas deben mencionar datos reales (estados, fechas, números)
   - Si solo da respuestas genéricas, puede que no haya consultado la BD

## Solución de problemas

### El agente no consulta la base de datos

**Posibles causas:**
1. La base de datos no está configurada (faltan variables de entorno)
2. El agente no entiende que debe consultar la BD
3. La consulta es muy genérica

**Solución:**
- Sé específico: "Consulta el transporte TR-12345 en el sistema"
- Proporciona IDs exactos
- Menciona que quieres datos reales del sistema

### Errores de conexión

**Posibles causas:**
1. Credenciales incorrectas
2. Firewall bloqueando la conexión
3. Base de datos no accesible desde el servidor

**Solución:**
- Verifica las variables de entorno en `.env.local`
- Asegúrate de que el servidor pueda acceder a SQL Server
- Revisa los logs del servidor para ver el error específico

### Consultas lentas

**Posibles causas:**
1. Consultas sin índices
2. Tablas muy grandes sin filtros
3. Joins complejos

**Solución:**
- El agente debería usar `TOP` para limitar resultados
- Usa filtros específicos (IDs, fechas recientes)
- Si las consultas son consistentemente lentas, considera agregar índices en la BD

## Privacidad y seguridad

### Datos sensibles

Ten en cuenta que el agente puede acceder a:
- Información de clientes (nombres, emails, direcciones)
- Datos de transacciones
- Cualquier información en la base de datos

**Recomendaciones:**
1. Usa el agente solo para soporte interno (no expuesto directamente a clientes)
2. Monitorea las consultas que hace el agente
3. Considera ofuscar datos muy sensibles (números de tarjeta, etc.)

### Logs y auditoría

Todas las consultas del agente se registran con:
- Query ejecutado
- Razón de la consulta
- Resultado (número de filas)
- Timestamp

Puedes revisar estos logs en los registros de `AgentMetrics`.

## Preguntas frecuentes

**¿El agente puede modificar datos?**
No, el agente solo tiene acceso de lectura (SELECT). No puede insertar, actualizar o eliminar datos.

**¿Qué pasa si la consulta falla?**
El agente recibirá un mensaje de error y podrá intentar reformular la consulta o indicar que no pudo obtener la información.

**¿Puedo ver qué consultas hace el agente?**
Sí, todas las consultas se registran en los logs del servidor y en las métricas del agente.

**¿El agente necesita saber la estructura de todas las tablas?**
No necesariamente. Puede explorar las tablas disponibles usando consultas como:
```sql
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'
```

**¿Hay un límite de consultas?**
Cada consulta tiene un timeout de 30 segundos. Se recomienda limitar las consultas a datos relevantes usando filtros y TOP.

**¿Puedo restringir el acceso a ciertas tablas?**
Sí, puedes configurar el usuario de SQL Server con permisos específicos en las tablas que quieras que el agente pueda consultar.
