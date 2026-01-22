# Manual Portal BGB - MODELO DE BASE DE DATOS (Parte 1)

_Capítulo 3 - Secciones 3.1-3.3_

---

# Manual Portal BGB - MODELO DE BASE DE DATOS

_Capítulo 3 del Manual Técnico Portal BGB (MoveIT)_

---

## 3. MODELO DE BASE DE DATOS

---

### 3.1 Visión General

La base de datos **BMW_MoveIT** es el núcleo del sistema. Contiene:

- **59 tablas principales** (entidades de dominio)
- **36+ stored procedures** para operaciones complejas
- **Relaciones Many-to-Many** mediante tablas junction
- **Auditoría** mediante soft-delete (borrado lógico)
- **Integridad referencial** mediante foreign keys

**Patrón de acceso a datos:**
- Se utiliza **Dapper** como micro-ORM
- Todas las operaciones pasan por **Stored Procedures**
- No hay migraciones de Entity Framework (schema manual)

### 3.2 Tablas Principales por Módulo

#### 📊 MÓDULO: USUARIOS Y SEGURIDAD

**Tabla: Usuario**
```sql
CREATE TABLE Usuario (
    Id INT PRIMARY KEY IDENTITY(1,1),
    Nombre NVARCHAR(200),
    Email NVARCHAR(200) UNIQUE NOT NULL,
    Password NVARCHAR(MAX), -- Encriptada
    Activo BIT DEFAULT 1,
    PrimerInicio BIT DEFAULT 1,
    Token NVARCHAR(MAX), -- Para reset de contraseña
    FechaCaducidadPassword DATETIME,
    FechaUltimoLogin DATETIME,
    IdGruposUsuarios INT, -- FK a GruposUsuarios

    -- Campos específicos de usuario
    AllConcesionarios BIT DEFAULT 0,
    AllMarcas BIT DEFAULT 0,
    AllTipoServicios BIT DEFAULT 0,
    Grupo NVARCHAR(100),
    SubGrupo NVARCHAR(100),
    Id3 NVARCHAR(50),
    BrokerId NVARCHAR(50),
    Transportista NVARCHAR(200),
    DireccionLibre BIT DEFAULT 0,

    -- Auditoría
    FechaBorrado DATETIME NULL,
    UsuarioIdBorrado INT NULL
)
```

**Propósito:** Almacena todos los usuarios del sistema con sus credenciales y configuraciones.

**Relaciones:**
- `IdGruposUsuarios` → `GruposUsuarios.Id` (M:1)
- Usuario tiene múltiples relaciones M:M con otras tablas

---

**Tabla: Rol**
```sql
CREATE TABLE Rol (
    Id INT PRIMARY KEY IDENTITY(1,1),
    Nombre NVARCHAR(100) NOT NULL,
    Orden INT
)
```

**Propósito:** Define los roles del sistema (Admin, Usuario, Transportista, etc.)

**Roles comunes:**
- `ADMIN_VER`, `ADMIN_EDIT` - Administradores
- `USU_VER`, `USU_EDIT` - Gestión de usuarios
- `SOTRA_VER`, `SOTRA_EDIT` - Solicitudes de transporte
- `TRASIEG_VER`, `TRASIEG_EDIT` - Trasiegos
- `ROLPER_VER`, `ROLPER_EDIT` - Gestión de roles y permisos

---

**Tabla: Permiso**
```sql
CREATE TABLE Permiso (
    Id INT PRIMARY KEY IDENTITY(1,1),
    Nombre NVARCHAR(100) NOT NULL,
    Abreviatura NVARCHAR(10)
)
```

**Propósito:** Define permisos granulares (Ver, Editar, Usuario)

**Permisos estándar:**
- `Ver` (Id: 1) - Permiso de lectura
- `Editar` (Id: 2) - Permiso de escritura
- `Usuario` (Id: 3) - Permiso de gestión de usuarios

---

**Tabla: Proceso**
```sql
CREATE TABLE Proceso (
    Id INT PRIMARY KEY IDENTITY(1,1),
    Nombre NVARCHAR(200) NOT NULL,
    Abreviatura NVARCHAR(50),
    Ruta NVARCHAR(500), -- Ruta del controlador
    Padre INT NULL -- FK autorreferencial para jerarquía
)
```

