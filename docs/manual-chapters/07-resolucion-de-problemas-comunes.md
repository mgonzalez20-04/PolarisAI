# Manual Portal BGB - RESOLUCIÓN DE PROBLEMAS COMUNES

_Capítulo 7 del Manual Técnico Portal BGB (MoveIT)_

---

## 7. RESOLUCIÓN DE PROBLEMAS COMUNES

Esta sección documenta los problemas más frecuentes reportados en soporte y sus soluciones.

### 7.1 Problemas de Autenticación

#### PROBLEMA 1: Usuario no puede hacer login - "Email o contraseña incorrectos"

**Síntomas:**
- Usuario introduce credenciales correctas pero no puede acceder
- Mensaje: "Email o contraseña incorrectos"

**Diagnóstico:**

```sql
-- Verificar estado del usuario
SELECT
    Id,
    Nombre,
    Email,
    Activo,
    FechaBorrado,
    FechaUltimoLogin,
    PrimerInicio
FROM Usuario
WHERE Email = 'usuario@example.com'
```

**Causas posibles:**

1. **Usuario inactivo (`Activo = 0`)**
   ```sql
   -- Verificar
   SELECT Activo FROM Usuario WHERE Email = 'usuario@example.com'
   -- Si Activo = 0 → Usuario desactivado
   ```
   **Solución:** Solicitar al administrador que active el usuario.

2. **Usuario borrado (`FechaBorrado != NULL`)**
   ```sql
   SELECT FechaBorrado, UsuarioIdBorrado
   FROM Usuario
   WHERE Email = 'usuario@example.com'
   ```
   **Solución:** Usuario fue eliminado. Debe ser recreado por administrador.

3. **Password caducado**
   ```sql
   SELECT FechaCaducidadPassword
   FROM Usuario
   WHERE Email = 'usuario@example.com'
   ```
   **Solución:** Usar opción "Olvidé mi contraseña" para resetear.

4. **Primer inicio pendiente (`PrimerInicio = 1`)**
   ```sql
   SELECT PrimerInicio FROM Usuario WHERE Email = 'usuario@example.com'
   ```
   **Solución:** Usuario debe cambiar contraseña en primer acceso.

---

#### PROBLEMA 2: Usuario autenticado pierde sesión constantemente

**Síntomas:**
- Usuario debe hacer login cada pocos minutos
- Sesión expira inesperadamente

**Diagnóstico:**

**Causas posibles:**

1. **Timeout de sesión (7 horas por defecto)**
   - Verificar configuración en `Startup.cs`
   - Timeout configurado: `TimeSpan.FromHours(7)`

2. **Cookies bloqueadas en navegador**
   - Cookie necesaria: `Acerca-BMW.Cookie`
   - Verificar que cookies estén habilitadas en navegador

3. **Múltiples pestañas/dispositivos**
   - Solo se permite una sesión activa por usuario
   - Si inicia sesión en otro dispositivo, se cierra la anterior

**Solución:**
- Verificar configuración de cookies en navegador
- Cerrar otras sesiones activas
- Contactar a IT si problema persiste

---

### 7.2 Problemas con Solicitudes

#### PROBLEMA 3: Solicitud queda en estado "En Proceso" indefinidamente

**Síntomas:**
- Solicitud creada hace >15 minutos
- Estado permanece en "En Proceso" (EstadoId = 2)
- No recibe confirmación de TMS/SLC

**Diagnóstico:**

```sql
-- Identificar solicitudes estancadas
SELECT
    s.Id,
    s.CodSolicitud,
    s.FechaCreacion,
    DATEDIFF(MINUTE, s.FechaCreacion, GETDATE()) AS MinutosEnProceso,
    ts.Nombre AS TipoSolicitud,
    u.Nombre AS Solicitante,
    u.Email
FROM Solicitud s
INNER JOIN TipoSolicitud ts ON s.TipoSolicitudId = ts.Id
INNER JOIN Usuario u ON s.UsuarioCreacion = u.Id
WHERE s.EstadoId = 2 -- En Proceso
  AND s.FechaBorrado IS NULL
  AND DATEDIFF(MINUTE, s.FechaCreacion, GETDATE()) > 15
ORDER BY s.FechaCreacion DESC
```

**Causas posibles:**

1. **Mensaje no llegó a Azure Service Bus**
   - Verificar estado de Service Bus en Azure Portal
   - Consultar queue "tms" o "slc"
   - Verificar si hay mensajes en Dead Letter Queue

2. **TMS/SLC no procesó el mensaje**
   - Verificar logs de TMS/SLC
   - Puede estar caído temporalmente

3. **Callback no llegó al portal**
   - Verificar endpoint de callback está accesible
   - Verificar logs en Application Insights

**Solución:**

