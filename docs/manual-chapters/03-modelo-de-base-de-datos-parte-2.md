# Manual Portal BGB - MODELO DE BASE DE DATOS (Parte 2)

_Capítulo 3 - Secciones 3.4-3.5_

---

### 3.4 Stored Procedures Principales

El sistema utiliza **36+ stored procedures** para encapsular la lógica de acceso a datos. A continuación se documentan los más importantes:

#### 📋 STORED PROCEDURES: USUARIOS

**SP_Usuarios_List**
```sql
CREATE PROCEDURE SP_Usuarios_List
    @PageNumber INT = 1,
    @PageSize INT = 20,
    @Orderby NVARCHAR(50) = 'Id',
    @OrderbyDirection NVARCHAR(4) = 'ASC',
    @UsuarioId INT = NULL,
    @Nombre NVARCHAR(200) = NULL,
    @Email NVARCHAR(200) = NULL,
    @Activo BIT = NULL
AS
BEGIN
    -- Retorna lista paginada de usuarios con filtros
    -- Si UsuarioId es especificado y no tiene permiso USUALL_VER,
    -- solo retorna usuarios de sus concesionarios
END
```

**Uso:** Lista usuarios con paginación y filtros

---

**SP_Usuarios_GetById**
```sql
CREATE PROCEDURE SP_Usuarios_GetById
    @Id INT
AS
BEGIN
    SELECT * FROM Usuario WHERE Id = @Id AND FechaBorrado IS NULL
END
```

**Uso:** Obtiene un usuario específico por ID

---

**SP_Usuarios_Login**
```sql
CREATE PROCEDURE SP_Usuarios_Login
    @Email NVARCHAR(200),
    @Password NVARCHAR(MAX)
AS
BEGIN
    SELECT * FROM Usuario
    WHERE Email = @Email
      AND Password = @Password
      AND Activo = 1
      AND FechaBorrado IS NULL
END
```

**Uso:** Autenticación de usuario

---

**SP_Usuarios_ListRoles**
```sql
CREATE PROCEDURE SP_Usuarios_ListRoles
    @UsuarioId INT
AS
BEGIN
    SELECT r.*
    FROM Rol r
    INNER JOIN UsuarioRol ur ON r.Id = ur.RolId
    WHERE ur.UsuarioId = @UsuarioId
END
```

**Uso:** Obtiene todos los roles asignados a un usuario

---

**SP_Usuarios_AddRol / SP_Usuarios_DeleteRol**
```sql
CREATE PROCEDURE SP_Usuarios_AddRol
    @UsuarioId INT,
    @RolId INT
AS
BEGIN
    INSERT INTO UsuarioRol (UsuarioId, RolId)
    VALUES (@UsuarioId, @RolId)
END

CREATE PROCEDURE SP_Usuarios_DeleteRol
    @UsuarioId INT,
    @RolId INT
AS
BEGIN
    DELETE FROM UsuarioRol
    WHERE UsuarioId = @UsuarioId AND RolId = @RolId
END
```

**Uso:** Asignar/desasignar roles a usuarios

---

**SP_Usuarios_ListConcesionarios**
```sql
CREATE PROCEDURE SP_Usuarios_ListConcesionarios
    @UsuarioId INT
AS
BEGIN
    SELECT c.*
    FROM Concesionario c
    INNER JOIN UsuarioConcesionario uc ON c.ConcesionarioId = uc.ConcesionarioId
    WHERE uc.UsuarioId = @UsuarioId
      AND c.FechaBorrado IS NULL
END
```

**Uso:** Obtiene concesionarios asignados a un usuario

---

#### 📦 STORED PROCEDURES: SOLICITUDES

