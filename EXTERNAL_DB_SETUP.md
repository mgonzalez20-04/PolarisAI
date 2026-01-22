# Configuración de Base de Datos Externa (SQL Server)

## 📋 Resumen

El agente de IA ahora puede consultar tu base de datos externa de SQL Server para obtener información real y actualizada al responder incidencias.

**¿Qué puede hacer?**
- ✅ Verificar estados de transportes, pedidos, clientes
- ✅ Consultar cualquier tabla de tu base de datos
- ✅ Combinar datos reales con el manual para dar mejores respuestas
- ✅ Solo lectura (SELECT) - no puede modificar datos

---

## 🚀 Configuración Rápida

### Paso 1: Agregar variables de entorno

Abre tu archivo `.env.local` y agrega:

```env
# Base de Datos Externa (SQL Server)
EXTERNAL_DB_SERVER=tu-servidor.database.windows.net
EXTERNAL_DB_DATABASE=nombre_de_tu_base_de_datos
EXTERNAL_DB_USER=usuario
EXTERNAL_DB_PASSWORD=tu_contraseña
```

### Paso 2: Ejemplos de configuración

#### Para Azure SQL Database:
```env
EXTERNAL_DB_SERVER=miempresa.database.windows.net
EXTERNAL_DB_DATABASE=produccion
EXTERNAL_DB_USER=soporte_readonly
EXTERNAL_DB_PASSWORD=TuContraseñaSegura123!
```

#### Para SQL Server local o en red:
```env
EXTERNAL_DB_SERVER=192.168.1.100
EXTERNAL_DB_DATABASE=ERP_Produccion
EXTERNAL_DB_USER=agente_lectura
EXTERNAL_DB_PASSWORD=ContraseñaSegura456!
```

#### Para SQL Server con instancia nombrada:
```env
EXTERNAL_DB_SERVER=servidor\\SQLEXPRESS
EXTERNAL_DB_DATABASE=MiBaseDatos
EXTERNAL_DB_USER=usuario_consulta
EXTERNAL_DB_PASSWORD=Password789!
```

### Paso 3: Crear usuario de solo lectura (RECOMENDADO)

Es muy recomendable crear un usuario con permisos de solo lectura:

```sql
-- Conectar a SQL Server como administrador
USE master;
GO

-- Crear login
CREATE LOGIN agente_soporte WITH PASSWORD = 'ContraseñaSegura123!';
GO

-- Usar la base de datos de producción
USE TuBaseDeDatos;
GO

-- Crear usuario
CREATE USER agente_soporte FOR LOGIN agente_soporte;
GO

-- Dar permisos de solo lectura
ALTER ROLE db_datareader ADD MEMBER agente_soporte;
GO

-- Verificar permisos
SELECT
    dp.name AS UsuarioORol,
    dp.type_desc AS Tipo,
    p.permission_name AS Permiso,
    p.state_desc AS Estado
FROM sys.database_permissions p
JOIN sys.database_principals dp ON p.grantee_principal_id = dp.principal_id
WHERE dp.name = 'agente_soporte';
```

### Paso 4: Probar la conexión

Crea un script de prueba: `scripts/test-external-db.ts`

```typescript
import sql from 'mssql';

const config: sql.config = {
  server: process.env.EXTERNAL_DB_SERVER || '',
  database: process.env.EXTERNAL_DB_DATABASE || '',
  user: process.env.EXTERNAL_DB_USER || '',
  password: process.env.EXTERNAL_DB_PASSWORD || '',
  options: {
    encrypt: true,
    trustServerCertificate: false,
    enableArithAbort: true,
  },
};

async function testConnection() {
  try {
    console.log('Conectando a SQL Server...');
    console.log(`Servidor: ${config.server}`);
    console.log(`Base de datos: ${config.database}`);
    console.log(`Usuario: ${config.user}`);

    const pool = await sql.connect(config);
    console.log('✓ Conexión exitosa!');

    // Probar una consulta simple
    const result = await pool.request().query('SELECT TOP 1 * FROM INFORMATION_SCHEMA.TABLES');
    console.log(`✓ Consulta exitosa: ${result.recordset.length} tabla(s) encontrada(s)`);

    await pool.close();
    console.log('✓ Conexión cerrada correctamente');
  } catch (error) {
    console.error('❌ Error de conexión:', error);
  }
}

testConnection();
```

Ejecutar:
```bash
npx tsx scripts/test-external-db.ts
```

### Paso 5: Actualizar el manual con tu estructura de BD