**Propósito:** Define los procesos/módulos del sistema (estructura jerárquica)

**Ejemplos de procesos:**
- Solicitudes de Transporte
- Vehículos
- Gestión de Usuarios
- Roles y Permisos

---

**Tabla: RolProcesoPermiso (Relación Ternaria)**
```sql
CREATE TABLE RolProcesoPermiso (
    RolId INT NOT NULL,
    ProcesoId INT NOT NULL,
    PermisoId INT NOT NULL,
    PRIMARY KEY (RolId, ProcesoId, PermisoId),
    FOREIGN KEY (RolId) REFERENCES Rol(Id),
    FOREIGN KEY (ProcesoId) REFERENCES Proceso(Id),
    FOREIGN KEY (PermisoId) REFERENCES Permiso(Id)
)
```

**Propósito:** Matriz de permisos que vincula Roles → Procesos → Permisos

**Ejemplo:**
```
RolId=1 (Admin) + ProcesoId=5 (Usuarios) + PermisoId=2 (Editar)
= El rol Admin puede editar usuarios
```

---

**Tabla: GruposUsuarios**
```sql
CREATE TABLE GruposUsuarios (
    Id INT PRIMARY KEY IDENTITY(1,1),
    Nombre NVARCHAR(200) NOT NULL,
    Activo BIT DEFAULT 1,

    -- Auditoría
    FechaBorrado DATETIME NULL,
    UsuarioIdBorrado INT NULL
)
```

**Propósito:** Agrupa usuarios con configuraciones comunes (concesionarios, cuentas de facturación, códigos HST)

---

**Tablas Junction (Many-to-Many) para Usuario:**

```sql
-- Usuario ↔ Rol
CREATE TABLE UsuarioRol (
    UsuarioId INT NOT NULL,
    RolId INT NOT NULL,
    PRIMARY KEY (UsuarioId, RolId)
)

-- Usuario ↔ Proceso
CREATE TABLE UsuarioProceso (
    UsuarioId INT NOT NULL,
    ProcesoId INT NOT NULL,
    PRIMARY KEY (UsuarioId, ProcesoId)
)

-- Usuario ↔ Concesionario
CREATE TABLE UsuarioConcesionario (
    UsuarioId INT NOT NULL,
    ConcesionarioId INT NOT NULL,
    PRIMARY KEY (UsuarioId, ConcesionarioId)
)

-- Usuario ↔ Marca
CREATE TABLE UsuarioMarca (
    UsuarioId INT NOT NULL,
    MarcaId INT NOT NULL,
    PRIMARY KEY (UsuarioId, MarcaId)
)

-- Usuario ↔ TipoServicio
CREATE TABLE UsuarioTipoServicio (
    UsuarioId INT NOT NULL,
    TipoServicioId INT NOT NULL,
    PRIMARY KEY (UsuarioId, TipoServicioId)
)

-- Usuario ↔ ClienteTMS
CREATE TABLE UsuarioTMS (
    UsuarioId INT NOT NULL,
    TMSId NVARCHAR(50) NOT NULL,
    PRIMARY KEY (UsuarioId, TMSId)
)

-- Usuario ↔ ClienteSLC
CREATE TABLE UsuarioSLC (
    UsuarioId INT NOT NULL,
    SLCId NVARCHAR(50) NOT NULL,
    PRIMARY KEY (UsuarioId, SLCId)
)

-- Usuario ↔ CuentasFacturacion
CREATE TABLE UsuarioCuentaFacturacion (
    UsuarioId INT NOT NULL,
    CuentaFacturacionId INT NOT NULL,
    PRIMARY KEY (UsuarioId, CuentaFacturacionId)
)

-- Usuario ↔ CodigoHST
CREATE TABLE UsuarioCodigoHST (
    UsuarioId INT NOT NULL,
    CodigoHST NVARCHAR(50) NOT NULL,
    PRIMARY KEY (UsuarioId, CodigoHST)
)
```

---

#### 📦 MÓDULO: SOLICITUDES