**SP_Solicitudes_Add**
```sql
CREATE PROCEDURE SP_Solicitudes_Add
    @CodSolicitud NVARCHAR(50),
    @TipoSolicitudId INT,
    @EstadoId INT,
    @UsuarioCreacion INT,
    @CuentasFacturacionId INT = NULL,
    @CodRac NVARCHAR(100) = NULL,
    @CodigoHST NVARCHAR(50) = NULL,
    @Trasiego BIT = 0,
    @Comentarios NVARCHAR(MAX) = NULL
AS
BEGIN
    INSERT INTO Solicitud (
        CodSolicitud, TipoSolicitudId, EstadoId, UsuarioCreacion,
        CuentasFacturacionId, CodRac, CodigoHST, Trasiego, Comentarios,
        FechaCreacion
    )
    VALUES (
        @CodSolicitud, @TipoSolicitudId, @EstadoId, @UsuarioCreacion,
        @CuentasFacturacionId, @CodRac, @CodigoHST, @Trasiego, @Comentarios,
        GETDATE()
    )

    SELECT SCOPE_IDENTITY() AS Id -- Retorna ID de la solicitud creada
END
```

**Uso:** Crea una nueva solicitud y retorna su ID

---

**SP_Solicitudes_UpdateStatus**
```sql
CREATE PROCEDURE SP_Solicitudes_UpdateStatus
    @Id INT,
    @EstadoId INT,
    @FechaFinalizacion DATETIME = NULL
AS
BEGIN
    UPDATE Solicitud
    SET EstadoId = @EstadoId,
        FechaFinalizacion = ISNULL(@FechaFinalizacion, FechaFinalizacion)
    WHERE Id = @Id

    -- Registrar en histórico
    INSERT INTO SolicitudesHistoricoEstados (SolicitudId, EstadoAnterior, EstadoNuevo, Fecha)
    SELECT @Id, EstadoId, @EstadoId, GETDATE()
    FROM Solicitud WHERE Id = @Id
END
```

**Uso:** Actualiza el estado de una solicitud y registra en histórico

---

**SP_Solicitudes_ListAllByUsuarioFilters**
```sql
CREATE PROCEDURE SP_Solicitudes_ListAllByUsuarioFilters
    @UsuarioId INT,
    @EstadoIds NVARCHAR(MAX) = NULL, -- '1,2,3'
    @FechaDesde DATETIME = NULL,
    @FechaHasta DATETIME = NULL,
    @CodSolicitud NVARCHAR(50) = NULL,
    @NumeroBastidor NVARCHAR(17) = NULL,
    @PageNumber INT = 1,
    @PageSize INT = 20
AS
BEGIN
    -- Lógica compleja:
    -- 1. Verifica permisos del usuario
    -- 2. Filtra solicitudes por concesionarios asignados
    -- 3. Aplica filtros de búsqueda
    -- 4. Retorna resultado paginado con información agregada

    SELECT
        s.*,
        u.Nombre AS Solicitante,
        COUNT(sd.Id) AS TotalVehiculos,
        (SELECT COUNT(*) FROM SolicitudDetalle WHERE SolicitudId = s.Id) AS TotalLineas
    FROM Solicitud s
    INNER JOIN Usuario u ON s.UsuarioCreacion = u.Id
    LEFT JOIN SolicitudDetalle sd ON s.Id = sd.SolicitudId
    WHERE s.FechaBorrado IS NULL
      AND (@EstadoIds IS NULL OR s.EstadoId IN (SELECT value FROM STRING_SPLIT(@EstadoIds, ',')))
      -- ... más filtros
    GROUP BY s.Id, s.CodSolicitud, u.Nombre
    ORDER BY s.FechaCreacion DESC
    OFFSET (@PageNumber - 1) * @PageSize ROWS
    FETCH NEXT @PageSize ROWS ONLY
END
```

**Uso:** Lista solicitudes con filtros complejos y paginación

---