Edita el archivo `docs/07-base-datos-externa.md` con:
- Nombres reales de tus tablas
- Columnas importantes
- Estados y códigos de error específicos de tu negocio
- Ejemplos de consultas relevantes

Luego recarga el manual:
```bash
npx tsx scripts/load-knowledge-base.ts
```

---

## 🔧 Configuración Avanzada

### Configuración SSL/TLS

#### Para Azure SQL (encrypt: true):
```typescript
// Ya está configurado por defecto
options: {
  encrypt: true, // Obligatorio para Azure
  trustServerCertificate: false,
}
```

#### Para SQL Server local con certificado auto-firmado:
```typescript
options: {
  encrypt: true,
  trustServerCertificate: true, // ⚠️ Solo para desarrollo/redes internas
}
```

#### Sin encriptación (no recomendado):
```typescript
options: {
  encrypt: false,
}
```

### Configuración de Pool de Conexiones

Por defecto usa:
```typescript
pool: {
  max: 10,        // Máximo 10 conexiones simultáneas
  min: 0,         // Mínimo 0 (crea bajo demanda)
  idleTimeoutMillis: 30000, // Cierra conexiones inactivas después de 30s
}
```

Para ajustar según tu carga:

```typescript
// Alta concurrencia
pool: {
  max: 50,
  min: 5,
  idleTimeoutMillis: 60000,
}

// Baja concurrencia (ahorrar recursos)
pool: {
  max: 5,
  min: 0,
  idleTimeoutMillis: 10000,
}
```

### Timeout de Consultas

Por defecto: 30 segundos

Para ajustar:
```typescript
options: {
  requestTimeout: 60000, // 60 segundos
}
```

---

## 🔒 Seguridad

### Restricciones Implementadas

1. **Solo SELECT**: El agente solo puede ejecutar consultas de lectura
2. **Sin procedimientos almacenados**: No puede ejecutar EXEC o SP
3. **Sin múltiples statements**: Una consulta a la vez (previene SQL injection)
4. **Timeout**: Cada consulta tiene un límite de tiempo

### Recomendaciones de Seguridad

#### 1. Usuario con mínimos privilegios
```sql
-- ✅ Bueno: Solo lectura
ALTER ROLE db_datareader ADD MEMBER agente_soporte;

-- ❌ Malo: Demasiados permisos
ALTER ROLE db_owner ADD MEMBER agente_soporte; -- NO HACER ESTO
```

#### 2. Restringir acceso a tablas sensibles

Si tienes tablas con datos muy sensibles (contraseñas, tarjetas, etc.):

```sql
-- Denegar acceso a tabla específica
DENY SELECT ON dbo.PasswordsTable TO agente_soporte;
DENY SELECT ON dbo.PaymentInfo TO agente_soporte;
```

#### 3. Usar vistas en lugar de tablas directas

Crea vistas que excluyan columnas sensibles:

```sql
-- Vista segura sin datos sensibles
CREATE VIEW vw_ClientesSoporte AS
SELECT
    id,
    nombre,
    email,
    telefono,
    fecha_registro,
    estado
    -- NO incluir: password_hash, tarjeta_credito, etc.
FROM Clientes;

-- Dar acceso solo a la vista
GRANT SELECT ON vw_ClientesSoporte TO agente_soporte;
DENY SELECT ON dbo.Clientes TO agente_soporte;
```

#### 4. Firewall y red

- Asegúrate de que solo tu servidor de aplicación puede acceder a SQL Server
- Usa IP whitelisting en el firewall
- Para Azure SQL, configura reglas de firewall

#### 5. Monitoreo

Revisa regularmente:
- Logs de consultas del agente (`AgentMetrics`)
- Consultas lentas o inusuales
- Intentos de consultas prohibidas

---

## 📊 Ejemplos de Uso

### Ejemplo 1: Verificar estado de transporte

**Email del cliente:**
> "El transporte TR-12345 no ha llegado. ¿Qué está pasando?"

**El agente hace (automáticamente):**
```sql
SELECT
    id,
    estado,
    tipo_error,
    fecha_actualizacion,
    intentos_entrega,
    destino
FROM Transportes
WHERE id = 'TR-12345'
```

**Resultado:**
```json
{
  "id": "TR-12345",
  "estado": "ERROR",
  "tipo_error": "ERROR_DIRECCION_INVALIDA",
  "fecha_actualizacion": "2024-01-15T10:30:00",
  "intentos_entrega": 2,
  "destino": "Calle Principal 123, Ciudad"
}
```

