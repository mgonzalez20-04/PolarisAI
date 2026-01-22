# Manual Portal BGB - MÓDULOS FUNCIONALES (Parte 2)

_Capítulo 4 - Secciones 4.8-4.14_

---

### 4.8 MÓDULO 7: Cesiones (Cambios de Propietario)

**Controlador:** `VehiculosController` (métodos de cesión)
**Vistas principales:**
- `Vehiculos/Cesion.cshtml` - Lista de cesiones
- `Vehiculos/SolicitudCambioPropietario.cshtml` - Crear cesión
- `Shared/_AcceptCesion.cshtml` - Modal aceptar cesión

**Permisos necesarios:**
- `CESION_VER` - Ver cesiones
- `CESION_EDIT` - Crear/gestionar cesiones

#### Funcionalidad

Una **cesión** es el cambio de propietario de un vehículo entre concesionarios.

**Diferencia con Trasiego:**
- **Trasiego**: Cambio de destino durante transporte (el vehículo se mueve físicamente)
- **Cesión**: Cambio de propietario/titularidad (puede o no implicar movimiento físico)

**Características:**

1. **Tipos de Cesión**
   - **Con transporte**: Se crea solicitud de transporte automáticamente
   - **Sin transporte**: Solo cambio de titularidad en sistema

2. **Validación de Cesión**
   - Requiere que el código HST tenga `Cesion = 1`
   - Si `CodigoHST.Cesion = 0`, no se permite cesión

3. **Estados de Cesión**
   - **Pendiente**: Esperando aceptación del concesionario destino
   - **Aceptada**: Concesionario destino aceptó
   - **Rechazada**: Concesionario destino rechazó
   - **Con OT**: Cesión aceptada con orden de trabajo
   - **Sin OT**: Cesión aceptada sin orden de trabajo

4. **Campos Importantes de la Tabla Cesion**
   - `Bastidor`: VIN del vehículo
   - `CodDealer`: Código del concesionario cedente
   - `IdOrigen`: Concesionario que cede
   - `IdDestino`: Concesionario que recibe
   - `IdSolicitud`: Si genera transporte, FK a Solicitud
   - `Campa`: Campo (campaña)

#### Tablas Involucradas

- `Cesion` - Registro de la cesión
- `HistoricoCambioPropietario` - Histórico de cambios
- `HistoricoCambioPropietarioFicheros` - Documentos de cesiones
- `Solicitud` - Si genera transporte
- `Concesionario` - Origen y destino
- `CodigoHST` - Validación de cesión permitida

#### Flujo de Cesión

```
1. Usuario accede a Vehículos → Cesión
2. VehiculosController.Cesion() [GET]
   └─ Retorna vista con lista de cesiones pendientes
3. Usuario click "Nueva Cesión"
4. VehiculosController.SolicitudCambioPropietario() [GET]
   ├─ Carga concesionarios disponibles
   └─ Retorna formulario
5. Usuario completa datos:
   - VIN del vehículo
   - Concesionario origen (cedente)
   - Concesionario destino (receptor)
   - Solicitante
   - Comentarios
   - ¿Requiere transporte? (checkbox)
6. VehiculosController.GuardarCesion() [POST]
   ├─ Valida que código HST permita cesión:
   │  SELECT Cesion FROM CodigoHST WHERE Codigo = @CodigoHST
   │  IF Cesion = 0 → Error: "No se permite cesión"
   ├─ Crea registro en Cesion:
   │  INSERT INTO Cesion (Bastidor, CodDealer, IdOrigen, IdDestino, ...)
   ├─ Si requiere transporte:
   │  ├─ Crea Solicitud de transporte
   │  ├─ Vincula: Cesion.IdSolicitud = Solicitud.Id
   │  └─ Envía a TMS
   ├─ Notifica a admin del concesionario destino
   └─ Estado = Pendiente
7. Admin concesionario destino recibe notificación
8. Admin accede a Vehículos → Cesión
9. Admin hace click en cesión pendiente
10. VehiculosController.ShowCesion(id) [AJAX]
    └─ Abre modal con detalle
11. Admin puede:
    - Aceptar con OT → VehiculosController.AcceptCesionConOT(id)
      ├─ Estado = Aceptada Con OT
      └─ Notifica a cedente
    - Aceptar sin OT → VehiculosController.AcceptCesionSinOT(id)
      ├─ Estado = Aceptada Sin OT
      └─ Notifica a cedente
    - Rechazar → VehiculosController.RejectCesion(id)
      ├─ Estado = Rechazada
      ├─ Si tenía solicitud vinculada, la cancela
      └─ Notifica a cedente
```