**Tabla: Solicitud (Cabecera de Solicitud)**
```sql
CREATE TABLE Solicitud (
    Id INT PRIMARY KEY IDENTITY(1,1),
    CodSolicitud NVARCHAR(50), -- Código único de solicitud

    -- Tipo y estado
    TipoSolicitudId INT, -- FK a TipoSolicitud (Servicio/Transporte/Mixta)
    EstadoId INT, -- FK a Estado (Pendiente/EnProceso/Registrada/Error/Cancelada)

    -- Fechas
    FechaCreacion DATETIME DEFAULT GETDATE(),
    FechaFinalizacion DATETIME NULL,

    -- Usuario y facturación
    UsuarioCreacion INT, -- FK a Usuario
    CuentasFacturacionId INT NULL, -- FK a CuentasFacturacion
    CuentasFacturacionTMSId INT NULL,

    -- Campos específicos
    CodRac NVARCHAR(100), -- Código RAC (Return Authorization Code)
    CodigoHST NVARCHAR(50), -- Código HST del concesionario
    TipoEnvioTransporte INT, -- Tipo de envío
    Trasiego BIT DEFAULT 0, -- Es trasiego o no

    -- Comentarios y observaciones
    Comentarios NVARCHAR(MAX),

    -- Auditoría
    FechaBorrado DATETIME NULL,
    UsuarioIdBorrado INT NULL,

    FOREIGN KEY (UsuarioCreacion) REFERENCES Usuario(Id),
    FOREIGN KEY (CuentasFacturacionId) REFERENCES CuentasFacturacion(Id)
)
```

**Propósito:** Cabecera de cada solicitud (servicio, transporte o mixta)

**Estados posibles (EstadoSolicitudEnum):**
- `1` - Pendiente
- `2` - En Proceso
- `3` - Registrada
- `4` - Error
- `5` - Cancelada
- `6` - Pendiente Validación
- `7` - Cancelada Validación
- `8` - Pendiente Cancelación

---

**Tabla: SolicitudDetalle (Líneas de Solicitud)**
```sql
CREATE TABLE SolicitudDetalle (
    Id INT PRIMARY KEY IDENTITY(1,1),
    SolicitudId INT NOT NULL, -- FK a Solicitud

    -- Información del servicio
    CodServicio NVARCHAR(50),

    -- Información del vehículo
    NumeroBastidor NVARCHAR(17), -- VIN
    MarcaModelo NVARCHAR(200),
    Matricula NVARCHAR(20),

    -- Origen y destino
    ConcesionarioIdOrigen INT NULL, -- FK a Concesionario
    ConcesionarioIdDestino INT NULL, -- FK a Concesionario
    IdDireccionLibre INT NULL, -- FK a DireccionLibre (si no es concesionario)

    -- Estado
    EstadoId INT, -- FK a Estado

    -- Integración con sistemas externos
    IdSolicitudSLC NVARCHAR(50), -- ID en sistema SLC
    IdSolicitudTMS UNIQUEIDENTIFIER, -- GUID en sistema TMS
    CodServicioTMS UNIQUEIDENTIFIER,
    OrigenTMS NVARCHAR(200),
    DestinoTMS NVARCHAR(200),
    ModeloTMS NVARCHAR(200),
    ServicioSLC NVARCHAR(100),

    -- Códigos de cliente y transportista (para cancelación)
    CodClienteSLC NVARCHAR(50),
    CodClienteTMS NVARCHAR(50),
    CodTransportista NVARCHAR(50),

    -- Auditoría
    FechaCreacion DATETIME DEFAULT GETDATE(),
    UsuarioCreacion INT,
    FechaBorrado DATETIME NULL,

    FOREIGN KEY (SolicitudId) REFERENCES Solicitud(Id),
    FOREIGN KEY (ConcesionarioIdOrigen) REFERENCES Concesionario(ConcesionarioId),
    FOREIGN KEY (ConcesionarioIdDestino) REFERENCES Concesionario(ConcesionarioId),
    FOREIGN KEY (IdDireccionLibre) REFERENCES DireccionLibre(Id)
)
```

**Propósito:** Cada línea representa un vehículo en una solicitud

---