**SP_Solicitudes_Datos_Temp**
```sql
CREATE PROCEDURE SP_Solicitudes_Datos_Temp
    @IdAgrupacion UNIQUEIDENTIFIER,
    @NumeroBastidor NVARCHAR(17),
    @Marca NVARCHAR(100),
    @Modelo NVARCHAR(100),
    @Origen NVARCHAR(200),
    @Destino NVARCHAR(200)
AS
BEGIN
    INSERT INTO SolicitudesDatosTemp (
        IdAgrupacion, NumeroBastidor, Marca, Modelo, Origen, Destino
    )
    VALUES (
        @IdAgrupacion, @NumeroBastidor, @Marca, @Modelo, @Origen, @Destino
    )
END
```

**Uso:** Guarda datos temporales para solicitudes masivas (>50 vehículos)

---

#### 🚗 STORED PROCEDURES: CONCESIONARIOS

**SP_Concesionarios_ListAll**
```sql
CREATE PROCEDURE SP_Concesionarios_ListAll
    @Activo BIT = NULL
AS
BEGIN
    SELECT * FROM Concesionario
    WHERE FechaBorrado IS NULL
      AND (@Activo IS NULL OR Activo = @Activo)
    ORDER BY Nombre
END
```

**Uso:** Lista todos los concesionarios (opcionalmente solo activos)

---

**SP_Concesionarios_GetByBuno**
```sql
CREATE PROCEDURE SP_Concesionarios_GetByBuno
    @Buno NVARCHAR(50)
AS
BEGIN
    SELECT * FROM Concesionario
    WHERE Buno = @Buno AND FechaBorrado IS NULL
END
```

**Uso:** Busca concesionario por código BUNO

---

#### 🔧 STORED PROCEDURES: SERVICIOS Y TIPOS

**SP_TipoServicios_List**
```sql
CREATE PROCEDURE SP_TipoServicios_List
AS
BEGIN
    SELECT ts.*, tsg.Nombre AS NombreGrupo
    FROM TipoServicio ts
    LEFT JOIN TipoServicioGrupo tsg ON ts.IdServicioGrupo = tsg.Id
    WHERE ts.FechaBorrado IS NULL
    ORDER BY ts.Nombre
END
```

**Uso:** Lista todos los tipos de servicios con su grupo

---

**SP_TiposMotorizacion_List**
```sql
CREATE PROCEDURE SP_TiposMotorizacion_List
AS
BEGIN
    SELECT * FROM TipoMotorizacion
    WHERE FechaBorrado IS NULL AND IsDeleted = 0
    ORDER BY Code
END
```

**Uso:** Lista tipos de motorización activos

---

#### 🔐 STORED PROCEDURES: ROLES Y PERMISOS

**SP_RolesProcesosPermisos_Add**
```sql
CREATE PROCEDURE SP_RolesProcesosPermisos_Add
    @RolId INT,
    @ProcesoId INT,
    @PermisoId INT
AS
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM RolProcesoPermiso
        WHERE RolId = @RolId AND ProcesoId = @ProcesoId AND PermisoId = @PermisoId
    )
    BEGIN
        INSERT INTO RolProcesoPermiso (RolId, ProcesoId, PermisoId)
        VALUES (@RolId, @ProcesoId, @PermisoId)
    END
END
```

**Uso:** Asigna un permiso a un rol para un proceso específico

---

### 3.5 Consultas SQL Útiles para Soporte

#### 🔍 CONSULTA 1: Ver información completa de una solicitud