#### Código SQL de Ejemplo

```sql
-- Listar cesiones pendientes para un concesionario
DECLARE @ConcesionarioId INT = 10

SELECT
    c.Id,
    c.Bastidor,
    c.Fecha,
    c.Solicitante,
    co.Nombre AS ConcesionarioOrigen,
    cd.Nombre AS ConcesionarioDestino,
    c.Estado,
    c.Campa,
    CASE WHEN c.IdSolicitud IS NOT NULL THEN 'Sí' ELSE 'No' END AS RequiereTransporte,
    s.CodSolicitud
FROM Cesion c
LEFT JOIN Concesionario co ON c.IdOrigen = co.ConcesionarioId
LEFT JOIN Concesionario cd ON c.IdDestino = cd.ConcesionarioId
LEFT JOIN Solicitud s ON c.IdSolicitud = s.Id
WHERE c.IdDestino = @ConcesionarioId
  AND c.Estado = 'Pendiente'
ORDER BY c.Fecha DESC

-- Verificar si código HST permite cesión
SELECT
    ch.Codigo,
    ch.Nombre,
    ch.Cesion,
    CASE WHEN ch.Cesion = 1 THEN 'Permitida' ELSE 'No Permitida' END AS EstadoCesion
FROM CodigoHST ch
WHERE ch.Codigo = @CodigoHST
  AND ch.FechaBorrado IS NULL
```

---

### 4.9 MÓDULO 8: Usuarios

**Controlador:** `UsuariosController` (237 líneas)
**Vistas principales:**
- `Usuarios/Index.cshtml` - Lista de usuarios
- `Shared/_AddEditUsuarios.cshtml` - Modal crear/editar usuario

**Permisos necesarios:**
- `USU_VER` - Ver usuarios
- `USU_EDIT` - Crear/editar usuarios
- `USUALL_VER` - Ver todos los usuarios (admin)

#### Funcionalidad

Gestión completa de usuarios del sistema:

1. **Crear Usuario**
   - Información básica (nombre, email, password)
   - Asignación de grupo de usuarios
   - Configuración de permisos:
     - Roles
     - Procesos
     - Concesionarios
     - Marcas
     - Tipos de servicios
     - Códigos TMS/SLC
     - Cuentas de facturación
     - Códigos HST

2. **Editar Usuario**
   - Modificar información básica
   - Cambiar password
   - Actualizar permisos y asignaciones
   - Activar/desactivar usuario

3. **Clonar Usuario**
   - Copia toda la configuración de un usuario existente a uno nuevo
   - Útil para crear usuarios con permisos similares

4. **Filtros de Usuario**
   - Por nombre
   - Por email
   - Por estado (activo/inactivo)
   - Por grupo de usuarios

5. **Campos Especiales**
   - `AllConcesionarios`: Si = 1, ve todos los concesionarios
   - `AllMarcas`: Si = 1, ve todas las marcas
   - `AllTipoServicios`: Si = 1, ve todos los servicios
   - `PrimerInicio`: Si = 1, se fuerza cambio de password en primer login
   - `DireccionLibre`: Si = 1, puede usar direcciones libres (no concesionarios)