```sql
-- Opción 1: Cambiar a estado Error para permitir reenvío
UPDATE Solicitud
SET EstadoId = 4, -- Error
    Comentarios = CONCAT(Comentarios, '\nCambiado a Error por timeout - ', GETDATE())
WHERE Id = @SolicitudId

-- Opción 2: Si se confirma manualmente en TMS
UPDATE Solicitud
SET EstadoId = 3, -- Registrada
    FechaFinalizacion = GETDATE(),
    Comentarios = CONCAT(Comentarios, '\nConfirmado manualmente - ', GETDATE())
WHERE Id = @SolicitudId
```

**Acción para usuario:**
- Usar botón "Reenviar" en el portal (si estado cambia a Error)
- Contactar con equipo TMS/SLC para verificación manual

---

#### PROBLEMA 4: Error "Transportes duplicados" al crear solicitud

**Síntomas:**
- Usuario intenta crear transporte
- Mensaje: "Los siguientes vehículos ya tienen transporte activo: VIN1, VIN2"

**Diagnóstico:**

```sql
-- Verificar transportes activos del vehículo
DECLARE @Bastidor NVARCHAR(17) = 'WBA12345678901234'

SELECT
    s.CodSolicitud,
    s.FechaCreacion,
    e.Nombre AS Estado,
    co.Nombre AS Origen,
    cd.Nombre AS Destino,
    u.Nombre AS Solicitante
FROM SolicitudDetalle sd
INNER JOIN Solicitud s ON sd.SolicitudId = s.Id
LEFT JOIN Estado e ON s.EstadoId = e.Id
LEFT JOIN Concesionario co ON sd.ConcesionarioIdOrigen = co.ConcesionarioId
LEFT JOIN Concesionario cd ON sd.ConcesionarioIdDestino = cd.ConcesionarioId
LEFT JOIN Usuario u ON s.UsuarioCreacion = u.Id
WHERE sd.NumeroBastidor = @Bastidor
  AND s.TipoSolicitudId = 2 -- Transporte
  AND s.EstadoId IN (1, 2, 3) -- Pendiente, En Proceso, Registrada
  AND s.FechaBorrado IS NULL
  AND sd.FechaBorrado IS NULL
ORDER BY s.FechaCreacion DESC
```

**Causas posibles:**

1. **Transporte legítimo activo**
   - Vehículo está siendo transportado actualmente
   - Debe esperar a que finalice

2. **Transporte antiguo no finalizado**
   - Transporte completado pero estado no actualizado
   - Solicitud abandonada

**Solución:**

**Si transporte es antiguo (>7 días) y no válido:**
```sql
-- Cancelar transporte antiguo
UPDATE Solicitud
SET EstadoId = 5, -- Cancelada
    FechaFinalizacion = GETDATE(),
    Comentarios = CONCAT(Comentarios, '\nCancelado por soporte - transporte antiguo no válido')
WHERE Id = @SolicitudId

UPDATE SolicitudDetalle
SET EstadoId = 5
WHERE SolicitudId = @SolicitudId
```

**Si transporte es legítimo:**
- Informar al usuario que debe esperar
- Proporcionar datos del transporte activo

---

#### PROBLEMA 5: Error "Vehículo requiere validación KOVP2"

**Síntomas:**
- Usuario intenta crear transporte
- Mensaje: "Los siguientes vehículos requieren validación especial KOVP2"

**Diagnóstico:**

```sql
-- Verificar si vehículo tiene KOVP2
SELECT
    c.Nombre AS Concesionario,
    c.Buno,
    ch.Codigo AS CodigoHST,
    ch.Nombre AS NombreHST,
    ch.KOVP2
FROM Concesionario c
INNER JOIN CodigoHST ch ON c.Buno = ch.Codigo
WHERE ch.KOVP2 = 1
  AND c.ConcesionarioId = @ConcesionarioId
```

**Explicación:**
- `KOVP2 = 1` indica que los vehículos de este concesionario/código HST requieren autorización especial antes de transporte
- Es una medida de seguridad para ciertos concesionarios

**Solución:**
- Usuario debe solicitar autorización al administrador
- Administrador debe aprobar manualmente el transporte
- No hay bypass automático para esta validación

---

### 7.3 Problemas con Permisos

#### PROBLEMA 6: Usuario no ve módulos/opciones esperadas

**Síntomas:**
- Usuario reporta que no ve ciertas opciones en el menú
- Opciones aparecen en gris o no aparecen

**Diagnóstico:**