**Tabla: SolicitudDocumento**
```sql
CREATE TABLE SolicitudDocumento (
    Id INT PRIMARY KEY IDENTITY(1,1),
    SolicitudId INT NOT NULL, -- FK a Solicitud
    NombreFichero NVARCHAR(500),
    Ruta NVARCHAR(MAX), -- Ruta física del archivo
    FechaSubida DATETIME DEFAULT GETDATE(),
    UsuarioIdSubido INT, -- FK a Usuario

    -- Auditoría
    FechaBorrado DATETIME NULL,
    UsuarioIdBorrado INT NULL,

    FOREIGN KEY (SolicitudId) REFERENCES Solicitud(Id),
    FOREIGN KEY (UsuarioIdSubido) REFERENCES Usuario(Id)
)
```

**Propósito:** Documentos adjuntos a solicitudes (albaranes, autorizaciones, etc.)

**Ruta de almacenamiento:**
- Servicio: `Documentos/Servicio/`
- Transporte: `Documentos/Transporte/`
- Mixta: `Documentos/Mixta/`

---

**Tabla: SolicitudesHistoricoEstados**
```sql
CREATE TABLE SolicitudesHistoricoEstados (
    Id INT PRIMARY KEY IDENTITY(1,1),
    SolicitudId INT NOT NULL,
    EstadoAnterior INT,
    EstadoNuevo INT,
    Fecha DATETIME DEFAULT GETDATE(),
    Usuario INT, -- FK a Usuario

    FOREIGN KEY (SolicitudId) REFERENCES Solicitud(Id),
    FOREIGN KEY (Usuario) REFERENCES Usuario(Id)
)
```

**Propósito:** Auditoría de cambios de estado de solicitudes

---

**Tabla: SolicitudesDatosTemp**
```sql
CREATE TABLE SolicitudesDatosTemp (
    Id INT PRIMARY KEY IDENTITY(1,1),
    IdAgrupacion UNIQUEIDENTIFIER, -- GUID para agrupar solicitudes masivas
    NumeroBastidor NVARCHAR(17),
    Marca NVARCHAR(100),
    Modelo NVARCHAR(100),
    Origen NVARCHAR(200),
    Destino NVARCHAR(200)
    -- Otros campos temporales
)
```

**Propósito:** Almacenamiento temporal cuando se procesan solicitudes masivas (>50 vehículos)

**Flujo:**
1. Usuario selecciona >50 vehículos
2. Se guardan en SolicitudesDatosTemp con un GUID único
3. Se procesan en bloques de 50
4. Se borran después de crear las solicitudes

---

#### 🚗 MÓDULO: CONCESIONARIOS

**Tabla: Concesionario**
```sql
CREATE TABLE Concesionario (
    ConcesionarioId INT PRIMARY KEY IDENTITY(1,1),
    Nombre NVARCHAR(200) NOT NULL,
    Activo BIT DEFAULT 1,

    -- Códigos identificadores
    Buno NVARCHAR(50), -- Código BUNO (identificador BMW)
    Tipo NVARCHAR(50),
    Code NVARCHAR(50),
    Canal NVARCHAR(50),
    Campa NVARCHAR(100),

    -- Dirección
    DireccionCompleta NVARCHAR(MAX),

    -- Integración con sistemas externos
    IdDireccionTMS NVARCHAR(50), -- ID en TMS
    IdDireccionSLC NVARCHAR(50), -- ID en SLC
    CuentaFacturacion NVARCHAR(50),

    -- Auditoría
    FechaBorrado DATETIME NULL,
    UsuarioIdBorrado INT NULL
)
```

**Propósito:** Almacena todos los concesionarios/distribuidores BMW

---

**Tabla: DireccionLibre**
```sql
CREATE TABLE DireccionLibre (
    Id INT PRIMARY KEY IDENTITY(1,1),
    Direccion NVARCHAR(500),
    Provincia NVARCHAR(100),
    CP NVARCHAR(10),
    Contacto NVARCHAR(200),
    Telefono NVARCHAR(20)
)
```

**Propósito:** Direcciones que NO son concesionarios (talleres externos, particulares, etc.)

---

#### 🔧 MÓDULO: SERVICIOS Y TIPOS