#### Tablas Involucradas

- `Usuario` - Tabla principal
- `UsuarioRol` - Roles asignados
- `UsuarioProceso` - Procesos permitidos
- `UsuarioConcesionario` - Concesionarios asignados
- `UsuarioMarca` - Marcas permitidas
- `UsuarioTipoServicio` - Servicios permitidos
- `UsuarioTMS` - Códigos TMS
- `UsuarioSLC` - Códigos SLC
- `UsuarioCuentaFacturacion` - Cuentas de facturación
- `UsuarioCodigoHST` - Códigos HST
- `GruposUsuarios` - Grupo al que pertenece

#### Flujo de Creación de Usuario

```
1. Admin accede a Usuarios/Index
2. Click "Crear Usuario"
3. UsuariosController.Create() [GET]
   ├─ Carga listas para dropdowns:
   │  - Grupos de usuarios
   │  - Roles disponibles
   │  - Concesionarios
   │  - Marcas
   │  - Tipos de servicios
   │  - Cuentas de facturación
   └─ Retorna modal con formulario
4. Admin completa datos del usuario
5. UsuariosController.Create(UsuarioVMO) [POST]
   ├─ Valida ModelState
   ├─ Valida email no duplicado:
   │  IF EXISTS (SELECT 1 FROM Usuario WHERE Email = @Email)
   │    → Error: "Email ya existe"
   ├─ Encripta password
   ├─ UsuariosService.Add(element, userId)
   │  ├─ INSERT INTO Usuario (...)
   │  ├─ @NewUserId = SCOPE_IDENTITY()
   │  ├─ Gestionar relaciones M:M:
   │  │  ├─ GestionarRoles(@NewUserId, rolesSeleccionados)
   │  │  │  └─ INSERT INTO UsuarioRol (UsuarioId, RolId) VALUES (...)
   │  │  ├─ GestionarProcesos(@NewUserId, procesosSeleccionados)
   │  │  ├─ GestionarConcesionarios(@NewUserId, concesSeleccionados)
   │  │  ├─ GestionarMarcas(@NewUserId, marcasSeleccionadas)
   │  │  ├─ GestionarTipoServicios(@NewUserId, serviciosSeleccionados)
   │  │  ├─ GestionarTMS(@NewUserId, tmsSeleccionados)
   │  │  ├─ GestionarSLC(@NewUserId, slcSeleccionados)
   │  │  ├─ GestionarCuentasFacturacion(@NewUserId, cuentasSeleccionadas)
   │  │  └─ GestionarCodigosHST(@NewUserId, codigosSeleccionados)
   │  └─ COMMIT TRANSACTION
   └─ Redirecciona a Index con mensaje de éxito
```

#### Flujo de Clonación de Usuario

```
1. Admin accede a Usuarios/Index
2. Click "Clonar" en usuario existente
3. UsuariosController.Clone(id) [GET]
   ├─ UsuariosService.GetById(id)
   │  └─ Obtiene usuario completo con todas sus relaciones
   ├─ Crea nuevo UsuarioVMO con datos del original:
   │  - Nombre: "{Original} - Copia"
   │  - Email: vacío (debe introducir nuevo)
   │  - Password: vacío (debe introducir nuevo)
   │  - COPIA todos los roles, concesionarios, marcas, etc.
   └─ Retorna modal prellenado
4. Admin modifica email y password
5. UsuariosController.Create(UsuarioVMO) [POST]
   └─ Crea nuevo usuario con toda la configuración copiada
```

#### Código SQL de Ejemplo