```sql
-- Obtener toda la información de una solicitud por código
DECLARE @CodSolicitud NVARCHAR(50) = 'SOL-2026-0001'

SELECT
    s.Id,
    s.CodSolicitud,
    s.FechaCreacion,
    s.FechaFinalizacion,
    e.Nombre AS Estado,
    ts.Nombre AS TipoSolicitud,
    u.Nombre AS Solicitante,
    u.Email AS EmailSolicitante,
    cf.Nombre AS CuentaFacturacion,
    s.CodigoHST,
    s.CodRac,
    s.Trasiego,
    s.Comentarios,
    -- Contar detalles
    (SELECT COUNT(*) FROM SolicitudDetalle WHERE SolicitudId = s.Id) AS TotalVehiculos,
    (SELECT COUNT(*) FROM SolicitudDocumento WHERE SolicitudId = s.Id) AS TotalDocumentos
FROM Solicitud s
LEFT JOIN Estado e ON s.EstadoId = e.Id
LEFT JOIN TipoSolicitud ts ON s.TipoSolicitudId = ts.Id
LEFT JOIN Usuario u ON s.UsuarioCreacion = u.Id
LEFT JOIN CuentasFacturacion cf ON s.CuentasFacturacionId = cf.Id
WHERE s.CodSolicitud = @CodSolicitud
  AND s.FechaBorrado IS NULL

-- Obtener detalles de vehículos de la solicitud
SELECT
    sd.Id,
    sd.NumeroBastidor,
    sd.Matricula,
    sd.MarcaModelo,
    co.Nombre AS Origen,
    cd.Nombre AS Destino,
    e.Nombre AS Estado,
    sd.IdSolicitudSLC,
    sd.IdSolicitudTMS,
    sd.CodServicioTMS
FROM SolicitudDetalle sd
INNER JOIN Solicitud s ON sd.SolicitudId = s.Id
LEFT JOIN Concesionario co ON sd.ConcesionarioIdOrigen = co.ConcesionarioId
LEFT JOIN Concesionario cd ON sd.ConcesionarioIdDestino = cd.ConcesionarioId
LEFT JOIN Estado e ON sd.EstadoId = e.Id
WHERE s.CodSolicitud = @CodSolicitud
  AND sd.FechaBorrado IS NULL

-- Histórico de estados de la solicitud
SELECT
    h.Id,
    h.Fecha,
    ea.Nombre AS EstadoAnterior,
    en.Nombre AS EstadoNuevo,
    u.Nombre AS Usuario
FROM SolicitudesHistoricoEstados h
INNER JOIN Solicitud s ON h.SolicitudId = s.Id
LEFT JOIN Estado ea ON h.EstadoAnterior = ea.Id
LEFT JOIN Estado en ON h.EstadoNuevo = en.Id
LEFT JOIN Usuario u ON h.Usuario = u.Id
WHERE s.CodSolicitud = @CodSolicitud
ORDER BY h.Fecha DESC
```

---

#### 🔍 CONSULTA 2: Buscar solicitudes por VIN/Bastidor

```sql
-- Buscar todas las solicitudes de un vehículo específico
DECLARE @NumeroBastidor NVARCHAR(17) = 'WBA12345678901234'

SELECT
    s.CodSolicitud,
    s.FechaCreacion,
    ts.Nombre AS TipoSolicitud,
    e.Nombre AS Estado,
    u.Nombre AS Solicitante,
    sd.NumeroBastidor,
    sd.Matricula,
    co.Nombre AS Origen,
    cd.Nombre AS Destino,
    sd.IdSolicitudSLC,
    sd.IdSolicitudTMS
FROM SolicitudDetalle sd
INNER JOIN Solicitud s ON sd.SolicitudId = s.Id
LEFT JOIN TipoSolicitud ts ON s.TipoSolicitudId = ts.Id
LEFT JOIN Estado e ON s.EstadoId = e.Id
LEFT JOIN Usuario u ON s.UsuarioCreacion = u.Id
LEFT JOIN Concesionario co ON sd.ConcesionarioIdOrigen = co.ConcesionarioId
LEFT JOIN Concesionario cd ON sd.ConcesionarioIdDestino = cd.ConcesionarioId
WHERE sd.NumeroBastidor = @NumeroBastidor
  AND s.FechaBorrado IS NULL
  AND sd.FechaBorrado IS NULL
ORDER BY s.FechaCreacion DESC
```

---

#### 🔍 CONSULTA 3: Ver permisos completos de un usuario