**Tabla: TipoServicio**
```sql
CREATE TABLE TipoServicio (
    Id INT PRIMARY KEY IDENTITY(1,1),
    Nombre NVARCHAR(200) NOT NULL,
    CodigoServicio NVARCHAR(50),
    Anexo NVARCHAR(500), -- Ruta de documento anexo
    Archivo NVARCHAR(500), -- Nombre del archivo
    IdServicioGrupo INT, -- FK a TipoServicioGrupo

    -- Integración SLC
    IdServicioSLC NVARCHAR(50),

    -- Auditoría
    FechaBorrado DATETIME NULL,
    UsuarioIdBorrado INT NULL,

    FOREIGN KEY (IdServicioGrupo) REFERENCES TipoServicioGrupo(Id)
)
```

**Propósito:** Catálogo de servicios disponibles (reparación, pintura, PDI, etc.)

**Ejemplos de servicios:**
- PDI (Pre-Delivery Inspection)
- Reparación de carrocería
- Pintura
- Revisión mecánica
- Preparación para entrega

---

**Tabla: TipoMotorizacion**
```sql
CREATE TABLE TipoMotorizacion (
    Id INT PRIMARY KEY IDENTITY(1,1),
    Code NVARCHAR(50) NOT NULL,
    Descripcion NVARCHAR(200),
    Traduccion NVARCHAR(200),
    IsDeleted BIT DEFAULT 0,

    -- Auditoría
    FechaBorrado DATETIME NULL,
    UsuarioIdBorrado INT NULL
)
```

**Propósito:** Catálogo de tipos de motorización (Gasolina, Diésel, Híbrido, Eléctrico, etc.)

**Nota:** Esta es una tabla nueva añadida en la rama `Motorizacion` actual.

---

#### 💰 MÓDULO: FACTURACIÓN

**Tabla: CuentasFacturacion**
```sql
CREATE TABLE CuentasFacturacion (
    Id INT PRIMARY KEY IDENTITY(1,1),
    Nombre NVARCHAR(200) NOT NULL,
    Codigo NVARCHAR(50),
    Activo BIT DEFAULT 1,
    Tipo NVARCHAR(50), -- TMS, SLC, Ambos
    CuentaSecundaria NVARCHAR(200),

    -- Auditoría
    FechaBorrado DATETIME NULL,
    UsuarioIdBorrado INT NULL
)
```

**Propósito:** Cuentas de facturación para imputar costes de servicios y transportes

---

#### 🚚 MÓDULO: TRANSPORTES Y TRASIEGOS

**Tabla: Cesion (Cambios de Propietario)**
```sql
CREATE TABLE Cesion (
    Id INT PRIMARY KEY IDENTITY(1,1),
    Bastidor NVARCHAR(17),
    CodDealer NVARCHAR(50),
    Solicitante NVARCHAR(200),
    Fecha DATETIME DEFAULT GETDATE(),
    Estado NVARCHAR(50),
    Campa NVARCHAR(100),

    -- Origen y destino
    IdOrigen INT, -- FK a Concesionario
    IdDestino INT, -- FK a Concesionario

    -- Auditoría
    IdUsuario INT, -- FK a Usuario
    IdEstado INT,
    IdSolicitud INT NULL, -- FK a Solicitud (si genera solicitud)

    FOREIGN KEY (IdOrigen) REFERENCES Concesionario(ConcesionarioId),
    FOREIGN KEY (IdDestino) REFERENCES Concesionario(ConcesionarioId),
    FOREIGN KEY (IdUsuario) REFERENCES Usuario(Id),
    FOREIGN KEY (IdSolicitud) REFERENCES Solicitud(Id)
)
```

**Propósito:** Gestiona cambios de propietario de vehículos (cesiones entre concesionarios)

---

#### 🏷️ MÓDULO: CÓDIGOS Y CATÁLOGOS

**Tabla: CodigoHST**
```sql
CREATE TABLE CodigoHST (
    Id INT PRIMARY KEY IDENTITY(1,1),
    Nombre NVARCHAR(200),
    Codigo NVARCHAR(50) NOT NULL,
    Cesion BIT DEFAULT 0,
    Zona NVARCHAR(100),
    Canal NVARCHAR(100),
    BloquearServicios BIT DEFAULT 0,
    KOVP2 BIT DEFAULT 0, -- Requiere validación especial para transportes
    DobleTitularidad BIT DEFAULT 0,
    idDireccionTMS NVARCHAR(50),

    -- Auditoría
    FechaBorrado DATETIME NULL,
    UsuarioIdBorrado INT NULL
)
```