```sql
-- Obtener usuario completo con todas sus asignaciones
DECLARE @UsuarioId INT = 123

-- Usuario base
SELECT * FROM Usuario WHERE Id = @UsuarioId

-- Roles
SELECT r.* FROM Rol r
INNER JOIN UsuarioRol ur ON r.Id = ur.RolId
WHERE ur.UsuarioId = @UsuarioId

-- Concesionarios
SELECT c.* FROM Concesionario c
INNER JOIN UsuarioConcesionario uc ON c.ConcesionarioId = uc.ConcesionarioId
WHERE uc.UsuarioId = @UsuarioId AND c.FechaBorrado IS NULL

-- Marcas
SELECT m.* FROM Marca m
INNER JOIN UsuarioMarca um ON m.Id = um.MarcaId
WHERE um.UsuarioId = @UsuarioId

-- Tipos de servicios
SELECT ts.* FROM TipoServicio ts
INNER JOIN UsuarioTipoServicio uts ON ts.Id = uts.TipoServicioId
WHERE uts.UsuarioId = @UsuarioId AND ts.FechaBorrado IS NULL

-- Cuentas de facturación
SELECT cf.* FROM CuentasFacturacion cf
INNER JOIN UsuarioCuentaFacturacion ucf ON cf.Id = ucf.CuentaFacturacionId
WHERE ucf.UsuarioId = @UsuarioId AND cf.FechaBorrado IS NULL

-- Códigos HST
SELECT ch.* FROM CodigoHST ch
INNER JOIN UsuarioCodigoHST uch ON ch.Codigo = uch.CodigoHST
WHERE uch.UsuarioId = @UsuarioId AND ch.FechaBorrado IS NULL
```

---

### 4.10 MÓDULO 9: Roles y Permisos

**Controlador:** `RolesController` (120 líneas)
**Vistas principales:**
- `Roles/Index.cshtml` - Gestión de roles y permisos
- `Shared/_Rol.cshtml` - Modal editar rol
- `Shared/_TablaRoles.cshtml` - Tabla de permisos

**Permisos necesarios:**
- `ROLPER_VER` - Ver roles y permisos
- `ROLPER_EDIT` - Editar roles y permisos

#### Funcionalidad

Sistema de permisos granular basado en matriz **Rol → Proceso → Permiso**:

1. **Estructura de Permisos**
   ```
   Rol (ej: Admin)
     └─ Proceso (ej: Gestión de Usuarios)
          └─ Permisos:
              - Ver (lectura)
              - Editar (escritura)
              - Usuario (permisos de usuario)
   ```

2. **Vista de Gestión**
   - Tabla con todos los roles en columnas
   - Todos los procesos en filas
   - Checkboxes para cada combinación Rol-Proceso-Permiso
   - Guardado automático mediante AJAX

3. **Permisos Estándar**
   - **Ver (Id: 1)**: Permiso de lectura
   - **Editar (Id: 2)**: Permiso de escritura
   - **Usuario (Id: 3)**: Permiso de gestión de usuarios en ese proceso

4. **Roles Comunes del Sistema**
   - `ADMIN`: Administrador completo
   - `USUARIO`: Usuario estándar
   - `TRANSPORTISTA`: Usuario de empresa de transporte
   - `GESTOR`: Usuario de gestión
   - `SOPORTE`: Usuario de soporte técnico

#### Tablas Involucradas

- `Rol` - Definición de roles
- `Proceso` - Procesos/módulos del sistema
- `Permiso` - Permisos disponibles
- `RolProcesoPermiso` - Matriz de permisos (relación ternaria)

#### Flujo de Gestión de Permisos