```sql
-- Ver todos los permisos de un usuario específico
DECLARE @UsuarioId INT = 123

SELECT
    u.Nombre AS Usuario,
    u.Email,
    r.Nombre AS Rol,
    pr.Nombre AS Proceso,
    p.Nombre AS Permiso
FROM Usuario u
INNER JOIN UsuarioRol ur ON u.Id = ur.UsuarioId
INNER JOIN Rol r ON ur.RolId = r.Id
INNER JOIN RolProcesoPermiso rpp ON r.Id = rpp.RolId
INNER JOIN Proceso pr ON rpp.ProcesoId = pr.Id
INNER JOIN Permiso p ON rpp.PermisoId = p.Id
WHERE u.Id = @UsuarioId
ORDER BY r.Nombre, pr.Nombre, p.Nombre

-- Ver concesionarios asignados
SELECT c.Nombre, c.Buno, c.Activo
FROM Concesionario c
INNER JOIN UsuarioConcesionario uc ON c.ConcesionarioId = uc.ConcesionarioId
WHERE uc.UsuarioId = @UsuarioId
  AND c.FechaBorrado IS NULL
ORDER BY c.Nombre

-- Ver cuentas de facturación asignadas
SELECT cf.Nombre, cf.Codigo, cf.Tipo
FROM CuentasFacturacion cf
INNER JOIN UsuarioCuentaFacturacion ucf ON cf.Id = ucf.CuentaFacturacionId
WHERE ucf.UsuarioId = @UsuarioId
  AND cf.FechaBorrado IS NULL
ORDER BY cf.Nombre
```

---

#### 🔍 CONSULTA 4: Solicitudes con error

```sql
-- Listar todas las solicitudes con estado Error (Id = 4)
SELECT
    s.Id,
    s.CodSolicitud,
    s.FechaCreacion,
    ts.Nombre AS TipoSolicitud,
    u.Nombre AS Solicitante,
    u.Email,
    COUNT(sd.Id) AS TotalVehiculos,
    s.Comentarios
FROM Solicitud s
INNER JOIN Usuario u ON s.UsuarioCreacion = u.Id
LEFT JOIN TipoSolicitud ts ON s.TipoSolicitudId = ts.Id
LEFT JOIN SolicitudDetalle sd ON s.Id = sd.SolicitudId
WHERE s.EstadoId = 4 -- Error
  AND s.FechaBorrado IS NULL
  AND s.FechaCreacion >= DATEADD(DAY, -7, GETDATE()) -- Últimos 7 días
GROUP BY s.Id, s.CodSolicitud, s.FechaCreacion, ts.Nombre, u.Nombre, u.Email, s.Comentarios
ORDER BY s.FechaCreacion DESC
```

---

#### 🔍 CONSULTA 5: Auditoría de cambios (registros borrados)

```sql
-- Ver registros borrados en los últimos N días
DECLARE @Dias INT = 30

-- Usuarios borrados
SELECT
    'Usuario' AS TipoRegistro,
    u.Id,
    u.Nombre,
    u.Email,
    u.FechaBorrado,
    ub.Nombre AS BorradoPor
FROM Usuario u
LEFT JOIN Usuario ub ON u.UsuarioIdBorrado = ub.Id
WHERE u.FechaBorrado >= DATEADD(DAY, -@Dias, GETDATE())

UNION ALL

-- Solicitudes borradas
SELECT
    'Solicitud' AS TipoRegistro,
    s.Id,
    s.CodSolicitud AS Nombre,
    CAST(s.FechaCreacion AS NVARCHAR) AS Email,
    s.FechaBorrado,
    ub.Nombre AS BorradoPor
FROM Solicitud s
LEFT JOIN Usuario ub ON s.UsuarioIdBorrado = ub.Id
WHERE s.FechaBorrado >= DATEADD(DAY, -@Dias, GETDATE())

UNION ALL

-- Concesionarios borrados
SELECT
    'Concesionario' AS TipoRegistro,
    c.ConcesionarioId AS Id,
    c.Nombre,
    c.Buno AS Email,
    c.FechaBorrado,
    ub.Nombre AS BorradoPor
FROM Concesionario c
LEFT JOIN Usuario ub ON c.UsuarioIdBorrado = ub.Id
WHERE c.FechaBorrado >= DATEADD(DAY, -@Dias, GETDATE())

ORDER BY FechaBorrado DESC
```