**Propósito:** Códigos HST (identificadores de concesionarios/gestionarios)

**Campo crítico:** `KOVP2` - Si es `1`, los vehículos de este código requieren validación adicional para transportes

---

### 3.3 Diagrama de Relaciones Completo (ERD)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         MÓDULO DE SEGURIDAD                             │
└─────────────────────────────────────────────────────────────────────────┘

    ┌──────────────────┐
    │  GruposUsuarios  │
    │  ──────────────  │
    │  Id (PK)         │
    │  Nombre          │
    └────────┬─────────┘
             │
             │ 1:M
             ↓
    ┌──────────────────────────────────────┐
    │          Usuario                     │
    │  ──────────────────────────────────  │
    │  Id (PK)                             │
    │  Email (UNIQUE)                      │
    │  Password                            │
    │  IdGruposUsuarios (FK) ──────────────┘
    │  AllConcesionarios (BIT)
    │  AllMarcas (BIT)
    │  AllTipoServicios (BIT)
    │  Activo (BIT)
    └───┬───────────────────────────────────┘
        │
        │ M:M (via junction tables)
        │
        ├──────────────┬──────────────┬──────────────┬──────────────┐
        │              │              │              │              │
        ↓              ↓              ↓              ↓              ↓
┌──────────────┐ ┌─────────────┐ ┌──────────────┐ ┌─────────────┐ ┌──────────────┐
│UsuarioRol    │ │UsuarioConces│ │UsuarioMarca  │ │UsuarioTMS   │ │UsuarioSLC    │
│──────────────│ │─────────────│ │──────────────│ │─────────────│ │──────────────│
│UsuarioId(FK) │ │UsuarioId(FK)│ │UsuarioId(FK) │ │UsuarioId(FK)│ │UsuarioId(FK) │
│RolId(FK)     │ │ConcesId(FK) │ │MarcaId(FK)   │ │TMSId(FK)    │ │SLCId(FK)     │
└──┬───────────┘ └──┬──────────┘ └──┬───────────┘ └─────────────┘ └──────────────┘
   │                │                │
   │ M:1            │ M:1            │ M:1
   ↓                ↓                ↓
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│    Rol       │ │Concesionario │ │    Marca     │
│──────────────│ │──────────────│ │──────────────│
│Id (PK)       │ │ConcesId (PK) │ │Id (PK)       │
│Nombre        │ │Nombre        │ │Nombre        │
└──┬───────────┘ │Buno          │ └──────────────┘
   │             │IdDirTMS      │
   │             │IdDirSLC      │
   │             └──┬───────────┘
   │                │
   │ M:M (ternaria) │ M:1 (Origen)
   ↓                │ M:1 (Destino)
┌────────────────────┐            │
│RolProcesoPermiso   │            │
│────────────────────│            │
│RolId (PK, FK)      │            │
│ProcesoId (PK, FK)  │            │
│PermisoId (PK, FK)  │            │
└──┬─────────┬───────┘            │
   │         │                    │
   │ M:1     │ M:1                │
   ↓         ↓                    │
┌─────────┐ ┌─────────┐          │
│Proceso  │ │Permiso  │          │
│─────────│ │─────────│          │
│Id (PK)  │ │Id (PK)  │          │
│Nombre   │ │Nombre   │          │
│Padre(FK)│ │Abrev    │          │
└─────────┘ └─────────┘          │
                                 │