```
1. Admin accede a Roles/Index
2. RolesController.Index() [GET]
   ├─ RolesService.List() → Obtiene todos los roles
   ├─ ProcesosService.List() → Obtiene todos los procesos
   ├─ PermisosService.List() → Obtiene todos los permisos
   ├─ RolesProcesosPermisosService.GetAll()
   │  └─ SELECT * FROM RolProcesoPermiso
   └─ Retorna vista con tabla de permisos
3. Vista renderiza tabla:
   - Cabecera: Roles (columnas)
   - Filas: Procesos
   - Celdas: Checkboxes para Ver/Editar/Usuario
4. Admin marca/desmarca checkbox
5. JavaScript captura cambio → AJAX
6. RolesController.UpdatePermiso() [POST]
   ├─ Recibe: RolId, ProcesoId, PermisoId, Asignar (bool)
   ├─ Si Asignar = true:
   │  └─ RolesProcesosPermisosService.Asignar(rolId, procesoId, permisoId)
   │     └─ INSERT INTO RolProcesoPermiso (RolId, ProcesoId, PermisoId)
   │        VALUES (@RolId, @ProcesoId, @PermisoId)
   ├─ Si Asignar = false:
   │  └─ RolesProcesosPermisosService.Eliminar(rolId, procesoId, permisoId)
   │     └─ DELETE FROM RolProcesoPermiso
   │        WHERE RolId = @RolId AND ProcesoId = @ProcesoId AND PermisoId = @PermisoId
   └─ Retorna JSON { success: true }
7. JavaScript actualiza checkbox visualmente
```

#### Validación de Permisos en Código

**En Controladores:**
```csharp
[Authorize(Roles = "USU_VER,USU_EDIT")]
public class UsuariosController : BaseController
{
    [Authorize(Roles = "USU_EDIT")]
    public IActionResult Create()
    {
        // Solo usuarios con USU_EDIT pueden crear
    }
}
```

**En Servicios:**
```csharp
public List<Usuario> List(UsuariosFilter filter)
{
    if (HasProcesoPermiso("USUALL_VER"))
    {
        // Usuario puede ver todos los usuarios
        return UsuariosRepository.List(filter);
    }
    else
    {
        // Usuario solo ve usuarios de sus concesionarios
        return UsuariosRepository.ListByUsuario(_userId, filter);
    }
}
```

#### Código SQL de Ejemplo

```sql
-- Obtener todos los permisos de un rol específico
DECLARE @RolId INT = 1

SELECT
    r.Nombre AS Rol,
    pr.Nombre AS Proceso,
    pr.Ruta AS RutaControlador,
    p.Nombre AS Permiso
FROM RolProcesoPermiso rpp
INNER JOIN Rol r ON rpp.RolId = r.Id
INNER JOIN Proceso pr ON rpp.ProcesoId = pr.Id
INNER JOIN Permiso p ON rpp.PermisoId = p.Id
WHERE rpp.RolId = @RolId
ORDER BY pr.Nombre, p.Nombre

-- Verificar si un usuario tiene un permiso específico
DECLARE @UsuarioId INT = 123
DECLARE @ProcesoAbreviatura NVARCHAR(50) = 'USU' -- Usuarios
DECLARE @PermisoId INT = 2 -- Editar

SELECT COUNT(*) AS TienePermiso
FROM Usuario u
INNER JOIN UsuarioRol ur ON u.Id = ur.UsuarioId
INNER JOIN RolProcesoPermiso rpp ON ur.RolId = rpp.RolId
INNER JOIN Proceso pr ON rpp.ProcesoId = pr.Id
WHERE u.Id = @UsuarioId
  AND pr.Abreviatura = @ProcesoAbreviatura
  AND rpp.PermisoId = @PermisoId

-- Si COUNT = 0 → No tiene permiso
-- Si COUNT > 0 → Tiene permiso
```

---

### 4.11 MÓDULO 10: Concesionarios

**Controlador:** `ConcesionariosController`
**Vistas principales:**
- `Concesionarios/Index.cshtml` - Lista de concesionarios
- `Concesionarios/Concesionario.cshtml` - Crear/editar concesionario

**Permisos necesarios:**
- `CONC_VER` - Ver concesionarios
- `CONC_EDIT` - Crear/editar concesionarios

#### Funcionalidad

Gestión de la red de concesionarios BMW:

1. **Información de Concesionario**
   - Nombre
   - Código BUNO (identificador BMW único)
   - Tipo
   - Code
   - Canal
   - Campa (campaña)
   - Dirección completa
   - Estado (activo/inactivo)

2. **Integración con Sistemas Externos**
   - `IdDireccionTMS`: ID en sistema TMS
   - `IdDireccionSLC`: ID en sistema SLC
   - `CuentaFacturacion`: Cuenta por defecto

3. **Direcciones Secundarias**
   - Un concesionario puede tener múltiples direcciones
   - Tabla: `ConcesionarioDirecciones`

4. **Grupos de Concesionarios**
   - Agrupación lógica por región, tipo, etc.
   - Tabla: `GrupoConcesionario`

#### Tablas Involucradas

- `Concesionario` - Datos principales
- `ConcesionarioDirecciones` - Direcciones adicionales
- `GrupoConcesionario` - Grupos de concesionarios
- `UsuarioConcesionario` - Asignación a usuarios

#### Código SQL de Ejemplo

```sql
-- Listar concesionarios activos con sus códigos de integración
SELECT
    c.ConcesionarioId,
    c.Nombre,
    c.Buno,
    c.Tipo,
    c.Canal,
    c.IdDireccionTMS,
    c.IdDireccionSLC,
    c.CuentaFacturacion,
    c.Activo,
    COUNT(uc.UsuarioId) AS UsuariosAsignados
FROM Concesionario c
LEFT JOIN UsuarioConcesionario uc ON c.ConcesionarioId = uc.ConcesionarioId
WHERE c.FechaBorrado IS NULL
  AND c.Activo = 1
GROUP BY c.ConcesionarioId, c.Nombre, c.Buno, c.Tipo, c.Canal,
         c.IdDireccionTMS, c.IdDireccionSLC, c.CuentaFacturacion, c.Activo
ORDER BY c.Nombre

-- Obtener direcciones de un concesionario
SELECT * FROM ConcesionarioDirecciones
WHERE ConcesionarioId = @ConcesionarioId
ORDER BY Id
```

---

### 4.12 MÓDULO 11: Tipos de Servicios

**Controlador:** `TipoServiciosController`
**Vistas principales:**
- `TipoServicios/Index.cshtml` - Lista de tipos de servicios
- `Shared/_AddEditTipoServicios.cshtml` - Modal crear/editar

**Permisos necesarios:**
- `TIPOSERV_VER` - Ver tipos de servicios
- `TIPOSERV_EDIT` - Crear/editar tipos de servicios

#### Funcionalidad

Catálogo de servicios que se pueden solicitar:

1. **Información de Tipo de Servicio**
   - Nombre (ej: "PDI", "Reparación de Carrocería")
   - Código de servicio
   - Grupo al que pertenece
   - Anexo (documento descriptivo)
   - Código en SLC (`IdServicioSLC`)

2. **Grupos de Servicios**
   - Servicios de Preparación
   - Servicios de Reparación
   - Servicios de Mantenimiento
   - Servicios Especiales

3. **Asignación a Usuarios**
   - Si `Usuario.AllTipoServicios = 1` → Ve todos
   - Si no → Solo ve los asignados en `UsuarioTipoServicio`

#### Tablas Involucradas

- `TipoServicio` - Servicios disponibles
- `TipoServicioGrupo` - Agrupación de servicios
- `UsuarioTipoServicio` - Asignación a usuarios

#### Código SQL de Ejemplo

```sql
-- Listar servicios por grupo
SELECT
    tsg.Nombre AS Grupo,
    ts.Nombre AS Servicio,
    ts.CodigoServicio,
    ts.IdServicioSLC,
    COUNT(uts.UsuarioId) AS UsuariosAsignados
FROM TipoServicio ts
LEFT JOIN TipoServicioGrupo tsg ON ts.IdServicioGrupo = tsg.Id
LEFT JOIN UsuarioTipoServicio uts ON ts.Id = uts.TipoServicioId
WHERE ts.FechaBorrado IS NULL
GROUP BY tsg.Nombre, ts.Nombre, ts.CodigoServicio, ts.IdServicioSLC
ORDER BY tsg.Nombre, ts.Nombre
```