```sql
-- Ver todos los permisos del usuario
DECLARE @UsuarioId INT = 123

SELECT
    r.Nombre AS Rol,
    pr.Nombre AS Proceso,
    pr.Abreviatura AS ProcesoAbrev,
    p.Nombre AS Permiso,
    p.Abreviatura AS PermisoAbrev
FROM Usuario u
INNER JOIN UsuarioRol ur ON u.Id = ur.UsuarioId
INNER JOIN Rol r ON ur.RolId = r.Id
INNER JOIN RolProcesoPermiso rpp ON r.Id = rpp.RolId
INNER JOIN Proceso pr ON rpp.ProcesoId = pr.Id
INNER JOIN Permiso p ON rpp.PermisoId = p.Id
WHERE u.Id = @UsuarioId
ORDER BY r.Nombre, pr.Nombre, p.Nombre
```

**Verificar permisos específicos:**

```sql
-- Verificar si usuario tiene permiso para ver solicitudes
SELECT COUNT(*) AS TienePermiso
FROM Usuario u
INNER JOIN UsuarioRol ur ON u.Id = ur.UsuarioId
INNER JOIN RolProcesoPermiso rpp ON ur.RolId = rpp.RolId
INNER JOIN Proceso pr ON rpp.ProcesoId = pr.Id
WHERE u.Id = @UsuarioId
  AND pr.Abreviatura = 'SOL' -- Solicitudes
  AND rpp.PermisoId = 1 -- Ver

-- Si COUNT = 0 → No tiene permiso
```

**Solución:**
- Contactar al administrador para asignar roles/permisos necesarios
- Verificar que usuario esté en el grupo correcto de usuarios

---

#### PROBLEMA 7: Usuario no ve vehículos/concesionarios esperados

**Síntomas:**
- Usuario busca vehículos pero no aparecen resultados
- Usuario no ve ciertos concesionarios en dropdown

**Diagnóstico:**

```sql
-- Verificar concesionarios asignados al usuario
SELECT c.Nombre, c.Buno, c.Activo
FROM Concesionario c
INNER JOIN UsuarioConcesionario uc ON c.ConcesionarioId = uc.ConcesionarioId
WHERE uc.UsuarioId = @UsuarioId
  AND c.FechaBorrado IS NULL
ORDER BY c.Nombre

-- Verificar flag AllConcesionarios
SELECT AllConcesionarios FROM Usuario WHERE Id = @UsuarioId
-- Si AllConcesionarios = 1 → Ve todos
-- Si AllConcesionarios = 0 → Solo ve asignados
```

**Solución:**
- Si debe ver todos: Administrador debe activar `AllConcesionarios = 1`
- Si debe ver específicos: Administrador debe asignar concesionarios en `UsuarioConcesionario`

---

### 7.4 Problemas de Integración

#### PROBLEMA 8: Error al consultar MoveIT - "Token inválido"

**Síntomas:**
- Búsqueda de vehículos falla
- Error: "401 Unauthorized" o "Token inválido"

**Diagnóstico:**
- Verificar configuración de token en `appsettings.json`
- Token actual: `2e6aecba-6279-4b39-a9b9-2547c6d28353`

**Solución:**
- Verificar que token no haya caducado
- Contactar con equipo de MoveIT para renovar token
- Actualizar token en configuración

---

#### PROBLEMA 9: Timeout al enviar a TMS/SLC

**Síntomas:**
- Solicitud falla con timeout
- Error en logs: "TaskCanceledException" o "Timeout"

**Diagnóstico:**

```sql
-- Buscar solicitudes con error de timeout en comentarios
SELECT
    s.Id,
    s.CodSolicitud,
    s.Comentarios
FROM Solicitud s
WHERE s.EstadoId = 4 -- Error
  AND s.Comentarios LIKE '%timeout%'
  AND s.FechaCreacion >= DATEADD(DAY, -7, GETDATE())
```

**Causas posibles:**
1. TMS/SLC está lento o sobrecargado
2. Red inestable
3. Timeout configurado muy corto

**Solución:**
- Usar botón "Reenviar" en el portal
- Si persiste, verificar estado de TMS/SLC
- Aumentar timeout en configuración si es necesario

---

### 7.5 Problemas de Datos

#### PROBLEMA 10: Vehículo no encontrado en búsqueda

**Síntomas:**
- Usuario busca por VIN pero no aparece
- VIN es correcto (17 caracteres)

**Diagnóstico:**

```sql
-- Buscar vehículo en BD local
SELECT
    sd.NumeroBastidor,
    sd.MarcaModelo,
    s.CodSolicitud,
    s.FechaCreacion,
    e.Nombre AS Estado
FROM SolicitudDetalle sd
INNER JOIN Solicitud s ON sd.SolicitudId = s.Id
LEFT JOIN Estado e ON s.EstadoId = e.Id
WHERE sd.NumeroBastidor = 'WBA12345678901234'
  AND s.FechaBorrado IS NULL
  AND sd.FechaBorrado IS NULL
ORDER BY s.FechaCreacion DESC

-- Si no aparece en BD local, verificar en sistemas externos
```