┌────────────────────────────────┴─────────────────────────────────────┐
│                      MÓDULO DE SOLICITUDES                           │
└──────────────────────────────────────────────────────────────────────┘
                                 │
                                 ↓
                    ┌─────────────────────────────┐
                    │   SolicitudDetalle          │
                    │  ─────────────────────────  │
                    │  Id (PK)                    │
                    │  SolicitudId (FK) ───┐      │
                    │  NumeroBastidor      │      │
                    │  ConcesIdOrigen (FK) ┼──────┘
                    │  ConcesIdDestino (FK)│
                    │  IdDireccionLibre(FK)│
                    │  EstadoId (FK)       │
                    │  IdSolicitudSLC      │
                    │  IdSolicitudTMS      │
                    └──────────┬───────────┘
                               │
                               │ M:1
                               ↓
                    ┌─────────────────────────────┐
                    │        Solicitud            │
                    │  ─────────────────────────  │
                    │  Id (PK)                    │
                    │  CodSolicitud (UNIQUE)      │
                    │  TipoSolicitudId (FK)       │
                    │  EstadoId (FK)              │
                    │  UsuarioCreacion (FK) ──────┼──► Usuario
                    │  CuentasFacturacionId (FK)  │
                    │  CodRac                     │
                    │  CodigoHST                  │
                    │  Trasiego (BIT)             │
                    │  FechaCreacion              │
                    │  FechaFinalizacion          │
                    └──┬─────────────────┬────────┘
                       │                 │
                       │ 1:M             │ 1:M
                       ↓                 ↓
            ┌───────────────────┐  ┌─────────────────────────┐
            │SolicitudDocumento │  │SolicitudesHistoricoEst. │
            │───────────────────│  │─────────────────────────│
            │Id (PK)            │  │Id (PK)                  │
            │SolicitudId (FK)   │  │SolicitudId (FK)         │
            │NombreFichero      │  │EstadoAnterior           │
            │Ruta               │  │EstadoNuevo              │
            │UsuarioIdSubido(FK)│  │Fecha                    │
            └───────────────────┘  │Usuario (FK)             │
                                   └─────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                 MÓDULO DE FACTURACIÓN Y SERVICIOS                    │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐          ┌──────────────────────┐
│  CuentasFacturacion  │          │    TipoServicio      │
│  ──────────────────  │          │  ──────────────────  │
│  Id (PK)             │          │  Id (PK)             │
│  Nombre              │          │  Nombre              │
│  Codigo              │          │  CodigoServicio      │
│  Tipo (TMS/SLC/Amb.) │          │  IdServicioGrupo(FK) │
│  CuentaSecundaria    │          │  IdServicioSLC       │
│  Activo (BIT)        │          └──────────────────────┘
└──┬───────────────────┘                    │
   │                                        │ M:1
   │ M:M (via UsuarioCuentaFacturacion)    ↓
   │                              ┌──────────────────────┐
   │                              │ TipoServicioGrupo    │
   │                              │ ──────────────────── │
   └──────────────────────────────│  Id (PK)             │
                                  │  Nombre              │
                                  └──────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                   MÓDULO DE CÓDIGOS Y CATÁLOGOS                      │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   CodigoHST      │     │  TipoMotorizacion│     │   Transportista  │
│  ──────────────  │     │  ──────────────  │     │  ──────────────  │
│  Id (PK)         │     │  Id (PK)         │     │  Id (PK)         │
│  Nombre          │     │  Code            │     │  Nombre          │
│  Codigo          │     │  Descripcion     │     │  CodTransportista│
│  KOVP2 (BIT) ⚠️  │     │  Traduccion      │     └──────────────────┘
│  Cesion (BIT)    │     │  IsDeleted (BIT) │
│  BloquearServ.   │     └──────────────────┘
│  DobleTitularidad│
└──────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                MÓDULO DE CAMBIOS Y TRASIEGOS                         │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────┐     ┌──────────────────────────────┐
│        Cesion                │     │      SubAsignacion           │
│  ──────────────────────────  │     │  ──────────────────────────  │
│  Id (PK)                     │     │  Id (PK)                     │
│  Bastidor                    │     │  NumeroBastidor              │
│  CodDealer                   │     │  CodigoHST                   │
│  IdOrigen (FK) ──────────────┼──►  │  UsuarioId (FK)              │
│  IdDestino (FK) ─────────────┼──►  │  EstadoId                    │
│  IdUsuario (FK)              │     │  Fecha                       │
│  IdSolicitud (FK)            │     │  IdSolicitud (FK)            │
│  Fecha                       │     └──────────────────────────────┘
│  Estado                      │
│  Campa                       │
└──────────────────────────────┘
          │
          └──► Concesionario (Origen y Destino)
```

**Leyenda:**
- `(PK)` = Primary Key
- `(FK)` = Foreign Key
- `1:M` = Relación uno a muchos
- `M:M` = Relación muchos a muchos
- `⚠️` = Campo crítico para la lógica de negocio

---