---

### 4.13 MÓDULO 12: Códigos HST

**Controlador:** `CodigoHSTController`
**Vistas principales:**
- `CodigoHST/Index.cshtml` - Lista de códigos HST

**Permisos necesarios:**
- `CODHST_VER` - Ver códigos HST
- `CODHST_EDIT` - Crear/editar códigos HST

#### Funcionalidad

Gestión de códigos HST (identificadores de concesionarios/gestionarios):

1. **Información de Código HST**
   - Nombre
   - Código
   - Zona
   - Canal
   - Flags especiales:
     - `Cesion`: Si = 1, permite cesiones
     - `KOVP2`: Si = 1, requiere validación especial para transportes
     - `BloquearServicios`: Si = 1, no permite solicitar servicios
     - `DobleTitularidad`: Si = 1, permite doble titularidad
   - `idDireccionTMS`: ID en sistema TMS

2. **Validaciones Asociadas**
   - **KOVP2**: Vehículos con este código requieren autorización especial antes de transporte
   - **BloquearServicios**: No se pueden crear solicitudes de servicio
   - **Cesion**: Solo si = 1 se permiten cesiones

#### Tablas Involucradas

- `CodigoHST` - Códigos HST
- `UsuarioCodigoHST` - Asignación a usuarios
- `GrupoUsuarioCodigoHST` - Asignación a grupos

#### Código SQL de Ejemplo

```sql
-- Listar códigos HST con flags especiales
SELECT
    ch.Codigo,
    ch.Nombre,
    ch.Zona,
    ch.Canal,
    CASE WHEN ch.Cesion = 1 THEN 'Sí' ELSE 'No' END AS PermiteCesion,
    CASE WHEN ch.KOVP2 = 1 THEN 'Sí' ELSE 'No' END AS RequiereValidacionKOVP2,
    CASE WHEN ch.BloquearServicios = 1 THEN 'Sí' ELSE 'No' END AS ServiciosBloqueados,
    COUNT(uch.UsuarioId) AS UsuariosAsignados
FROM CodigoHST ch
LEFT JOIN UsuarioCodigoHST uch ON ch.Codigo = uch.CodigoHST
WHERE ch.FechaBorrado IS NULL
GROUP BY ch.Codigo, ch.Nombre, ch.Zona, ch.Canal, ch.Cesion, ch.KOVP2, ch.BloquearServicios
ORDER BY ch.Codigo
```

---

### 4.14 MÓDULO 13: Configuración Personal

**Controlador:** `ConfiguracionPersonalController`
**Vistas principales:**
- `ConfiguracionPersonal/Index.cshtml` - Panel de configuración
- `ConfiguracionPersonal/SubidaPDF.cshtml` - Subir documento personal

**Permisos necesarios:**
- Usuario autenticado (cualquier rol)

#### Funcionalidad

Ajustes personales del usuario:

1. **Personalización de Columnas en Grids**
   - Seleccionar qué columnas mostrar
   - Ordenar columnas
   - Guardado automático por usuario
   - Tabla: `UsuarioColumnas`, `UsuarioColumnasOrdenacion`

2. **Cambio de Contraseña**
   - Contraseña actual
   - Nueva contraseña
   - Confirmación
   - Validación de complejidad

3. **Documentos Personales**
   - Subir documentos de uso personal
   - Referencias rápidas

4. **Preferencias de Notificaciones**
   - Configurar suscripciones a alertas
   - Tabla: `Suscripciones`

#### Tablas Involucradas

- `Usuario` - Datos del usuario
- `UsuarioColumnas` - Columnas visibles por grid
- `UsuarioColumnasOrdenacion` - Orden de columnas

---