**Causas posibles:**
1. Vehículo nunca ha sido registrado en el portal
2. Todas las solicitudes del vehículo fueron borradas
3. VIN incorrecto o con espacios

**Solución:**
- Verificar VIN (sin espacios, 17 caracteres exactos)
- Si vehículo existe en MoveIT/TMS/SLC, aparecerá en búsqueda online
- Crear primera solicitud para registrarlo en BD local

---

#### PROBLEMA 11: Datos desincronizados entre Portal y TMS/SLC

**Síntomas:**
- Portal muestra un estado, TMS/SLC muestra otro
- Datos no coinciden

**Diagnóstico:**

```sql
-- Ver última sincronización de solicitud
SELECT
    s.CodSolicitud,
    s.EstadoId AS EstadoPortal,
    sd.IdSolicitudTMS,
    sd.IdSolicitudSLC,
    s.FechaCreacion,
    s.FechaFinalizacion,
    h.Fecha AS UltimaActualizacion
FROM Solicitud s
LEFT JOIN SolicitudDetalle sd ON s.Id = sd.SolicitudId
LEFT JOIN (
    SELECT SolicitudId, MAX(Fecha) AS Fecha
    FROM SolicitudesHistoricoEstados
    GROUP BY SolicitudId
) h ON s.Id = h.SolicitudId
WHERE s.Id = @SolicitudId
```

**Causas posibles:**
1. Callback de TMS/SLC falló
2. Estado cambió en sistema externo pero no se notificó
3. Actualización manual en TMS/SLC

**Solución:**
- Consultar estado actual en TMS/SLC directamente
- Actualizar manualmente en portal si es necesario:
  ```sql
  UPDATE Solicitud
  SET EstadoId = @EstadoCorrect,
      Comentarios = CONCAT(Comentarios, '\nActualizado manualmente por soporte')
  WHERE Id = @SolicitudId
  ```

---

### 7.6 Problemas de Rendimiento

#### PROBLEMA 12: Búsqueda de vehículos muy lenta

**Síntomas:**
- Búsqueda tarda >30 segundos
- Timeout en algunos casos

**Diagnóstico:**

**Causas posibles:**
1. Búsqueda con filtros muy amplios (todos los vehículos)
2. Consulta a APIs externas (MoveIT, SLC, TMS) simultánea
3. BD sobrecargada

**Solución:**
- Recomendar usar filtros más específicos:
  - Rango de fechas acotado
  - Código HST específico
  - VINs específicos
- Evitar búsquedas sin filtros
- Usar accesos directos guardados para búsquedas frecuentes

---

### 7.7 Problemas de Documentos

#### PROBLEMA 13: No se pueden subir documentos

**Síntomas:**
- Upload falla
- Error: "Archivo demasiado grande" o "Tipo no permitido"

**Diagnóstico:**

**Causas posibles:**
1. Archivo excede tamaño máximo permitido
2. Tipo de archivo no permitido
3. Espacio en disco insuficiente

**Solución:**
- Verificar tamaño de archivo (máximo recomendado: 10MB)
- Tipos permitidos: PDF, JPG, PNG, DOC, DOCX, XLS, XLSX
- Comprimir archivo si es muy grande
- Verificar espacio en disco del servidor

---

### 7.8 Checklist Rápido de Troubleshooting

**Cuando un usuario reporta un problema:**

1. ✅ **Identificar usuario**
   ```sql
   SELECT * FROM Usuario WHERE Email = 'usuario@example.com'
   ```

2. ✅ **Verificar permisos**
   ```sql
   -- Roles y permisos del usuario
   SELECT r.Nombre, pr.Abreviatura, p.Abreviatura
   FROM Usuario u
   INNER JOIN UsuarioRol ur ON u.Id = ur.UsuarioId
   INNER JOIN Rol r ON ur.RolId = r.Id
   INNER JOIN RolProcesoPermiso rpp ON r.Id = rpp.RolId
   INNER JOIN Proceso pr ON rpp.ProcesoId = pr.Id
   INNER JOIN Permiso p ON rpp.PermisoId = p.Id
   WHERE u.Email = 'usuario@example.com'
   ```

3. ✅ **Verificar solicitud (si aplica)**
   ```sql
   SELECT * FROM Solicitud WHERE CodSolicitud = 'TRA-2026-000123'
   ```

4. ✅ **Revisar histórico**
   ```sql
   SELECT * FROM SolicitudesHistoricoEstados
   WHERE SolicitudId = @Id
   ORDER BY Fecha DESC
   ```

5. ✅ **Verificar integraciones**
   - Revisar logs de Application Insights
   - Verificar estado de Azure Service Bus
   - Consultar directamente TMS/SLC si es necesario

---