**Respuesta del agente:**
> "He verificado el transporte TR-12345 en el sistema. Actualmente está en estado ERROR debido a una dirección inválida. Se han realizado 2 intentos de entrega. La última actualización fue el 15/01/2024 a las 10:30.
>
> Según nuestro manual, este error ocurre cuando falta información en la dirección (código postal, número, etc.). Te recomiendo:
> 1. Verificar que la dirección tenga el código postal completo
> 2. Confirmar el número de la calle
> 3. Una vez corregida, el sistema reprogramará la entrega automáticamente"

### Ejemplo 2: Cliente no ve su pedido

**Email del cliente:**
> "Hice el pedido PED-2024-5678 pero no aparece en mi cuenta"

**El agente hace:**
```sql
SELECT
    numero_pedido,
    estado,
    fecha_creacion,
    visible_cliente,
    total
FROM Pedidos
WHERE numero_pedido = 'PED-2024-5678'
```

**Resultado:**
```json
{
  "numero_pedido": "PED-2024-5678",
  "estado": "PENDIENTE_PAGO",
  "fecha_creacion": "2024-01-15T09:00:00",
  "visible_cliente": false,
  "total": 150.50
}
```

**Respuesta del agente:**
> "He localizado tu pedido PED-2024-5678 en el sistema. Fue creado el 15/01/2024 por un total de €150.50.
>
> El pedido no es visible en tu cuenta porque está en estado PENDIENTE_PAGO. Esto significa que el pago no se ha completado todavía.
>
> Posibles causas:
> 1. El proceso de pago se interrumpió antes de completarse
> 2. Hubo un problema con el método de pago
>
> Solución:
> Te enviaré un enlace de pago para que puedas completar la transacción. Una vez confirmado el pago, el pedido será visible automáticamente en tu cuenta."

---

## ❓ Solución de Problemas

### Error: "Cannot connect to SQL Server"

**Posibles causas:**
1. Servidor inaccesible
2. Firewall bloqueando
3. Credenciales incorrectas

**Solución:**
```bash
# Probar conexión con telnet
telnet tu-servidor.database.windows.net 1433

# Si falla, verificar firewall
# Para Azure SQL, agregar IP del servidor en el portal
```

### Error: "Login failed for user"

**Causa:** Credenciales incorrectas o usuario sin permisos

**Solución:**
```sql
-- Verificar que el usuario existe
SELECT name FROM sys.sql_logins WHERE name = 'agente_soporte';

-- Verificar permisos
USE TuBaseDeDatos;
SELECT * FROM sys.database_principals WHERE name = 'agente_soporte';
```

### Error: "Encryption not supported"

**Causa:** Versión antigua de SQL Server o configuración SSL incorrecta

**Solución:**
```env
# Desactivar encriptación (solo para SQL Server local antiguo)
EXTERNAL_DB_ENCRYPT=false
```

Y en el código:
```typescript
options: {
  encrypt: process.env.EXTERNAL_DB_ENCRYPT !== 'false',
}
```

### Consultas muy lentas

**Solución:**
1. Usar `TOP` en todas las consultas
2. Agregar índices en las columnas más consultadas
3. Limitar las consultas a datos recientes

```sql
-- ✅ Bueno: Rápido
SELECT TOP 10 * FROM Transportes
WHERE id = 'TR-12345'

-- ✅ Bueno: Con filtro de fecha
SELECT TOP 100 * FROM Pedidos
WHERE fecha_creacion >= DATEADD(day, -30, GETDATE())

-- ❌ Malo: Muy lento
SELECT * FROM Transportes -- Puede devolver millones de filas
```

---

## ✅ Checklist de Configuración

- [ ] Variables de entorno agregadas en `.env.local`
- [ ] Usuario de solo lectura creado en SQL Server
- [ ] Permisos de `db_datareader` asignados
- [ ] Conexión probada con script de prueba
- [ ] Firewall configurado (si es necesario)
- [ ] Manual actualizado con estructura real de BD (`docs/07-base-datos-externa.md`)
- [ ] Manual recargado (`npx tsx scripts/load-knowledge-base.ts`)
- [ ] Prueba con un email real del agente

---

## 🎓 Próximos Pasos

1. **Configura la conexión** siguiendo los pasos de arriba
2. **Actualiza el manual** con tu estructura de BD real
3. **Prueba el agente** con un email que requiera consultar la BD
4. **Monitorea** las consultas en los logs
5. **Ajusta** el manual según el feedback del agente

¡El agente ahora puede consultar datos reales de tu negocio para dar respuestas mucho más precisas!