---

#### 🔍 CONSULTA 6: Estadísticas de solicitudes

```sql
-- Dashboard de estadísticas generales
SELECT
    -- Total de solicitudes
    (SELECT COUNT(*) FROM Solicitud WHERE FechaBorrado IS NULL) AS TotalSolicitudes,

    -- Solicitudes pendientes
    (SELECT COUNT(*) FROM Solicitud WHERE EstadoId = 1 AND FechaBorrado IS NULL) AS Pendientes,

    -- Solicitudes en proceso
    (SELECT COUNT(*) FROM Solicitud WHERE EstadoId = 2 AND FechaBorrado IS NULL) AS EnProceso,

    -- Solicitudes registradas
    (SELECT COUNT(*) FROM Solicitud WHERE EstadoId = 3 AND FechaBorrado IS NULL) AS Registradas,

    -- Solicitudes con error
    (SELECT COUNT(*) FROM Solicitud WHERE EstadoId = 4 AND FechaBorrado IS NULL) AS ConError,

    -- Solicitudes canceladas
    (SELECT COUNT(*) FROM Solicitud WHERE EstadoId = 5 AND FechaBorrado IS NULL) AS Canceladas,

    -- Solicitudes del mes actual
    (SELECT COUNT(*) FROM Solicitud
     WHERE FechaCreacion >= DATEADD(MONTH, DATEDIFF(MONTH, 0, GETDATE()), 0)
       AND FechaBorrado IS NULL) AS SolicitudesMesActual,

    -- Total de vehículos gestionados
    (SELECT COUNT(*) FROM SolicitudDetalle WHERE FechaBorrado IS NULL) AS TotalVehiculos
```

---

#### 🔍 CONSULTA 7: Verificar integridad de datos

```sql
-- Detectar posibles inconsistencias

-- 1. Solicitudes sin detalles
SELECT s.Id, s.CodSolicitud, s.FechaCreacion
FROM Solicitud s
LEFT JOIN SolicitudDetalle sd ON s.Id = sd.SolicitudId AND sd.FechaBorrado IS NULL
WHERE sd.Id IS NULL AND s.FechaBorrado IS NULL
ORDER BY s.FechaCreacion DESC

-- 2. Detalles sin concesionario origen ni dirección libre
SELECT sd.Id, sd.SolicitudId, sd.NumeroBastidor
FROM SolicitudDetalle sd
WHERE sd.ConcesionarioIdOrigen IS NULL
  AND sd.IdDireccionLibre IS NULL
  AND sd.FechaBorrado IS NULL

-- 3. Usuarios sin roles
SELECT u.Id, u.Nombre, u.Email
FROM Usuario u
LEFT JOIN UsuarioRol ur ON u.Id = ur.UsuarioId
WHERE ur.RolId IS NULL
  AND u.FechaBorrado IS NULL
  AND u.Activo = 1

-- 4. Solicitudes con estado inconsistente (Registrada pero sin IdSolicitudTMS/SLC)
SELECT s.Id, s.CodSolicitud, sd.NumeroBastidor
FROM Solicitud s
INNER JOIN SolicitudDetalle sd ON s.Id = sd.SolicitudId
WHERE s.EstadoId = 3 -- Registrada
  AND sd.IdSolicitudSLC IS NULL
  AND sd.IdSolicitudTMS IS NULL
  AND s.FechaBorrado IS NULL
```

---