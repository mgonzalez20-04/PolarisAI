# MANUAL TÉCNICO - PORTAL BGB (MoveIT)
## Manual para Agente de IA - Soporte Técnico

**Versión:** 1.0
**Fecha:** 16 de enero de 2026
**Proyecto:** BER - CEVA - PortalBGB (MoveIT)
**Rama actual:** Motorizacion

---

## TABLA DE CONTENIDOS

1. [Introducción y Propósito](#1-introducción-y-propósito)
2. [Arquitectura General del Sistema](#2-arquitectura-general-del-sistema)
3. [Modelo de Base de Datos](#3-modelo-de-base-de-datos)
4. [Módulos Funcionales](#4-módulos-funcionales)
5. [Flujos de Negocio Críticos](#5-flujos-de-negocio-críticos)
6. [Integraciones Externas](#6-integraciones-externas)
7. [Resolución de Problemas Comunes](#7-resolución-de-problemas-comunes)
8. [Consultas SQL Útiles](#8-consultas-sql-útiles)
9. [Glosario de Términos](#9-glosario-de-términos)

---

## 1. INTRODUCCIÓN Y PROPÓSITO

### 1.1 ¿Qué es el Portal BGB?

El **Portal BGB (BMW Gateway Barcelona)** es una aplicación web empresarial que gestiona la logística y transporte de vehículos BMW para el grupo BER-CEVA. El portal actúa como hub centralizado para:

- **Solicitudes de transporte** de vehículos entre concesionarios
- **Solicitudes de servicios** (reparaciones, mantenimiento, preparación)
- **Gestión de trasiegos** (cambios de ruta durante transporte)
- **Cesiones de vehículos** (cambios de propietario/concesionario)
- **Seguimiento en tiempo real** del estado de vehículos
- **Integración** con sistemas TMS (Transport Management System) y SLC (Supplier Logistic Client)

### 1.2 Usuarios del Sistema

| Tipo de Usuario | Rol | Permisos Principales |
|-----------------|-----|---------------------|
| **Administrador** | Gestión completa del sistema | Crear usuarios, asignar permisos, configurar sistema |
| **Usuario Red (Concesionario)** | Solicitar servicios y transportes | Ver vehículos de su red, crear solicitudes |
| **Usuario Transportista** | Ver transportes asignados | Consultar estado de transportes, confirmar entregas |
| **Usuario Gestión** | Supervisar operaciones | Ver todas las solicitudes, generar reportes |
| **Soporte Técnico** | Resolver incidencias | Acceso lectura a BD, consultar logs, analizar errores |

### 1.3 Propósito de Este Manual

Este manual está diseñado específicamente para un **agente de IA con acceso de solo lectura a la base de datos** que ayudará en la resolución de tickets de soporte. El agente podrá:

✅ Consultar la base de datos para obtener información sobre solicitudes, usuarios, vehículos, etc.
✅ Entender los flujos de negocio para diagnosticar problemas
✅ Proporcionar consultas SQL útiles para investigar incidencias
✅ Identificar patrones de errores comunes
✅ Sugerir soluciones basadas en el conocimiento del sistema

❌ NO podrá modificar datos en la base de datos
❌ NO podrá ejecutar operaciones de escritura (INSERT, UPDATE, DELETE)

---

## 2. ARQUITECTURA GENERAL DEL SISTEMA

### 2.1 Stack Tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| **Framework** | ASP.NET Core | 8.0 |
| **Lenguaje** | C# | 12.0 |
| **Base de Datos** | SQL Server | (Azure SQL) |
| **ORM** | Dapper | - |
| **Frontend** | Razor Pages + React | - |
| **UI Framework** | Bootstrap | 4.x |
| **Componentes UI** | Telerik Kendo UI | 2021.1.330 |
| **Autenticación** | Cookie Authentication | ASP.NET Core Identity |
| **Cloud** | Azure (Service Bus, Functions) | - |

### 2.2 Arquitectura en Capas

El sistema sigue una arquitectura **multicapa (N-Tier)** con separación clara de responsabilidades:

```
┌─────────────────────────────────────────────────────────────┐
│                    1. CAPA DE PRESENTACIÓN                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Acerca-Portal-BMW (MVC)                             │  │
│  │  - 31 Controladores                                  │  │
│  │  - 162 Vistas Razor                                  │  │
│  │  - ViewModels (VMO)                                  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                 2. CAPA DE SERVICIOS (API)                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Acerca-Portal-BMW.DistributedServices.API           │  │
│  │  - Endpoints REST                                    │  │
│  │  - Swagger/OpenAPI                                   │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                 3. CAPA DE LÓGICA DE NEGOCIO                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Acerca-Portal-BMW.Services                          │  │
│  │  - 50+ Servicios                                     │  │
│  │  - Validaciones de negocio                           │  │
│  │  - Orquestación de procesos                          │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│               4. CAPA DE ACCESO A DATOS                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Acerca-Portal-BMW.Infrastructure.Data.Repositories  │  │
│  │  - 31 Repositorios                                   │  │
│  │  - Dapper (Micro-ORM)                                │  │
│  │  - Stored Procedures                                 │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                    5. CAPA DE DOMINIO                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Acerca-Portal-BMW.Domain                            │  │
│  │  - 59 Entidades                                      │  │
│  │  - Enumeradores                                      │  │
│  │  - Modelos de dominio                                │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                    6. BASE DE DATOS                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  SQL Server (BMW_MoveIT)                             │  │
│  │  - Tablas principales                                │  │
│  │  - Stored Procedures (36+)                           │  │
│  │  - Vistas                                            │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 Sistemas Externos e Integraciones

```
┌──────────────────────────────────────────────────────────────┐
│                    PORTAL BGB (Core)                         │
└──────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ↓                   ↓                   ↓
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│   MoveIT     │   │     TMS      │   │     SLC      │
│   Gateway    │   │  (Transport) │   │ (Logistics)  │
└──────────────┘   └──────────────┘   └──────────────┘
        ↓                   ↓                   ↓
    SOAP/REST      Azure Service Bus      SOAP API
```

**Service Agents (8 agentes de integración):**

1. **APIMoveIT** - Integración con plataforma MoveIT (SOAP/REST)
2. **APITMS** - Integración con sistema TMS (Azure Service Bus)
3. **APISLC** - Integración con sistema SLC (SOAP)
4. **Email** - Servicio de envío de correos electrónicos
5. **Excel** - Procesamiento y generación de archivos Excel
6. **FileSystem** - Operaciones de archivos y documentos
7. **Encrypt** - Servicios de encriptación
8. **Utils** - Utilidades (logging, parámetros de configuración)

### 2.4 Cadenas de Conexión Principales

```json
{
  "ConnectionStrings": {
    "BMW_MoveIT": "Server=desasql.server.iodigital.es;Database=BMW_MoveIT;...",
    "TMS_0": "Server=52.136.239.15;Database=ANDSYS_BGA;...",
    "TMS_1": "Server=52.136.239.15;Database=AND2SAVE2022_BGA;...",
    "TMS_2": "Server=52.136.239.15;Database=AND2SAVE2023_BGA;..."
  }
}
```

**Base de datos principal:** `BMW_MoveIT` (SQL Server en Azure)

---

## 2.5 Flujo General de una Petición

```
Usuario (Navegador)
    ↓
    ├─ 1. HTTP Request (GET/POST)
    ↓
Controller (AccountController, SolicitudesController, etc.)
    ↓
    ├─ 2. Validación de autenticación ([Authorize])
    ├─ 3. Extracción de usuario actual (GetCurrentUser())
    ├─ 4. Validación de permisos (HasProcesoPermiso())
    ↓
Service (SolicitudesService, VehiculosService, etc.)
    ↓
    ├─ 5. Lógica de negocio
    ├─ 6. Validaciones adicionales
    ├─ 7. Llamada a uno o más Repositorios
    ↓
Repository (SolicitudesRepository, UsuariosRepository, etc.)
    ↓
    ├─ 8. Construcción de query Dapper
    ├─ 9. Llamada a Stored Procedure
    ↓
Base de Datos (SQL Server)
    ↓
    ├─ 10. Ejecución de SP
    ├─ 11. Retorno de resultados
    ↓
Repository → Service → Controller
    ↓
    ├─ 12. Mapeo a ViewModel (VMO)
    ├─ 13. Retorno de View o JSON
    ↓
Usuario (Navegador)
    └─ 14. Renderizado de HTML o procesamiento de JSON
```

---

## 3. MODELO DE BASE DE DATOS

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

## 4. MÓDULOS FUNCIONALES

### 4.1 Visión General de Módulos

El Portal BGB está organizado en **13 módulos funcionales principales**:

| # | Módulo | Controlador | Propósito Principal |
|---|--------|-------------|---------------------|
| 1 | **Dashboard (Home)** | HomeController | Panel principal con accesos directos y contadores |
| 2 | **Vehículos** | VehiculosController | Búsqueda y gestión de vehículos (Stock, En Ruta, Entregados) |
| 3 | **Solicitudes** | SolicitudesController | Gestión de todas las solicitudes (Servicios, Transportes, Mixtas) |
| 4 | **Transportes** | TransportesController | Crear solicitudes de transporte de vehículos |
| 5 | **Servicios** | ServiciosController | Crear solicitudes de servicios (PDI, reparación, etc.) |
| 6 | **Trasiegos** | TrasiegosController | Gestión de cambios de ruta durante transportes |
| 7 | **Cesiones** | VehiculosController | Cambios de propietario entre concesionarios |
| 8 | **Usuarios** | UsuariosController | Gestión CRUD de usuarios del sistema |
| 9 | **Roles y Permisos** | RolesController | Configuración de roles y permisos |
| 10 | **Concesionarios** | ConcesionariosController | Gestión de red de concesionarios |
| 11 | **Tipos de Servicios** | TipoServiciosController | Catálogo de servicios disponibles |
| 12 | **Códigos HST** | CodigoHSTController | Gestión de códigos de concesionarios |
| 13 | **Configuración** | ConfiguracionPersonalController | Ajustes personales del usuario |

---

### 4.2 MÓDULO 1: Dashboard (Home)

**Controlador:** `HomeController`
**Vista principal:** `Home/Index.cshtml`
**Permisos necesarios:** Usuario autenticado (cualquier rol)

#### Funcionalidad

El dashboard es la página de inicio después del login. Muestra:

1. **Accesos Directos Personalizados**
   - Búsquedas guardadas por el usuario
   - Acceso rápido a filtros frecuentes
   - CRUD de accesos directos

2. **Dos pestañas principales:**

**Pestaña 1: Vista Accesos**
- **Stock**: Vehículos en stock (en concesionarios)
- **En Ruta**: Vehículos siendo transportados
- **Entregados**: Vehículos entregados recientemente
- **Pendientes de Transporte**: Vehículos esperando transporte
- **Servicios Pendientes**: Servicios sin completar
- **Trasiegos Pendientes**: Cambios de ruta pendientes de validación
- **Trasiegos Registrados**: Cambios de ruta ya procesados
- **Cesiones Pendientes**: Cambios de propietario pendientes

**Pestaña 2: Vista Datos**
- Contadores de procesos TMS
- Estados de solicitudes
- Estadísticas generales

#### Tablas Involucradas

- `AccesoDirecto` - Accesos directos del usuario
- `Solicitud` y `SolicitudDetalle` - Para contadores
- Consultas a APIs externas (MoveIT, TMS, SLC) para datos en tiempo real

#### Flujo de Usuario

```
1. Usuario hace login → Redirige a Home/Index
2. Se cargan accesos directos personalizados desde BD
3. Se cargan contadores (AJAX asíncrono cada 30 segundos)
4. Usuario puede:
   - Click en un contador → Va a búsqueda filtrada
   - Click en acceso directo → Va a búsqueda guardada
   - Crear nuevo acceso directo → Modal para guardar filtro actual
```

#### Código SQL de Ejemplo

```sql
-- Obtener accesos directos de un usuario
SELECT * FROM AccesoDirecto
WHERE UsuarioId = @UsuarioId
ORDER BY Orden

-- Contador de vehículos en stock
SELECT COUNT(DISTINCT NumeroBastidor)
FROM SolicitudDetalle sd
INNER JOIN Solicitud s ON sd.SolicitudId = s.Id
WHERE s.EstadoId IN (3) -- Registrada
  AND sd.EstadoId = X -- Estado específico de stock
  AND s.FechaBorrado IS NULL
```

---

### 4.3 MÓDULO 2: Vehículos

**Controlador:** `VehiculosController` (2,434 líneas - el más complejo)
**Vistas principales:**
- `Vehiculos/Index.cshtml` - Búsqueda general
- `Vehiculos/Stock.cshtml` - Vehículos en stock
- `Vehiculos/EnRuta.cshtml` - Vehículos en tránsito
- `Vehiculos/Entregados.cshtml` - Vehículos entregados
- `Vehiculos/Show.cshtml` - Detalle de vehículo

**Permisos necesarios:**
- `VEH_VER` - Ver vehículos
- `STOCK_VER` - Ver stock
- `ENRUTA_VER` - Ver en ruta
- `ENTREGADOS_VER` - Ver entregados

#### Funcionalidad

Este es el módulo más utilizado del portal. Permite:

1. **Búsqueda Avanzada de Vehículos**
   - Por VIN/Bastidor (puede ser múltiple separado por comas)
   - Por matrícula
   - Por rango de fechas
   - Por marca y modelo
   - Por estado (Pendiente, En Ruta, Entregado, etc.)
   - Por código HST
   - Por centro logístico (SANTANDER, CIEMPOZUELOS)

2. **Visualización en Grid Kendo**
   - Paginación (20, 50, 100, 500 registros)
   - Ordenamiento por columnas
   - Filtros inline
   - Selección múltiple de vehículos
   - Exportación a Excel

3. **Acciones sobre Vehículos**
   - **Solicitar Servicio**: Abre modal para crear solicitud de servicio
   - **Solicitar Transporte**: Abre modal para crear solicitud de transporte
   - **Ver Detalle**: Muestra información completa del vehículo
   - **Ver Histórico**: Muestra todas las solicitudes del vehículo
   - **Añadir Comentario**: Comentarios personales sobre el vehículo
   - **Crear Acceso Directo**: Guarda la búsqueda actual

4. **Integración con Sistemas Externos**
   - Consulta a **MoveIT** para obtener datos de vehículos en tiempo real
   - Consulta a **SLC** para servicios logísticos
   - Consulta a **TMS** para transportes

#### Tablas Involucradas

- `Solicitud` - Cabecera de solicitudes
- `SolicitudDetalle` - Detalles de vehículos
- `Concesionario` - Orígenes y destinos
- `CodigoHST` - Códigos de concesionarios
- `VehiculosComentarioPersonal` - Comentarios de usuarios
- APIs externas (datos no persistidos)

#### Flujo de Búsqueda

```
1. Usuario accede a Vehículos → Stock/EnRuta/Entregados
2. VehiculosController.Index(tipo)
   ├─ Carga filtros según tipo (Stock, EnRuta, etc.)
   ├─ Si AllConcesionarios = false → Filtra por concesionarios del usuario
   └─ Retorna vista con BuscadorVMO
3. Usuario introduce filtros y hace búsqueda
4. AJAX → VehiculosController.BindingVehiculos_Read()
   ├─ VehiculosService.ListByFilter(filter)
   │  ├─ Consulta BD local (SolicitudDetalle)
   │  ├─ Si necesita datos online:
   │  │  ├─ APIMoveIT.GetVehiculos()
   │  │  ├─ APISLC.GetVehiculos()
   │  │  └─ APITMS.GetVehiculos()
   │  └─ Combina resultados locales + APIs
   └─ Retorna DataSourceResult (JSON)
5. Grid Kendo renderiza resultados
6. Usuario selecciona vehículos → Solicitar Servicio/Transporte
```

#### Validaciones Especiales

**Campo KOVP2:**
```sql
-- Vehículos con código HST que tiene KOVP2 = 1 requieren validación adicional
SELECT v.*, ch.KOVP2
FROM SolicitudDetalle v
INNER JOIN CodigoHST ch ON v.CodigoHST = ch.Codigo
WHERE ch.KOVP2 = 1
```

Si un vehículo tiene `KOVP2 = 1`, se requiere autorización especial antes de permitir transporte.

#### Código SQL de Ejemplo

```sql
-- Búsqueda de vehículos con filtros múltiples
DECLARE @Bastidores NVARCHAR(MAX) = 'VIN1,VIN2,VIN3'
DECLARE @FechaDesde DATETIME = '2026-01-01'
DECLARE @FechaHasta DATETIME = '2026-01-31'
DECLARE @UsuarioId INT = 123

SELECT
    sd.NumeroBastidor,
    sd.Matricula,
    sd.MarcaModelo,
    co.Nombre AS Origen,
    cd.Nombre AS Destino,
    s.CodSolicitud,
    s.FechaCreacion,
    e.Nombre AS Estado
FROM SolicitudDetalle sd
INNER JOIN Solicitud s ON sd.SolicitudId = s.Id
LEFT JOIN Concesionario co ON sd.ConcesionarioIdOrigen = co.ConcesionarioId
LEFT JOIN Concesionario cd ON sd.ConcesionarioIdDestino = cd.ConcesionarioId
LEFT JOIN Estado e ON sd.EstadoId = e.Id
WHERE s.FechaBorrado IS NULL
  AND sd.FechaBorrado IS NULL
  AND (@Bastidores IS NULL OR sd.NumeroBastidor IN (SELECT value FROM STRING_SPLIT(@Bastidores, ',')))
  AND s.FechaCreacion BETWEEN @FechaDesde AND @FechaHasta
  -- Filtro por concesionarios del usuario si no tiene AllConcesionarios
  AND (
    EXISTS (SELECT 1 FROM Usuario WHERE Id = @UsuarioId AND AllConcesionarios = 1)
    OR sd.ConcesionarioIdOrigen IN (
        SELECT ConcesionarioId FROM UsuarioConcesionario WHERE UsuarioId = @UsuarioId
    )
  )
ORDER BY s.FechaCreacion DESC
```

---

### 4.4 MÓDULO 3: Solicitudes

**Controlador:** `SolicitudesController` (645 líneas)
**Vistas principales:**
- `Solicitudes/Index.cshtml` - Lista de mis solicitudes
- `Solicitudes/AllSolicitudes.cshtml` - Todas las solicitudes (admin)
- `Solicitudes/Solicitud.cshtml` - Detalle de solicitud
- `Solicitudes/Resumen.cshtml` - Resumen agrupado

**Permisos necesarios:**
- `SOL_VER` - Ver solicitudes propias
- `SOLALL_VER` - Ver todas las solicitudes (admin)
- `SOL_EDIT` - Editar solicitudes

#### Funcionalidad

Gestiona el ciclo de vida completo de las solicitudes:

1. **Listado de Solicitudes**
   - Grid con filtros (estado, fecha, código, bastidor)
   - Vista por usuario o vista global (admin)
   - Agrupación por tipo de solicitud

2. **Detalle de Solicitud**
   - Información de cabecera (código, tipo, estado, fechas)
   - Lista de vehículos incluidos
   - Documentos adjuntos
   - Histórico de cambios de estado
   - Comentarios

3. **Acciones sobre Solicitudes**
   - **Guardar cambios**: Actualizar comentarios, documentos
   - **Cancelar**: Cambiar estado a Cancelada (envía cancelación a TMS/SLC)
   - **Reenviar**: Si estado Error, reintenta envío a sistemas externos
   - **Ver estado en servicio**: Consulta estado en MoveIT/TMS/SLC
   - **Exportar a Excel**: Descarga detalles en Excel

4. **Estados de Solicitud**

| Estado | ID | Descripción | Acciones Permitidas |
|--------|----|-----------|--------------------|
| Pendiente | 1 | Recién creada, no enviada | Editar, Cancelar |
| En Proceso | 2 | Enviándose a sistemas externos | Ver |
| Registrada | 3 | Confirmada en TMS/SLC | Ver, Cancelar (con aprobación) |
| Error | 4 | Falló envío a sistemas externos | Reenviar, Cancelar |
| Cancelada | 5 | Usuario canceló la solicitud | Ver (solo lectura) |
| Pendiente Validación | 6 | Esperando validación admin | Validar, Rechazar |
| Cancelada Validación | 7 | Admin rechazó la solicitud | Ver (solo lectura) |
| Pendiente Cancelación | 8 | Solicitada cancelación, esperando aprobación | Aprobar Cancelación |

#### Transiciones de Estado

```
[Pendiente] ──(Enviar)──> [En Proceso] ──(Confirmado)──> [Registrada]
     │                          │
     │                          └──(Error)──> [Error]
     │                                           │
     └──(Cancelar)──> [Cancelada]               └──(Reenviar)──> [En Proceso]

[Registrada] ──(Solicitar Cancelación)──> [Pendiente Cancelación]
                                                  │
                                   ┌──────────────┴──────────────┐
                                   │                             │
                              (Aprobar)                     (Rechazar)
                                   │                             │
                                   ↓                             ↓
                             [Cancelada]                   [Registrada]
```

#### Tablas Involucradas

- `Solicitud` - Cabecera
- `SolicitudDetalle` - Líneas de vehículos
- `SolicitudDocumento` - Archivos adjuntos
- `SolicitudesHistoricoEstados` - Auditoría de cambios
- `SolicitudesDatosTemp` - Temporal para solicitudes masivas
- `Usuario`, `Concesionario`, `CuentasFacturacion`

#### Flujo de Visualización de Solicitud

```
1. Usuario accede a Solicitudes/Index
2. SolicitudesController.Index()
   ├─ GetCurrentUser() → Extrae ID y permisos
   ├─ Si tiene SOLALL_VER → Ve todas las solicitudes
   └─ Si no → Solo ve sus solicitudes
3. Grid Kendo carga datos via AJAX
   └─ SolicitudesController.BindingSolicitudes_Read()
       └─ SolicitudService.ListAllByUsuarioFilters(filter)
4. Usuario hace doble-click en solicitud
5. SolicitudesController.Show(id)
   ├─ SolicitudService.GetById(id)
   ├─ SolicitudDetalleService.ListAllBySolicitud(id)
   ├─ SolicitudesDocumentosService.GetBySolicitudId(id)
   └─ Retorna vista Solicitud.cshtml con modelo completo
6. Vista muestra:
   - Cabecera con datos generales
   - Grid con vehículos
   - Lista de documentos con enlaces de descarga
   - Botones de acción según estado
```

#### Código SQL de Ejemplo

```sql
-- Obtener solicitud completa con todos sus datos
DECLARE @SolicitudId INT = 123

-- Cabecera
SELECT
    s.*,
    ts.Nombre AS TipoSolicitud,
    e.Nombre AS Estado,
    u.Nombre AS Solicitante,
    cf.Nombre AS CuentaFacturacion
FROM Solicitud s
LEFT JOIN TipoSolicitud ts ON s.TipoSolicitudId = ts.Id
LEFT JOIN Estado e ON s.EstadoId = e.Id
LEFT JOIN Usuario u ON s.UsuarioCreacion = u.Id
LEFT JOIN CuentasFacturacion cf ON s.CuentasFacturacionId = cf.Id
WHERE s.Id = @SolicitudId

-- Detalles (vehículos)
SELECT
    sd.*,
    co.Nombre AS NombreOrigen,
    cd.Nombre AS NombreDestino,
    e.Nombre AS Estado
FROM SolicitudDetalle sd
LEFT JOIN Concesionario co ON sd.ConcesionarioIdOrigen = co.ConcesionarioId
LEFT JOIN Concesionario cd ON sd.ConcesionarioIdDestino = cd.ConcesionarioId
LEFT JOIN Estado e ON sd.EstadoId = e.Id
WHERE sd.SolicitudId = @SolicitudId
  AND sd.FechaBorrado IS NULL

-- Documentos
SELECT * FROM SolicitudDocumento
WHERE SolicitudId = @SolicitudId AND FechaBorrado IS NULL

-- Histórico
SELECT
    h.*,
    ea.Nombre AS NombreEstadoAnterior,
    en.Nombre AS NombreEstadoNuevo,
    u.Nombre AS NombreUsuario
FROM SolicitudesHistoricoEstados h
LEFT JOIN Estado ea ON h.EstadoAnterior = ea.Id
LEFT JOIN Estado en ON h.EstadoNuevo = en.Id
LEFT JOIN Usuario u ON h.Usuario = u.Id
WHERE h.SolicitudId = @SolicitudId
ORDER BY h.Fecha DESC
```

---

### 4.5 MÓDULO 4: Transportes

**Controlador:** `TransportesController` (576 líneas)
**Vistas principales:**
- `Transportes/Index.cshtml` - Lista de solicitudes de transporte
- `Transportes/SolicitudTransportePaso1.cshtml` - Paso 1: Selección de vehículos
- `Transportes/Transporte.cshtml` - Paso 2: Origen y destino

**Permisos necesarios:**
- `SOTRA_VER` - Ver solicitudes de transporte
- `SOTRA_EDIT` - Crear solicitudes de transporte
- `SOTRA_USU` - Usuario de transportes

#### Funcionalidad

Gestiona solicitudes de transporte de vehículos entre ubicaciones:

1. **Crear Solicitud de Transporte (Flujo en 2 pasos)**

**Paso 1: Selección de Vehículos**
- Usuario introduce VINs (máximo 50 por solicitud)
- Sistema consulta datos de vehículos en:
  - Base de datos local
  - API MoveIT
  - API SLC
  - API TMS
- Valida que vehículos existan y tengan origen válido
- Muestra grid con vehículos encontrados

**Paso 2: Origen y Destino**
- Usuario selecciona:
  - Origen (concesionario o dirección libre)
  - Destino (concesionario o dirección libre)
  - Cuenta de facturación
  - Código RAC (opcional)
  - Documentos adjuntos (albaranes, autorizaciones)
- Sistema valida:
  - Transportes duplicados (mismo vehículo con transporte activo)
  - Vehículos KOVP2 (requieren autorización especial)
  - Disponibilidad en origen

2. **Carga Masiva (>50 vehículos)**
- Usuario sube archivo Excel con VINs
- Sistema procesa en bloques de 50
- Guarda datos temporales en `SolicitudesDatosTemp` con GUID
- Crea solicitudes en lotes

3. **Tipos de Transporte**
- **Transporte Normal**: Origen → Destino
- **Trasiego**: Destino diferente al solicitado originalmente
  - Requiere validación del concesionario destino
  - Notifica a administradores del concesionario

#### Validaciones Especiales

**1. Validación KOVP2:**
```csharp
// Si el código HST tiene KOVP2 = 1, requiere validación especial
if (codigoHST.KOVP2 == true)
{
    // Validar con admin
    // No permitir transporte sin autorización
}
```

**2. Validación de Transportes Duplicados:**
```sql
-- Verificar si el vehículo ya tiene transporte activo
SELECT COUNT(*)
FROM SolicitudDetalle sd
INNER JOIN Solicitud s ON sd.SolicitudId = s.Id
WHERE sd.NumeroBastidor = @Bastidor
  AND s.TipoSolicitudId = 2 -- Transporte
  AND s.EstadoId IN (1, 2, 3) -- Pendiente, En Proceso, Registrada
  AND s.FechaBorrado IS NULL
  AND sd.FechaBorrado IS NULL
```

#### Tablas Involucradas

- `Solicitud` (TipoSolicitudId = 2 para transportes)
- `SolicitudDetalle` - Vehículos a transportar
- `SolicitudDocumento` - Albaranes, autorizaciones
- `Concesionario` - Orígenes y destinos
- `DireccionLibre` - Direcciones no concesionarios
- `CodigoHST` - Para validación KOVP2
- `Transportista` - Empresa de transporte
- `SolicitudesDatosTemp` - Carga masiva

#### Flujo Completo de Creación

```
1. Usuario accede a Transportes → Nueva Solicitud
2. TransportesController.SolicitudTransportePaso1() [GET]
   └─ Retorna vista con formulario de VINs
3. Usuario introduce VINs (separados por comas o saltos de línea)
4. TransportesController.processPaso1() [POST]
   ├─ Valida máximo 50 VINs
   ├─ Si > 50 → Redirige a carga masiva
   ├─ VehiculosService.GetVehiculosForSolicitudes(vins)
   │  ├─ Busca en BD local
   │  ├─ Si no encuentra, consulta APIMoveIT
   │  ├─ Si no encuentra, consulta APISLC
   │  └─ Retorna datos de vehículos
   ├─ Valida que todos tengan origen
   └─ Guarda en sesión y retorna Paso 2
5. TransportesController.SolicitudTransportePaso2() [GET]
   ├─ Carga vehículos desde sesión
   ├─ Carga lista de concesionarios (orígenes)
   ├─ Carga lista de destinos
   └─ Retorna vista Transporte.cshtml
6. Usuario completa origen, destino, cuenta facturación
7. TransportesController.GuardarTransporte() [POST]
   ├─ Valida transportes duplicados
   ├─ Valida KOVP2
   ├─ Si destino != origen solicitado → Es Trasiego
   │  ├─ Busca usuarios admin del concesionario destino
   │  ├─ Filtra por permiso TRASIEG_EDIT
   │  ├─ Crea solicitud con Trasiego = true
   │  └─ Envía email a admins destino
   ├─ Si no es trasiego:
   │  ├─ Crea Solicitud (cabecera)
   │  ├─ Crea SolicitudDetalle (por cada vehículo)
   │  ├─ Guarda documentos adjuntos
   │  ├─ Envía a Azure Service Bus (TMS)
   │  │  └─ Mensaje con datos del transporte
   │  ├─ Estado → En Proceso
   │  └─ Callback de TMS actualiza estado
   └─ Redirige a Solicitudes/Show(id)
8. Usuario ve solicitud creada con estado "En Proceso"
9. Callback de TMS/SLC actualiza estado:
   - Si éxito → Estado = Registrada
   - Si error → Estado = Error (permite reenvío)
```

#### Código SQL de Ejemplo

```sql
-- Crear solicitud de transporte
DECLARE @UsuarioId INT = 123
DECLARE @CuentaFacturacionId INT = 5

-- 1. Insertar cabecera
INSERT INTO Solicitud (
    CodSolicitud, TipoSolicitudId, EstadoId, UsuarioCreacion,
    CuentasFacturacionId, FechaCreacion, Trasiego
)
VALUES (
    'TRA-2026-0001', 2, 1, @UsuarioId, @CuentaFacturacionId, GETDATE(), 0
)

DECLARE @SolicitudId INT = SCOPE_IDENTITY()

-- 2. Insertar detalles (por cada vehículo)
INSERT INTO SolicitudDetalle (
    SolicitudId, NumeroBastidor, MarcaModelo, Matricula,
    ConcesionarioIdOrigen, ConcesionarioIdDestino, EstadoId, FechaCreacion
)
VALUES
    (@SolicitudId, 'VIN1', 'BMW X5', 'ABC123', 10, 20, 1, GETDATE()),
    (@SolicitudId, 'VIN2', 'BMW X3', 'DEF456', 10, 20, 1, GETDATE())

-- 3. Enviar a Azure Service Bus (TMS)
-- Esto se hace desde código C# usando ServiceBusClient
```

---

### 4.6 MÓDULO 5: Servicios

**Controlador:** `ServiciosController`
**Vistas principales:**
- `Servicios/Index.cshtml` - Lista de solicitudes de servicio
- `Servicios/Servicio.cshtml` - Formulario de solicitud de servicio

**Permisos necesarios:**
- `SERV_VER` - Ver solicitudes de servicio
- `SERV_EDIT` - Crear solicitudes de servicio

#### Funcionalidad

Gestiona solicitudes de servicios (reparaciones, PDI, preparación, etc.):

1. **Tipos de Servicios Disponibles**
   - PDI (Pre-Delivery Inspection)
   - Reparación de carrocería
   - Pintura
   - Revisión mecánica
   - Preparación para entrega
   - Otros servicios configurables en `TipoServicio`

2. **Crear Solicitud de Servicio**
   - Usuario selecciona vehículos (desde Vehículos/Stock)
   - Sistema abre modal con formulario
   - Usuario selecciona:
     - Tipo de servicio (PDI, Reparación, etc.)
     - Centro de servicio (SANTANDER, CIEMPOZUELOS)
     - Cuenta de facturación
     - Comentarios
     - Documentos adjuntos
   - Sistema envía a SLC (Supplier Logistic Client)

3. **Centros de Servicio**
   - **SANTANDER**: Centro logístico norte
   - **CIEMPOZUELOS**: Centro logístico centro

#### Tablas Involucradas

- `Solicitud` (TipoSolicitudId = 1 para servicios)
- `SolicitudDetalle` - Vehículos a los que aplicar servicio
- `TipoServicio` - Catálogo de servicios
- `TipoServicioGrupo` - Agrupación de servicios
- `SolicitudDocumento` - Documentos adjuntos

#### Flujo de Creación

```
1. Usuario busca vehículos en Vehículos/Stock
2. Selecciona vehículos → Click "Solicitar Servicio"
3. VehiculosController.FindServicios() [AJAX]
   └─ Abre modal con formulario
4. ServiciosController.Servicio() [GET]
   ├─ Carga tipos de servicios disponibles
   ├─ Filtra por servicios asignados al usuario
   └─ Retorna vista modal
5. Usuario selecciona tipo de servicio y centro
6. ServiciosController.GuardarServicio() [POST]
   ├─ Valida tipo de servicio
   ├─ Crea Solicitud (cabecera)
   ├─ Crea SolicitudDetalle (por cada vehículo)
   ├─ Guarda documentos adjuntos
   ├─ Envía a SLC via SOAP
   │  └─ Endpoint: BGBSoapClient/URLGestion
   ├─ Estado → En Proceso
   └─ Envía email de notificación
7. Callback de SLC actualiza estado
```

#### Código SQL de Ejemplo

```sql
-- Listar tipos de servicios disponibles para un usuario
DECLARE @UsuarioId INT = 123

SELECT ts.*
FROM TipoServicio ts
LEFT JOIN UsuarioTipoServicio uts ON ts.Id = uts.TipoServicioId
WHERE ts.FechaBorrado IS NULL
  AND (
    -- Usuario tiene el servicio asignado
    uts.UsuarioId = @UsuarioId
    OR
    -- Usuario tiene AllTipoServicios = 1
    EXISTS (SELECT 1 FROM Usuario WHERE Id = @UsuarioId AND AllTipoServicios = 1)
  )
ORDER BY ts.Nombre
```

---

### 4.7 MÓDULO 6: Trasiegos

**Controlador:** `TrasiegosController` (347 líneas)
**Vistas principales:**
- `Trasiegos/Index.cshtml` - Lista de trasiegos pendientes
- `Shared/_AcceptTrasiego.cshtml` - Modal de aceptación
- `Shared/_ShowDesvio.cshtml` - Detalle del desvío

**Permisos necesarios:**
- `TRASIEG_VER` - Ver trasiegos
- `TRASIEG_EDIT` - Aceptar/rechazar trasiegos

#### Funcionalidad

Un **trasiego** ocurre cuando un vehículo en transporte necesita cambiar su destino durante el trayecto.

**Escenario típico:**
```
Vehículo A se transporta de Concesionario X → Concesionario Y
Durante el transporte, Concesionario Z solicita el vehículo
Se crea un trasiego: X → Z (en lugar de X → Y)
```

**Características:**

1. **Creación de Trasiego**
   - Se genera automáticamente al crear solicitud de transporte con destino diferente al origen actual
   - El sistema detecta que `DestinoSolicitado != OrigenActual`
   - Marca solicitud con `Trasiego = 1`

2. **Validación de Trasiego**
   - Requiere aprobación del concesionario destino
   - Notifica a usuarios admin del concesionario destino con permiso `TRASIEG_EDIT`
   - Hasta aprobación, estado = `Pendiente Validación`

3. **Estados de Trasiego**
   - **Pendiente**: Esperando aceptación del concesionario destino
   - **Aceptado**: Concesionario destino aceptó el trasiego
   - **Rechazado**: Concesionario destino rechazó el trasiego

4. **Notificaciones**
   - Email automático a admins del concesionario destino
   - Include información del vehículo y origen
   - Link directo para aceptar/rechazar

#### Tablas Involucradas

- `Solicitud` (campo `Trasiego = 1`)
- `SolicitudDetalle` - Vehículos en trasiego
- `Concesionario` - Origen actual y destino nuevo
- `Usuario` - Admins del concesionario destino

#### Flujo de Trasiego

```
1. Usuario crea solicitud de transporte
2. TransportesController.GuardarTransporte()
   ├─ Detecta que destino != origen actual del vehículo
   ├─ Marca como trasiego: Trasiego = 1
   ├─ Busca usuarios del concesionario destino:
   │  SELECT u.*
   │  FROM Usuario u
   │  INNER JOIN UsuarioConcesionario uc ON u.Id = uc.UsuarioId
   │  INNER JOIN UsuarioRol ur ON u.Id = ur.UsuarioId
   │  INNER JOIN RolProcesoPermiso rpp ON ur.RolId = rpp.RolId
   │  WHERE uc.ConcesionarioId = @DestinoId
   │    AND rpp.ProcesoId = (SELECT Id FROM Proceso WHERE Abreviatura = 'TRASIEG')
   │    AND rpp.PermisoId = 2 -- Editar
   ├─ Envía email a cada admin:
   │  TransportesService.SendMailTrasiegoToUserAdminConcesionario()
   └─ Estado = Pendiente Validación
3. Admin del concesionario destino recibe email
4. Admin accede a Trasiegos/Index
   └─ Ve lista de trasiegos pendientes
5. Admin hace click en trasiego → Abre modal
6. TrasiegosController.ShowDesvio(id) [AJAX]
   └─ Retorna detalle del trasiego en modal
7. Admin puede:
   - Aceptar → TrasiegosController.Accept(id)
     ├─ Actualiza estado a "Registrada"
     ├─ Envía solicitud a TMS con nuevo destino
     └─ Notifica al solicitante original
   - Rechazar → TrasiegosController.Reject(id)
     ├─ Actualiza estado a "Cancelada Validación"
     └─ Notifica al solicitante
```

#### Código SQL de Ejemplo

```sql
-- Listar trasiegos pendientes de un concesionario
DECLARE @ConcesionarioId INT = 10

SELECT
    s.Id,
    s.CodSolicitud,
    s.FechaCreacion,
    u.Nombre AS Solicitante,
    COUNT(sd.Id) AS TotalVehiculos,
    STRING_AGG(sd.NumeroBastidor, ', ') AS Bastidores,
    co.Nombre AS Origen,
    cd.Nombre AS DestinoNuevo
FROM Solicitud s
INNER JOIN Usuario u ON s.UsuarioCreacion = u.Id
INNER JOIN SolicitudDetalle sd ON s.Id = sd.SolicitudId
LEFT JOIN Concesionario co ON sd.ConcesionarioIdOrigen = co.ConcesionarioId
LEFT JOIN Concesionario cd ON sd.ConcesionarioIdDestino = cd.ConcesionarioId
WHERE s.Trasiego = 1
  AND s.EstadoId = 6 -- Pendiente Validación
  AND sd.ConcesionarioIdDestino = @ConcesionarioId
  AND s.FechaBorrado IS NULL
GROUP BY s.Id, s.CodSolicitud, s.FechaCreacion, u.Nombre, co.Nombre, cd.Nombre
ORDER BY s.FechaCreacion DESC
```

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

## 5. FLUJOS DE NEGOCIO CRÍTICOS

Esta sección documenta los flujos completos paso a paso de las operaciones más importantes del sistema. Para cada flujo se incluye:
- Diagrama de secuencia
- Pasos detallados con validaciones
- Tablas afectadas y operaciones SQL
- Estados y transiciones
- Puntos de integración con sistemas externos

### 5.1 FLUJO 1: Login y Autenticación

**Objetivo:** Autenticar usuario y establecer sesión con permisos

#### Diagrama de Flujo

```
Usuario → Navegador → AccountController → UsuariosService → BD
   │           │              │                  │            │
   │           │              │                  │            │
   ├─(1)───────┤              │                  │            │
   │  Ingresa  │              │                  │            │
   │  Email +  │              │                  │            │
   │  Password │              │                  │            │
   │           │              │                  │            │
   │           ├─(2)──────────┤                  │            │
   │           │  POST /Login │                  │            │
   │           │              │                  │            │
   │           │              ├─(3)──────────────┤            │
   │           │              │  Login(email,pw) │            │
   │           │              │                  │            │
   │           │              │                  ├─(4)────────┤
   │           │              │                  │ SP_Usuarios│
   │           │              │                  │ _Login     │
   │           │              │                  │            │
   │           │              │                  ├────(5)─────┤
   │           │              │                  │ ← Usuario  │
   │           │              ├────(6)───────────┤            │
   │           │              │ ← Usuario obj    │            │
   │           │              │                  │            │
   │           │              ├─(7)──────────────┤            │
   │           │              │ GetRoles,        │            │
   │           │              │ GetPermisos,     │            │
   │           │              │ GetConcesionarios│            │
   │           │              │                  │            │
   │           │              │                  ├─(8)────────┤
   │           │              │                  │ Consultas  │
   │           │              │                  │            │
   │           │              ├────(9)───────────┤            │
   │           │              │ CreatePrincipal  │            │
   │           │              │ (Claims)         │            │
   │           │              │                  │            │
   │           ├──(10)────────┤                  │            │
   │           │ SetCookie +  │                  │            │
   │           │ Session      │                  │            │
   │           │              │                  │            │
   ├──(11)────┤              │                  │            │
   │  ← Home  │              │                  │            │
```

#### Paso a Paso Detallado

**PASO 1: Usuario accede a /Account/LogIn**
```
GET /Account/LogIn
→ AccountController.LogIn() [GET]
→ Retorna vista Login.cshtml
```

**PASO 2: Usuario ingresa credenciales y envía formulario**
```csharp
POST /Account/LogIn
Body: { Email: "usuario@example.com", Password: "******" }
```

**PASO 3: Validación de ModelState**
```csharp
if (!ModelState.IsValid)
{
    return View(model, false, UsuarioMessage.ErrorModel);
}
```

**PASO 4: Conversión de ViewModel a Entidad**
```csharp
var element = AccountAdapter.ConvertTo(model);
// Mapea LoginViewModel → Usuario
```

**PASO 5: Autenticación en BD**
```csharp
var user = UsuariosService.Login(element);
```

```sql
EXEC SP_Usuarios_Login
    @Email = 'usuario@example.com',
    @Password = '***HASH***' -- Password encriptado

-- Retorna:
SELECT * FROM Usuario
WHERE Email = @Email
  AND Password = @Password
  AND Activo = 1
  AND FechaBorrado IS NULL
```

**Validaciones:**
- ✅ Email existe en BD
- ✅ Password coincide (encriptado)
- ✅ Usuario está activo (`Activo = 1`)
- ✅ Usuario no está borrado (`FechaBorrado IS NULL`)

**Si falla validación:**
```csharp
return View(model, false, UsuarioMessage.FailLogin);
// Mensaje: "Email o contraseña incorrectos"
```

**PASO 6: Cargar configuración completa del usuario**
```csharp
// Obtener roles
var roles = UsuariosService.ListRoles(user.Id);

// Obtener procesos y permisos
var procesos = UsuariosService.ListProcesosPermisos(user.Id);

// Obtener concesionarios asignados
var concesionarios = UsuariosService.ListConcesionarios(user.Id);

// Obtener marcas
var marcas = UsuariosService.ListMarcas(user.Id);

// Obtener códigos TMS/SLC
var codigosTMS = UsuariosService.ListTMS(user.Id);
var codigosSLC = UsuariosService.ListSLC(user.Id);

// Obtener cuentas de facturación
var cuentas = UsuariosService.ListCuentasFacturacion(user.Id);

// Obtener códigos HST
var codigosHST = CodigoHSTService.GetByIdUsuario(user.Id);
```

**PASO 7: Crear ClaimsPrincipal con todos los permisos**
```csharp
var claims = new List<Claim>
{
    new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
    new Claim(ClaimTypes.Name, user.Nombre),
    new Claim(ClaimTypes.Email, user.Email),
    // Claims de configuración
    new Claim("AllConcesionarios", user.AllConcesionarios.ToString()),
    new Claim("AllMarcas", user.AllMarcas.ToString()),
    new Claim("AllTipoServicios", user.AllTipoServicios.ToString()),
    new Claim("IdGruposUsuarios", user.IdGruposUsuarios?.ToString() ?? ""),
};

// Agregar roles como claims
foreach (var rol in roles)
{
    claims.Add(new Claim(ClaimTypes.Role, rol.Nombre));
}

// Agregar procesos-permisos como claims
foreach (var pp in procesos)
{
    claims.Add(new Claim("ProcesoPermiso", $"{pp.ProcesoAbreviatura}_{pp.PermisoAbreviatura}"));
}

// Agregar concesionarios como claims
var concesionariosIds = string.Join(",", concesionarios.Select(c => c.ConcesionarioId));
claims.Add(new Claim("Concesionarios", concesionariosIds));

// ... más claims

var claimsIdentity = new ClaimsIdentity(claims, "CookieAuth");
var claimsPrincipal = new ClaimsPrincipal(claimsIdentity);
```

**PASO 8: Establecer cookie de autenticación**
```csharp
await HttpContext.SignInAsync("CookieAuth", claimsPrincipal);
```

**Configuración de cookie:**
- Nombre: `Acerca-BMW.Cookie`
- HttpOnly: `true` (no accesible desde JavaScript)
- Secure: `true` (solo HTTPS)
- Timeout: `7 horas`
- SameSite: `Lax`

**PASO 9: Establecer sesión**
```csharp
HttpContext.Session.Set("idusuario", BitConverter.GetBytes(user.Id));
HttpContext.Session.Set("usuarioRed", BitConverter.GetBytes(user.EsRed ? 1 : 0));
```

**PASO 10: Registrar login en log**
```csharp
DataBaseTracer.WriteLog(
    message: "Login exitoso",
    controller: "AccountController",
    detail: $"Usuario: {user.Email}",
    levelLog: LevelLogEnum.Info
);
```

```sql
-- Actualizar última fecha de login
UPDATE Usuario
SET FechaUltimoLogin = GETDATE()
WHERE Id = @UserId
```

**PASO 11: Redireccionar a Home**
```csharp
return RedirectToAction("Index", "Home");
```

#### Tablas Afectadas

| Tabla | Operación | SQL |
|-------|-----------|-----|
| Usuario | SELECT | Autenticación y datos básicos |
| UsuarioRol | SELECT | Obtener roles |
| RolProcesoPermiso | SELECT | Obtener permisos |
| UsuarioConcesionario | SELECT | Obtener concesionarios |
| UsuarioMarca | SELECT | Obtener marcas |
| UsuarioTMS | SELECT | Obtener códigos TMS |
| UsuarioSLC | SELECT | Obtener códigos SLC |
| UsuarioCuentaFacturacion | SELECT | Obtener cuentas |
| UsuarioCodigoHST | SELECT | Obtener códigos HST |
| Usuario | UPDATE | Actualizar FechaUltimoLogin |

#### Validaciones de Seguridad

1. **Password encriptado**: Nunca se almacena en texto plano
2. **Cookie segura**: HttpOnly + Secure + SameSite
3. **Sesión del lado servidor**: Datos sensibles en sesión, no en cookie
4. **Timeout**: Sesión expira después de 7 horas de inactividad
5. **Logging**: Todos los intentos de login se registran

#### Casos de Error

| Error | Causa | Respuesta |
|-------|-------|-----------|
| Email no encontrado | Usuario no existe | "Email o contraseña incorrectos" |
| Password incorrecto | Password no coincide | "Email o contraseña incorrectos" |
| Usuario inactivo | `Activo = 0` | "Usuario desactivado. Contacte al administrador" |
| Usuario borrado | `FechaBorrado != NULL` | "Usuario no encontrado" |
| Primer inicio | `PrimerInicio = 1` | Redirige a cambio de contraseña obligatorio |

---

### 5.2 FLUJO 2: Solicitud de Transporte Completa

**Objetivo:** Crear solicitud de transporte de vehículos con envío a TMS

#### Diagrama de Flujo

```
Usuario → UI → TransportesController → VehiculosService → APIs Externas
   │       │            │                      │                 │
   │       │            │                      │                 │
   ├─(1)───┤            │                      │                 │
   │ Accede│            │                      │                 │
   │ Nueva │            │                      │                 │
   │ Solici│            │                      │                 │
   │ tud   │            │                      │                 │
   │       │            │                      │                 │
   │       ├─(2)────────┤                      │                 │
   │       │ GET Paso1  │                      │                 │
   │       │            │                      │                 │
   │       ├────(3)─────┤                      │                 │
   │       │ ← Formulario                      │                 │
   │       │            │                      │                 │
   ├─(4)───┤            │                      │                 │
   │Ingresa│            │                      │                 │
   │VINs   │            │                      │                 │
   │       │            │                      │                 │
   │       ├─(5)────────┤                      │                 │
   │       │POST Paso1  │                      │                 │
   │       │            │                      │                 │
   │       │            ├─(6)──────────────────┤                 │
   │       │            │GetVehiculosForSolic  │                 │
   │       │            │                      │                 │
   │       │            │                      ├─(7)─────────────┤
   │       │            │                      │ Consulta BD local│
   │       │            │                      │                 │
   │       │            │                      ├─(8)─────────────┤
   │       │            │                      │ API MoveIT      │
   │       │            │                      │ API SLC         │
   │       │            │                      │ API TMS         │
   │       │            │                      │                 │
   │       │            ├────(9)───────────────┤                 │
   │       │            │← Datos vehículos     │                 │
   │       │            │                      │                 │
   │       ├───(10)─────┤                      │                 │
   │       │← Paso 2    │                      │                 │
   │       │(Form)      │                      │                 │
   │       │            │                      │                 │
   ├─(11)──┤            │                      │                 │
   │Origen │            │                      │                 │
   │Destino│            │                      │                 │
   │Docs   │            │                      │                 │
   │       │            │                      │                 │
   │       ├─(12)───────┤                      │                 │
   │       │POST Guardar│                      │                 │
   │       │            │                      │                 │
   │       │            ├─(13)─Validaciones────┤                 │
   │       │            │  - Duplicados        │                 │
   │       │            │  - KOVP2             │                 │
   │       │            │  - Trasiego          │                 │
   │       │            │                      │                 │
   │       │            ├─(14)─────────────────┤                 │
   │       │            │ INSERT Solicitud     │                 │
   │       │            │ INSERT SolicitudDet  │                 │
   │       │            │ INSERT Documentos    │                 │
   │       │            │                      │                 │
   │       │            ├─(15)─────────────────┼────────────────►│
   │       │            │ Azure Service Bus    │   TMS System    │
   │       │            │ (Mensaje JSON)       │                 │
   │       │            │                      │                 │
   │       │            ├─(16)─────────────────┤                 │
   │       │            │ Estado = En Proceso  │                 │
   │       │            │                      │                 │
   │       ├───(17)─────┤                      │                 │
   │       │← Solicitud │                      │                 │
   │       │  Creada    │                      │                 │
   │       │            │                      │                 │
   │       │            │                      │                 │
   │       │            │◄─────(18)────────────┼─────────────────┤
   │       │            │ Callback TMS         │  Confirmación   │
   │       │            │ Estado=Registrada    │                 │
```

#### Paso a Paso Detallado

**FASE 1: SELECCIÓN DE VEHÍCULOS (Paso 1)**

**PASO 1: Usuario accede a crear nueva solicitud**
```
GET /Transportes/SolicitudTransportePaso1
→ TransportesController.SolicitudTransportePaso1() [GET]
→ Retorna vista con formulario de VINs
```

**PASO 2: Usuario introduce VINs**
```
Formato aceptado:
- Separados por comas: VIN1,VIN2,VIN3
- Separados por saltos de línea:
  VIN1
  VIN2
  VIN3
- Máximo: 50 VINs por solicitud
```

**PASO 3: Envío de VINs para procesamiento**
```csharp
POST /Transportes/processPaso1
Body: { VINs: "VIN1,VIN2,VIN3", ... }

→ TransportesController.processPaso1()
```

**PASO 4: Validación de VINs**
```csharp
// Limpiar y separar VINs
var vins = model.VINs.Split(new[] { ',', '\n', '\r' }, StringSplitOptions.RemoveEmptyEntries)
                     .Select(v => v.Trim())
                     .Distinct()
                     .ToList();

// Validar máximo 50
if (vins.Count > 50)
{
    return Json(new { success = false, message = "Máximo 50 vehículos por solicitud" });
}

// Validar formato VIN (17 caracteres)
foreach (var vin in vins)
{
    if (vin.Length != 17)
    {
        return Json(new { success = false, message = $"VIN inválido: {vin}" });
    }
}
```

**PASO 5: Obtener datos de vehículos**
```csharp
var vehiculos = VehiculosService.GetVehiculosForSolicitudes(vins);
```

**Búsqueda en cascada:**

```sql
-- 1. Buscar en BD local
SELECT
    sd.NumeroBastidor,
    sd.MarcaModelo,
    sd.Matricula,
    co.Nombre AS Origen,
    co.ConcesionarioId AS OrigenId
FROM SolicitudDetalle sd
INNER JOIN Solicitud s ON sd.SolicitudId = s.Id
LEFT JOIN Concesionario co ON sd.ConcesionarioIdOrigen = co.ConcesionarioId
WHERE sd.NumeroBastidor IN (@VINs)
  AND s.EstadoId IN (3) -- Registrada
  AND s.FechaBorrado IS NULL
ORDER BY s.FechaCreacion DESC
```

```csharp
// 2. Si no encuentra en BD local, consultar API MoveIT
var notFoundInLocal = vins.Except(foundInLocal.Select(v => v.NumeroBastidor));

if (notFoundInLocal.Any())
{
    var moveitVehicles = await APIMoveIT.GetVehiculosByVINs(notFoundInLocal);
    vehiculos.AddRange(moveitVehicles);
}

// 3. Si aún no encuentra, consultar API SLC
var stillNotFound = notFoundInLocal.Except(moveitVehicles.Select(v => v.NumeroBastidor));

if (stillNotFound.Any())
{
    var slcVehicles = await APISLC.GetVehiculosByVINs(stillNotFound);
    vehiculos.AddRange(slcVehicles);
}
```

**PASO 6: Validar que todos los vehículos tienen origen**
```csharp
var sinOrigen = vehiculos.Where(v => string.IsNullOrEmpty(v.Origen)).ToList();

if (sinOrigen.Any())
{
    return Json(new {
        success = false,
        message = $"Los siguientes vehículos no tienen origen definido: {string.Join(", ", sinOrigen.Select(v => v.NumeroBastidor))}"
    });
}
```

**PASO 7: Guardar en sesión y pasar a Paso 2**
```csharp
HttpContext.Session.SetString("VehiculosTransporte", JsonConvert.SerializeObject(vehiculos));

return RedirectToAction("SolicitudTransportePaso2");
```

**FASE 2: ORIGEN Y DESTINO (Paso 2)**

**PASO 8: Cargar formulario Paso 2**
```csharp
GET /Transportes/SolicitudTransportePaso2

→ TransportesController.SolicitudTransportePaso2() [GET]
   ├─ Recuperar vehículos de sesión
   ├─ Cargar lista de concesionarios (orígenes)
   ├─ Cargar lista de destinos
   ├─ Cargar cuentas de facturación del usuario
   └─ Retorna vista Transporte.cshtml
```

**PASO 9: Usuario completa formulario**
```
- Selecciona origen (concesionario o dirección libre)
- Selecciona destino (concesionario o dirección libre)
- Selecciona cuenta de facturación
- Introduce código RAC (opcional)
- Añade comentarios (opcional)
- Sube documentos (albaranes, autorizaciones)
```

**PASO 10: Envío de formulario completo**
```csharp
POST /Transportes/GuardarTransporte
Body: {
    VehiculosIds: [1,2,3],
    OrigenId: 10,
    DestinoId: 20,
    CuentaFacturacionId: 5,
    CodRac: "RAC123",
    Comentarios: "...",
    Documentos: [File1, File2]
}

→ TransportesController.GuardarTransporte()
```

**FASE 3: VALIDACIONES Y CREACIÓN**

**PASO 11: Validar transportes duplicados**
```sql
-- Verificar si algún vehículo ya tiene transporte activo
SELECT sd.NumeroBastidor
FROM SolicitudDetalle sd
INNER JOIN Solicitud s ON sd.SolicitudId = s.Id
WHERE sd.NumeroBastidor IN (@Bastidores)
  AND s.TipoSolicitudId = 2 -- Transporte
  AND s.EstadoId IN (1, 2, 3) -- Pendiente, En Proceso, Registrada
  AND s.FechaBorrado IS NULL
```

```csharp
if (duplicados.Any())
{
    return Json(new {
        success = false,
        message = $"Los siguientes vehículos ya tienen transporte activo: {string.Join(", ", duplicados)}",
        vehiculosDuplicados = duplicados
    });
}
```

**PASO 12: Validar KOVP2**
```sql
-- Verificar si algún vehículo requiere validación KOVP2
SELECT
    sd.NumeroBastidor,
    ch.KOVP2
FROM SolicitudDetalle sd
INNER JOIN Concesionario c ON sd.ConcesionarioIdOrigen = c.ConcesionarioId
INNER JOIN CodigoHST ch ON c.Buno = ch.Codigo
WHERE sd.NumeroBastidor IN (@Bastidores)
  AND ch.KOVP2 = 1
```

```csharp
if (vehiculosKOVP2.Any())
{
    return Json(new {
        success = false,
        message = "Los siguientes vehículos requieren validación especial KOVP2. Contacte al administrador.",
        vehiculosKOVP2 = vehiculosKOVP2
    });
}
```

**PASO 13: Detectar si es trasiego**
```csharp
// Un trasiego ocurre cuando el destino solicitado es diferente al origen actual
bool esTrasiego = model.DestinoId != vehiculos.First().OrigenId;

if (esTrasiego)
{
    // Flujo especial de trasiego
    return await ProcesarTrasiego(model, vehiculos);
}
```

**PASO 14: Crear solicitud en BD**

```csharp
// Generar código único de solicitud
var codSolicitud = $"TRA-{DateTime.Now.Year}-{GetNextSolicitudNumber():D6}";

// Crear cabecera
var solicitud = new Solicitud
{
    CodSolicitud = codSolicitud,
    TipoSolicitudId = 2, // Transporte
    EstadoId = 1, // Pendiente
    UsuarioCreacion = GetCurrentUser().Id,
    CuentasFacturacionId = model.CuentaFacturacionId,
    CodRac = model.CodRac,
    CodigoHST = GetCodigoHSTFromOrigen(model.OrigenId),
    Trasiego = false,
    Comentarios = model.Comentarios,
    FechaCreacion = DateTime.Now
};
```

```sql
-- Insertar solicitud
INSERT INTO Solicitud (
    CodSolicitud, TipoSolicitudId, EstadoId, UsuarioCreacion,
    CuentasFacturacionId, CodRac, CodigoHST, Trasiego, Comentarios, FechaCreacion
)
VALUES (
    @CodSolicitud, 2, 1, @UsuarioId,
    @CuentaFacturacionId, @CodRac, @CodigoHST, 0, @Comentarios, GETDATE()
)

SELECT SCOPE_IDENTITY() AS SolicitudId
```

```csharp
var solicitudId = SolicitudService.Add(solicitud);

// Crear detalles (uno por cada vehículo)
foreach (var vehiculo in vehiculos)
{
    var detalle = new SolicitudDetalle
    {
        SolicitudId = solicitudId,
        NumeroBastidor = vehiculo.VIN,
        MarcaModelo = vehiculo.Modelo,
        Matricula = vehiculo.Matricula,
        ConcesionarioIdOrigen = model.OrigenId,
        ConcesionarioIdDestino = model.DestinoId,
        EstadoId = 1, // Pendiente
        FechaCreacion = DateTime.Now,
        UsuarioCreacion = GetCurrentUser().Id
    };

    SolicitudDetalleService.Add(detalle);
}
```

```sql
-- Insertar detalle por cada vehículo
INSERT INTO SolicitudDetalle (
    SolicitudId, NumeroBastidor, MarcaModelo, Matricula,
    ConcesionarioIdOrigen, ConcesionarioIdDestino, EstadoId, FechaCreacion, UsuarioCreacion
)
VALUES
    (@SolicitudId, 'VIN1', 'BMW X5', 'ABC123', 10, 20, 1, GETDATE(), @UsuarioId),
    (@SolicitudId, 'VIN2', 'BMW X3', 'DEF456', 10, 20, 1, GETDATE(), @UsuarioId),
    (@SolicitudId, 'VIN3', 'BMW 320d', 'GHI789', 10, 20, 1, GETDATE(), @UsuarioId)
```

**PASO 15: Guardar documentos adjuntos**
```csharp
foreach (var file in model.Documentos)
{
    var nombreArchivo = $"{solicitudId}_{DateTime.Now.Ticks}_{file.FileName}";
    var ruta = Path.Combine("Documentos/Transporte", nombreArchivo);

    // Guardar físicamente
    using (var stream = new FileStream(ruta, FileMode.Create))
    {
        await file.CopyToAsync(stream);
    }

    // Guardar en BD
    var documento = new SolicitudDocumento
    {
        SolicitudId = solicitudId,
        NombreFichero = file.FileName,
        Ruta = ruta,
        FechaSubida = DateTime.Now,
        UsuarioIdSubido = GetCurrentUser().Id
    };

    SolicitudesDocumentosService.Add(documento);
}
```

```sql
INSERT INTO SolicitudDocumento (SolicitudId, NombreFichero, Ruta, FechaSubida, UsuarioIdSubido)
VALUES (@SolicitudId, 'albaran.pdf', 'Documentos/Transporte/123_..._albaran.pdf', GETDATE(), @UsuarioId)
```

**FASE 4: ENVÍO A TMS**

**PASO 16: Cambiar estado a "En Proceso"**
```sql
UPDATE Solicitud
SET EstadoId = 2 -- En Proceso
WHERE Id = @SolicitudId
```

**PASO 17: Preparar mensaje para Azure Service Bus**
```csharp
var mensaje = new
{
    SolicitudId = solicitudId,
    CodSolicitud = codSolicitud,
    TipoSolicitud = "Transporte",
    Vehiculos = vehiculos.Select(v => new {
        VIN = v.NumeroBastidor,
        Modelo = v.MarcaModelo,
        Matricula = v.Matricula
    }),
    Origen = new {
        Id = origen.IdDireccionTMS,
        Nombre = origen.Nombre,
        Direccion = origen.DireccionCompleta
    },
    Destino = new {
        Id = destino.IdDireccionTMS,
        Nombre = destino.Nombre,
        Direccion = destino.DireccionCompleta
    },
    CuentaFacturacion = cuentaFacturacion.Codigo,
    FechaSolicitud = DateTime.Now
};

var jsonMensaje = JsonConvert.SerializeObject(mensaje);
```

**PASO 18: Enviar a Azure Service Bus**
```csharp
var serviceBusClient = new ServiceBusClient(ServiceBusConnectionString);
var sender = serviceBusClient.CreateSender("tms"); // Queue "tms"

var message = new ServiceBusMessage(Encoding.UTF8.GetBytes(jsonMensaje))
{
    ContentType = "application/json",
    MessageId = solicitudId.ToString(),
    CorrelationId = codSolicitud
};

await sender.SendMessageAsync(message);
```

**PASO 19: Enviar email de notificación**
```csharp
EmailService.SendInfoSolicitudMail(
    destinatario: GetCurrentUser().Email,
    asunto: $"Solicitud de Transporte {codSolicitud} creada",
    cuerpo: $@"
        Su solicitud de transporte ha sido creada exitosamente.

        Código: {codSolicitud}
        Vehículos: {vehiculos.Count}
        Origen: {origen.Nombre}
        Destino: {destino.Nombre}

        Estado: En Proceso

        Recibirá una notificación cuando sea confirmada por el sistema TMS.
    "
);
```

**FASE 5: CALLBACK DE TMS (Asíncrono)**

**PASO 20: TMS procesa la solicitud y envía callback**
```
TMS System → API Portal → CallbackController → SolicitudService
```

```csharp
POST /api/Callback/TMS
Body: {
    SolicitudId: 123,
    Estado: "Registrada",
    IdSolicitudTMS: "GUID-TMS-123",
    FechaConfirmacion: "2026-01-16T10:30:00"
}

→ CallbackController.TMS()
```

**PASO 21: Actualizar estado en BD**
```sql
-- Actualizar solicitud
UPDATE Solicitud
SET EstadoId = 3, -- Registrada
    FechaFinalizacion = GETDATE()
WHERE Id = @SolicitudId

-- Actualizar detalles con ID de TMS
UPDATE SolicitudDetalle
SET IdSolicitudTMS = @IdSolicitudTMS,
    EstadoId = 3
WHERE SolicitudId = @SolicitudId

-- Registrar en histórico
INSERT INTO SolicitudesHistoricoEstados (SolicitudId, EstadoAnterior, EstadoNuevo, Fecha, Usuario)
VALUES (@SolicitudId, 2, 3, GETDATE(), NULL) -- NULL porque es callback automático
```

**PASO 22: Notificar a usuario**
```csharp
EmailService.SendInfoSolicitudMail(
    destinatario: usuario.Email,
    asunto: $"Solicitud {codSolicitud} confirmada",
    cuerpo: $"Su solicitud de transporte ha sido confirmada por el sistema TMS."
);
```

#### Resumen de Tablas Afectadas

| Tabla | Operaciones | Momento |
|-------|-------------|---------|
| SolicitudDetalle | SELECT | Búsqueda de vehículos en BD local |
| Solicitud | INSERT | Creación de cabecera |
| SolicitudDetalle | INSERT (múltiple) | Creación de líneas |
| SolicitudDocumento | INSERT (múltiple) | Guardar documentos |
| Solicitud | UPDATE | Cambio a "En Proceso" |
| Solicitud | UPDATE | Cambio a "Registrada" (callback) |
| SolicitudDetalle | UPDATE | Actualizar con IdSolicitudTMS |
| SolicitudesHistoricoEstados | INSERT | Registro de cambio de estado |

#### Estados y Transiciones

```
[Pendiente (1)]
    ↓ (Al enviar a TMS)
[En Proceso (2)]
    ├─ (Confirmación TMS) → [Registrada (3)] ✓ FIN EXITOSO
    └─ (Error TMS) → [Error (4)] → Puede Reenviar
```

#### Puntos Críticos para Soporte

1. **Si solicitud queda en "En Proceso" >15 minutos:**
   - Verificar estado en Azure Service Bus
   - Verificar logs de TMS
   - Verificar que callback esté funcionando

2. **Si solicitud pasa a "Error":**
   - Consultar mensaje de error en logs
   - Verificar que datos de origen/destino existan en TMS
   - Usar botón "Reenviar" en el portal

3. **Transportes duplicados:**
   - Consultar en BD si vehículo tiene transporte activo
   - Si es legítimo, cancelar el transporte anterior primero

---

### 5.3 FLUJO 3: Solicitud de Servicio

**Objetivo:** Crear solicitud de servicio (PDI, reparación, etc.) y enviar a SLC

#### Diagrama de Flujo Simplificado

```
Usuario → Vehículos/Stock → Selecciona Vehículos → Modal Servicio
   ↓
Selecciona Tipo Servicio + Centro Logístico
   ↓
ServiciosController.GuardarServicio()
   ↓
Crea Solicitud (TipoSolicitudId = 1)
   ↓
Envía a SLC via SOAP
   ↓
Estado = En Proceso
   ↓
Callback SLC → Estado = Registrada
```

#### Paso a Paso Detallado

**PASO 1: Usuario busca vehículos para servicio**
```
GET /Vehiculos/Stock
→ Busca vehículos en stock
→ Selecciona vehículos (checkbox)
→ Click botón "Solicitar Servicio"
```

**PASO 2: Sistema abre modal de servicio**
```csharp
AJAX POST /Vehiculos/FindServicios
Body: { VehiculosIds: [1,2,3] }

→ VehiculosController.FindServicios()
   ├─ Obtiene datos de vehículos seleccionados
   ├─ Valida que vehículos estén en estado válido para servicio
   └─ Retorna partial view con modal
```

**PASO 3: Cargar formulario de servicio**
```csharp
GET /Servicios/Servicio
→ ServiciosController.Servicio() [GET]
   ├─ Cargar tipos de servicios disponibles para usuario:
   │  SELECT ts.*
   │  FROM TipoServicio ts
   │  LEFT JOIN UsuarioTipoServicio uts ON ts.Id = uts.TipoServicioId
   │  WHERE uts.UsuarioId = @UsuarioId OR @AllTipoServicios = 1
   │
   ├─ Cargar centros logísticos:
   │  - SANTANDER
   │  - CIEMPOZUELOS
   │
   ├─ Cargar cuentas de facturación del usuario
   └─ Retorna vista modal ServicioVMO
```

**PASO 4: Usuario completa formulario**
```
- Selecciona tipo de servicio (ej: PDI, Reparación Carrocería)
- Selecciona centro logístico (SANTANDER o CIEMPOZUELOS)
- Selecciona cuenta de facturación
- Añade comentarios (opcional)
- Sube documentos (opcional)
```

**PASO 5: Validaciones previas al envío**
```csharp
// Validar que tipo de servicio esté permitido para el usuario
if (!usuario.AllTipoServicios)
{
    var tieneServicio = UsuarioTipoServicio.Exists(usuario.Id, model.TipoServicioId);
    if (!tieneServicio)
    {
        return Json(new { success = false, message = "No tiene permisos para este servicio" });
    }
}

// Validar que vehículos no tengan servicio activo del mismo tipo
var vehiculosConServicio = SolicitudDetalleService.CheckServicioActivo(vehiculos, model.TipoServicioId);
if (vehiculosConServicio.Any())
{
    return Json(new {
        success = false,
        message = $"Los siguientes vehículos ya tienen este servicio activo: {string.Join(", ", vehiculosConServicio)}"
    });
}
```

**PASO 6: Crear solicitud en BD**
```csharp
var codSolicitud = $"SER-{DateTime.Now.Year}-{GetNextSolicitudNumber():D6}";

var solicitud = new Solicitud
{
    CodSolicitud = codSolicitud,
    TipoSolicitudId = 1, // Servicio
    EstadoId = 1, // Pendiente
    UsuarioCreacion = GetCurrentUser().Id,
    CuentasFacturacionId = model.CuentaFacturacionId,
    Comentarios = model.Comentarios,
    FechaCreacion = DateTime.Now
};

var solicitudId = SolicitudService.Add(solicitud);
```

```sql
INSERT INTO Solicitud (
    CodSolicitud, TipoSolicitudId, EstadoId, UsuarioCreacion,
    CuentasFacturacionId, Comentarios, FechaCreacion
)
VALUES (
    'SER-2026-000123', 1, 1, @UsuarioId, @CuentaFacturacionId, @Comentarios, GETDATE()
)

SELECT SCOPE_IDENTITY() AS SolicitudId
```

**PASO 7: Crear detalles de solicitud**
```csharp
foreach (var vehiculo in vehiculos)
{
    var detalle = new SolicitudDetalle
    {
        SolicitudId = solicitudId,
        NumeroBastidor = vehiculo.VIN,
        MarcaModelo = vehiculo.Modelo,
        Matricula = vehiculo.Matricula,
        ConcesionarioIdOrigen = vehiculo.ConcesionarioId,
        EstadoId = 1,
        CodServicio = tipoServicio.CodigoServicio,
        FechaCreacion = DateTime.Now,
        UsuarioCreacion = GetCurrentUser().Id
    };

    SolicitudDetalleService.Add(detalle);
}
```

**PASO 8: Cambiar estado a "En Proceso"**
```sql
UPDATE Solicitud
SET EstadoId = 2 -- En Proceso
WHERE Id = @SolicitudId
```

**PASO 9: Preparar petición SOAP a SLC**
```csharp
var soapRequest = new SLCServiceRequest
{
    CodigoServicio = tipoServicio.IdServicioSLC,
    CentroLogistico = model.CentroLogistico, // SANTANDER o CIEMPOZUELOS
    Vehiculos = vehiculos.Select(v => new VehiculoSLC
    {
        VIN = v.NumeroBastidor,
        Matricula = v.Matricula,
        Modelo = v.Modelo
    }).ToList(),
    CuentaFacturacion = cuentaFacturacion.Codigo,
    Comentarios = model.Comentarios
};

var xmlRequest = SerializeToXml(soapRequest);
```

**PASO 10: Enviar a SLC via SOAP**
```csharp
var soapClient = new SoapClient(SLCGestionURL);
var response = await soapClient.PostAsync(xmlRequest);

if (response.IsSuccessStatusCode)
{
    var soapResponse = DeserializeFromXml<SLCServiceResponse>(response.Content);

    // Actualizar detalles con ID de SLC
    foreach (var detalle in detalles)
    {
        var vehiculoSLC = soapResponse.Vehiculos.FirstOrDefault(v => v.VIN == detalle.NumeroBastidor);
        if (vehiculoSLC != null)
        {
            detalle.IdSolicitudSLC = vehiculoSLC.IdServicioSLC;
            detalle.ServicioSLC = vehiculoSLC.CodigoServicio;
            SolicitudDetalleService.Update(detalle);
        }
    }
}
else
{
    // Error al enviar a SLC
    SolicitudService.UpdateStatus(solicitudId, 4); // Estado = Error
    return Json(new { success = false, message = "Error al enviar a SLC" });
}
```

**PASO 11: Enviar email de notificación**
```csharp
// Agrupar por centro logístico
var vehiculosSantander = vehiculos.Where(v => model.CentroLogistico == "SANTANDER").ToList();
var vehiculosCiempozuelos = vehiculos.Where(v => model.CentroLogistico == "CIEMPOZUELOS").ToList();

if (vehiculosSantander.Any())
{
    EmailService.SendInfoSolicitudMail(
        destinatario: "servicios.santander@example.com",
        asunto: $"Nueva solicitud de servicio {codSolicitud}",
        cuerpo: $@"
            Nueva solicitud de servicio recibida.

            Código: {codSolicitud}
            Tipo: {tipoServicio.Nombre}
            Vehículos: {vehiculosSantander.Count}

            [Lista de vehículos]
        "
    );
}
```

**PASO 12: Callback de SLC (asíncrono)**
```csharp
POST /api/Callback/SLC
Body: {
    SolicitudId: 123,
    Estado: "Registrada",
    Servicios: [
        { VIN: "VIN1", EstadoServicio: "Confirmado", FechaEstimada: "2026-01-20" },
        { VIN: "VIN2", EstadoServicio: "Confirmado", FechaEstimada: "2026-01-20" }
    ]
}

→ CallbackController.SLC()
   ├─ Actualizar estado de solicitud a "Registrada"
   ├─ Actualizar detalles con estado de servicio
   └─ Notificar a usuario
```

#### Diferencias con Solicitud de Transporte

| Aspecto | Transporte | Servicio |
|---------|-----------|----------|
| TipoSolicitudId | 2 | 1 |
| Sistema externo | TMS (Azure Service Bus) | SLC (SOAP) |
| Requiere Origen/Destino | Sí (2 concesionarios) | No (solo centro logístico) |
| Validación KOVP2 | Sí | No |
| Documentos típicos | Albaranes, autorizaciones | Órdenes de trabajo |

---

### 5.4 FLUJO 4: Trasiego (Cambio de Destino)

**Objetivo:** Gestionar cambio de destino de un vehículo durante transporte

#### Contexto

Un trasiego ocurre cuando:
1. Vehículo está siendo transportado de A → B
2. Durante el transporte, se solicita que vaya de A → C (nuevo destino)
3. Requiere validación del concesionario destino (C)

#### Paso a Paso Detallado

**PASO 1: Detección de trasiego durante creación de transporte**
```csharp
// En TransportesController.GuardarTransporte()

// Obtener origen actual del vehículo
var origenActual = VehiculosService.GetOrigenActual(vehiculo.VIN);

// Comparar con destino solicitado
if (model.DestinoId != origenActual.ConcesionarioId)
{
    esTrasiego = true;
}
```

**PASO 2: Crear solicitud marcada como trasiego**
```sql
INSERT INTO Solicitud (
    CodSolicitud, TipoSolicitudId, EstadoId, UsuarioCreacion,
    CuentasFacturacionId, Trasiego, Comentarios, FechaCreacion
)
VALUES (
    'TRA-2026-000456', 2, 6, @UsuarioId, -- Estado 6 = Pendiente Validación
    @CuentaFacturacionId, 1, @Comentarios, GETDATE() -- Trasiego = 1
)
```

**PASO 3: Buscar administradores del concesionario destino**
```sql
-- Buscar usuarios del concesionario destino con permiso TRASIEG_EDIT
SELECT DISTINCT u.*
FROM Usuario u
INNER JOIN UsuarioConcesionario uc ON u.Id = uc.UsuarioId
INNER JOIN UsuarioRol ur ON u.Id = ur.UsuarioId
INNER JOIN RolProcesoPermiso rpp ON ur.RolId = rpp.RolId
INNER JOIN Proceso pr ON rpp.ProcesoId = pr.Id
WHERE uc.ConcesionarioId = @DestinoId
  AND pr.Abreviatura = 'TRASIEG'
  AND rpp.PermisoId = 2 -- Editar
  AND u.Activo = 1
  AND u.FechaBorrado IS NULL
```

**PASO 4: Notificar a administradores del destino**
```csharp
foreach (var admin in adminsConcesionarioDestino)
{
    EmailService.SendMailTrasiegoToUserAdminConcesionario(
        destinatario: admin.Email,
        asunto: $"Trasiego pendiente de validación - {codSolicitud}",
        cuerpo: $@"
            Tiene un trasiego pendiente de validación.

            Solicitud: {codSolicitud}
            Vehículos: {vehiculos.Count}
            Origen: {concesionarioOrigen.Nombre}
            Destino solicitado: {concesionarioDestino.Nombre}
            Solicitante: {usuario.Nombre} ({usuario.Email})

            Acceda al portal para aceptar o rechazar el trasiego:
            {portalUrl}/Trasiegos/Index
        "
    );
}
```

**PASO 5: Admin del destino accede a Trasiegos**
```
GET /Trasiegos/Index
→ TrasiegosController.Index()
   ├─ Filtrar trasiegos del concesionario del admin
   ├─ Estado = Pendiente Validación
   └─ Retorna vista con lista
```

**PASO 6: Admin visualiza detalle del trasiego**
```csharp
AJAX GET /Trasiegos/ShowDesvio/{id}
→ TrasiegosController.ShowDesvio(id)
   ├─ SolicitudService.GetById(id)
   ├─ SolicitudDetalleService.ListAllBySolicitud(id)
   ├─ Obtener datos del solicitante
   └─ Retorna partial view con modal de detalle
```

**PASO 7a: Admin ACEPTA el trasiego**
```csharp
POST /Trasiegos/Accept/{id}
→ TrasiegosController.Accept(id)
   ├─ Validar que usuario tenga permiso TRASIEG_EDIT
   ├─ Validar que solicitud esté en estado "Pendiente Validación"
   ├─ Actualizar estado:
   │  UPDATE Solicitud
   │  SET EstadoId = 2 -- En Proceso
   │  WHERE Id = @SolicitudId
   │
   ├─ Enviar a TMS con nuevo destino:
   │  var mensaje = new {
   │      SolicitudId = id,
   │      TipoOperacion = "Trasiego",
   │      NuevoDestino = destino.IdDireccionTMS,
   │      ...
   │  };
   │  await ServiceBus.SendAsync("tms", mensaje);
   │
   ├─ Registrar en histórico:
   │  INSERT INTO SolicitudesHistoricoEstados
   │  (SolicitudId, EstadoAnterior, EstadoNuevo, Fecha, Usuario)
   │  VALUES (@SolicitudId, 6, 2, GETDATE(), @AdminId)
   │
   └─ Notificar al solicitante original:
       EmailService.SendInfoSolicitudMail(
           destinatario: solicitante.Email,
           asunto: $"Trasiego {codSolicitud} aceptado",
           cuerpo: "Su trasiego ha sido aceptado..."
       );
```

**PASO 7b: Admin RECHAZA el trasiego**
```csharp
POST /Trasiegos/Reject/{id}
Body: { Motivo: "No disponemos de espacio en este momento" }

→ TrasiegosController.Reject(id, motivo)
   ├─ Actualizar estado:
   │  UPDATE Solicitud
   │  SET EstadoId = 7, -- Cancelada Validación
   │      Comentarios = CONCAT(Comentarios, '\nMotivo rechazo: ', @Motivo)
   │  WHERE Id = @SolicitudId
   │
   ├─ Registrar en histórico
   │
   └─ Notificar al solicitante:
       EmailService.SendInfoSolicitudMail(
           destinatario: solicitante.Email,
           asunto: $"Trasiego {codSolicitud} rechazado",
           cuerpo: $"Su trasiego ha sido rechazado.\nMotivo: {motivo}"
       );
```

**PASO 8: Callback de TMS (si fue aceptado)**
```csharp
POST /api/Callback/TMS
Body: {
    SolicitudId: 123,
    Estado: "Registrada",
    ...
}

→ Actualizar estado a "Registrada"
→ Notificar a solicitante de confirmación final
```

#### Estados del Trasiego

```
[Pendiente Validación (6)]
    ├─ (Admin acepta) → [En Proceso (2)] → [Registrada (3)] ✓
    └─ (Admin rechaza) → [Cancelada Validación (7)] ✗
```

#### Consulta SQL para Trasiegos Pendientes

```sql
-- Listar trasiegos pendientes de un concesionario
DECLARE @ConcesionarioId INT = 10

SELECT
    s.Id,
    s.CodSolicitud,
    s.FechaCreacion,
    u.Nombre AS Solicitante,
    u.Email AS EmailSolicitante,
    co.Nombre AS Origen,
    cd.Nombre AS DestinoSolicitado,
    COUNT(sd.Id) AS TotalVehiculos,
    STRING_AGG(sd.NumeroBastidor, ', ') WITHIN GROUP (ORDER BY sd.Id) AS Bastidores
FROM Solicitud s
INNER JOIN Usuario u ON s.UsuarioCreacion = u.Id
INNER JOIN SolicitudDetalle sd ON s.Id = sd.SolicitudId
LEFT JOIN Concesionario co ON sd.ConcesionarioIdOrigen = co.ConcesionarioId
LEFT JOIN Concesionario cd ON sd.ConcesionarioIdDestino = cd.ConcesionarioId
WHERE s.Trasiego = 1
  AND s.EstadoId = 6 -- Pendiente Validación
  AND sd.ConcesionarioIdDestino = @ConcesionarioId
  AND s.FechaBorrado IS NULL
GROUP BY s.Id, s.CodSolicitud, s.FechaCreacion, u.Nombre, u.Email, co.Nombre, cd.Nombre
ORDER BY s.FechaCreacion DESC
```

---

### 5.5 FLUJO 5: Cesión de Vehículo (Cambio de Propietario)

**Objetivo:** Cambiar propietario de un vehículo entre concesionarios

#### Contexto

Una cesión es diferente de un trasiego:
- **Trasiego**: Cambio de destino durante transporte (temporal)
- **Cesión**: Cambio de propietario/titularidad (permanente)

#### Paso a Paso Detallado

**PASO 1: Validar que código HST permita cesión**
```sql
-- Verificar flag de cesión
SELECT ch.Cesion
FROM CodigoHST ch
INNER JOIN Concesionario c ON ch.Codigo = c.Buno
WHERE c.ConcesionarioId = @ConcesionarioOrigenId

-- Si Cesion = 0 → No permite cesión
```

**PASO 2: Usuario accede a formulario de cesión**
```
GET /Vehiculos/SolicitudCambioPropietario
→ VehiculosController.SolicitudCambioPropietario() [GET]
   ├─ Cargar concesionarios origen (del usuario)
   ├─ Cargar concesionarios destino (todos activos)
   └─ Retorna formulario CesionVMO
```

**PASO 3: Usuario completa formulario**
```
- VIN del vehículo
- Concesionario origen (cedente)
- Concesionario destino (receptor)
- Solicitante (nombre)
- Campa (campaña)
- Comentarios
- ¿Requiere transporte físico? (checkbox)
- Documentos adjuntos
```

**PASO 4: Validación de cesión**
```csharp
// Validar que el código HST del origen permita cesión
var codigoHST = CodigoHSTService.GetByBuno(origen.Buno);
if (codigoHST.Cesion == false)
{
    return Json(new {
        success = false,
        message = "El concesionario origen no permite cesiones"
    });
}

// Validar que el vehículo no tenga cesión pendiente
var cesionPendiente = CesionService.GetPendienteByBastidor(model.Bastidor);
if (cesionPendiente != null)
{
    return Json(new {
        success = false,
        message = "El vehículo ya tiene una cesión pendiente"
    });
}
```

**PASO 5: Crear registro de cesión**
```csharp
var cesion = new Cesion
{
    Bastidor = model.Bastidor,
    CodDealer = origen.Buno,
    Solicitante = model.Solicitante,
    Fecha = DateTime.Now,
    Estado = "Pendiente",
    Campa = model.Campa,
    IdOrigen = model.OrigenId,
    IdDestino = model.DestinoId,
    IdUsuario = GetCurrentUser().Id,
    IdEstado = 1 // Pendiente
};

var cesionId = CesionService.Add(cesion);
```

```sql
INSERT INTO Cesion (
    Bastidor, CodDealer, Solicitante, Fecha, Estado, Campa,
    IdOrigen, IdDestino, IdUsuario, IdEstado
)
VALUES (
    @Bastidor, @CodDealer, @Solicitante, GETDATE(), 'Pendiente', @Campa,
    @OrigenId, @DestinoId, @UsuarioId, 1
)

SELECT SCOPE_IDENTITY() AS CesionId
```

**PASO 6: Si requiere transporte, crear solicitud**
```csharp
if (model.RequiereTransporte)
{
    var solicitud = new Solicitud
    {
        CodSolicitud = $"CES-{DateTime.Now.Year}-{cesionId:D6}",
        TipoSolicitudId = 2, // Transporte
        EstadoId = 1, // Pendiente
        UsuarioCreacion = GetCurrentUser().Id,
        Comentarios = $"Transporte por cesión. Cesión ID: {cesionId}",
        FechaCreacion = DateTime.Now
    };

    var solicitudId = SolicitudService.Add(solicitud);

    // Vincular cesión con solicitud
    cesion.IdSolicitud = solicitudId;
    CesionService.Update(cesion);

    // Crear detalle con el vehículo
    var detalle = new SolicitudDetalle
    {
        SolicitudId = solicitudId,
        NumeroBastidor = model.Bastidor,
        ConcesionarioIdOrigen = model.OrigenId,
        ConcesionarioIdDestino = model.DestinoId,
        EstadoId = 1,
        FechaCreacion = DateTime.Now
    };

    SolicitudDetalleService.Add(detalle);
}
```

**PASO 7: Guardar documentos adjuntos**
```csharp
foreach (var file in model.Documentos)
{
    var nombreArchivo = $"cesion_{cesionId}_{file.FileName}";
    var ruta = Path.Combine("Documentos/Cesiones", nombreArchivo);

    // Guardar físicamente
    await file.SaveAsAsync(ruta);

    // Guardar en BD
    var documento = new HistoricoCambioPropietarioFicheros
    {
        IdHistorico = cesionId,
        NombreArchivo = file.FileName,
        Ruta = ruta,
        FechaSubida = DateTime.Now
    };

    HistoricoCambioPropietarioFicherosService.Add(documento);
}
```

**PASO 8: Notificar a concesionario destino**
```csharp
// Buscar admins del concesionario destino
var adminsDestino = UsuariosService.GetAdminsByConcesionario(model.DestinoId, "CESION_EDIT");

foreach (var admin in adminsDestino)
{
    EmailService.SendCesionNotification(
        destinatario: admin.Email,
        asunto: $"Cesión pendiente de validación - VIN {model.Bastidor}",
        cuerpo: $@"
            Tiene una cesión pendiente de validación.

            VIN: {model.Bastidor}
            Concesionario cedente: {origen.Nombre}
            Solicitante: {model.Solicitante}
            Campa: {model.Campa}

            Acceda al portal para aceptar o rechazar:
            {portalUrl}/Vehiculos/Cesion
        "
    );
}
```

**PASO 9a: Admin destino ACEPTA con OT**
```csharp
POST /Vehiculos/AcceptCesionConOT/{id}
→ VehiculosController.AcceptCesionConOT(id)
   ├─ Actualizar cesión:
   │  UPDATE Cesion
   │  SET Estado = 'Aceptada Con OT',
   │      IdEstado = 2
   │  WHERE Id = @CesionId
   │
   ├─ Si tiene solicitud vinculada:
   │  └─ Enviar transporte a TMS
   │
   ├─ Registrar en histórico:
   │  INSERT INTO HistoricoCambioPropietario (...)
   │  SELECT * FROM Cesion WHERE Id = @CesionId
   │
   └─ Notificar al cedente
```

**PASO 9b: Admin destino ACEPTA sin OT**
```csharp
POST /Vehiculos/AcceptCesionSinOT/{id}
→ Similar a ConOT pero sin crear orden de trabajo
```

**PASO 9c: Admin destino RECHAZA**
```csharp
POST /Vehiculos/RejectCesion/{id}
Body: { Motivo: "..." }

→ VehiculosController.RejectCesion(id, motivo)
   ├─ Actualizar cesión:
   │  UPDATE Cesion
   │  SET Estado = 'Rechazada',
   │      IdEstado = 5,
   │      Comentarios = @Motivo
   │  WHERE Id = @CesionId
   │
   ├─ Si tiene solicitud vinculada:
   │  └─ Cancelar solicitud de transporte
   │
   └─ Notificar al cedente del rechazo
```

#### Estados de Cesión

```
[Pendiente]
    ├─ (Acepta con OT) → [Aceptada Con OT] ✓
    ├─ (Acepta sin OT) → [Aceptada Sin OT] ✓
    └─ (Rechaza) → [Rechazada] ✗
```

#### Consulta SQL para Cesiones Pendientes

```sql
-- Cesiones pendientes para un concesionario
DECLARE @ConcesionarioId INT = 10

SELECT
    c.Id,
    c.Bastidor,
    c.Fecha,
    c.Solicitante,
    c.Campa,
    co.Nombre AS ConcesionarioOrigen,
    cd.Nombre AS ConcesionarioDestino,
    c.Estado,
    CASE WHEN c.IdSolicitud IS NOT NULL THEN 'Sí' ELSE 'No' END AS TieneTransporte,
    s.CodSolicitud
FROM Cesion c
LEFT JOIN Concesionario co ON c.IdOrigen = co.ConcesionarioId
LEFT JOIN Concesionario cd ON c.IdDestino = cd.ConcesionarioId
LEFT JOIN Solicitud s ON c.IdSolicitud = s.Id
WHERE c.IdDestino = @ConcesionarioId
  AND c.Estado = 'Pendiente'
ORDER BY c.Fecha DESC
```

---

### 5.6 FLUJO 6: Cancelación de Solicitud

**Objetivo:** Cancelar una solicitud ya creada (Registrada o En Proceso)

#### Escenarios de Cancelación

1. **Solicitud Pendiente/En Proceso**: Cancelación directa
2. **Solicitud Registrada**: Requiere aprobación y cancelación en sistema externo

#### Paso a Paso Detallado

**CASO 1: Cancelación de Solicitud Pendiente/En Proceso**

**PASO 1: Usuario accede a detalle de solicitud**
```
GET /Solicitudes/Show/{id}
→ Muestra botón "Cancelar" si estado permite cancelación
```

**PASO 2: Usuario hace click en "Cancelar"**
```csharp
POST /Solicitudes/CancelarSolicitud/{id}
Body: { Motivo: "Ya no es necesario el servicio" }

→ SolicitudesController.CancelarSolicitud(id, motivo)
```

**PASO 3: Validar que se puede cancelar**
```csharp
var solicitud = SolicitudService.GetById(id);

// Solo se puede cancelar si está en ciertos estados
var estadosPermitidos = new[] { 1, 2 }; // Pendiente, En Proceso

if (!estadosPermitidos.Contains(solicitud.EstadoId))
{
    return Json(new {
        success = false,
        message = "No se puede cancelar una solicitud en estado " + solicitud.Estado
    });
}

// Validar que el usuario sea el creador o admin
if (solicitud.UsuarioCreacion != GetCurrentUser().Id &&
    !HasProcesoPermiso("SOLALL_VER"))
{
    return Json(new {
        success = false,
        message = "No tiene permisos para cancelar esta solicitud"
    });
}
```

**PASO 4: Actualizar estado a Cancelada**
```sql
UPDATE Solicitud
SET EstadoId = 5, -- Cancelada
    Comentarios = CONCAT(Comentarios, '\nMotivo cancelación: ', @Motivo),
    FechaFinalizacion = GETDATE()
WHERE Id = @SolicitudId

-- Actualizar detalles
UPDATE SolicitudDetalle
SET EstadoId = 5 -- Cancelada
WHERE SolicitudId = @SolicitudId

-- Registrar en histórico
INSERT INTO SolicitudesHistoricoEstados (SolicitudId, EstadoAnterior, EstadoNuevo, Fecha, Usuario)
VALUES (@SolicitudId, @EstadoAnterior, 5, GETDATE(), @UsuarioId)
```

**PASO 5: Notificar cancelación**
```csharp
EmailService.SendInfoSolicitudMail(
    destinatario: usuario.Email,
    asunto: $"Solicitud {codSolicitud} cancelada",
    cuerpo: $@"
        Su solicitud ha sido cancelada.

        Motivo: {motivo}
    "
);
```

**CASO 2: Cancelación de Solicitud Registrada**

**PASO 1: Solicitar cancelación**
```csharp
POST /Solicitudes/SolicitarCancelacion/{id}
Body: { Motivo: "..." }

→ SolicitudesController.SolicitarCancelacion(id, motivo)
   ├─ Cambiar estado a "Pendiente Cancelación" (8)
   └─ Notificar a admins para aprobación
```

```sql
UPDATE Solicitud
SET EstadoId = 8, -- Pendiente Cancelación
    Comentarios = CONCAT(Comentarios, '\nSolicitud de cancelación: ', @Motivo)
WHERE Id = @SolicitudId
```

**PASO 2: Admin aprueba cancelación**
```csharp
POST /Solicitudes/AprobarCancelacion/{id}
→ SolicitudesController.AprobarCancelacion(id)
   ├─ Enviar cancelación a TMS/SLC:
   │  var cancelRequest = new {
   │      SolicitudId = id,
   │      IdSolicitudTMS = solicitud.IdSolicitudTMS,
   │      Motivo = motivo
   │  };
   │  await TMSService.CancelarSolicitud(cancelRequest);
   │
   ├─ Actualizar estado a "Cancelada" (5)
   └─ Notificar a solicitante
```

**PASO 3: Admin rechaza cancelación**
```csharp
POST /Solicitudes/RechazarCancelacion/{id}
Body: { Motivo: "No procede la cancelación" }

→ SolicitudesController.RechazarCancelacion(id, motivo)
   ├─ Revertir estado a "Registrada" (3)
   └─ Notificar a solicitante del rechazo
```

---

### 5.7 FLUJO 7: Reenvío de Solicitud con Error

**Objetivo:** Reintentar envío de solicitud que falló al enviarse a TMS/SLC

#### Cuando una Solicitud pasa a Estado "Error"

Causas comunes:
- Timeout en comunicación con TMS/SLC
- Datos incorrectos (origen/destino no encontrado)
- Servicio TMS/SLC caído temporalmente
- Validaciones fallidas en sistema externo

#### Paso a Paso Detallado

**PASO 1: Usuario identifica solicitud con error**
```
GET /Solicitudes/Index
→ Filtrar por EstadoId = 4 (Error)
→ Solicitudes con estado "Error" muestran botón "Reenviar"
```

**PASO 2: Usuario hace click en "Reenviar"**
```csharp
POST /Solicitudes/ReenviarSolicitud/{id}
→ SolicitudesController.ReenviarSolicitud(id)
```

**PASO 3: Validaciones previas**
```csharp
var solicitud = SolicitudService.GetById(id);

// Validar que esté en estado Error
if (solicitud.EstadoId != 4)
{
    return Json(new {
        success = false,
        message = "Solo se pueden reenviar solicitudes en estado Error"
    });
}

// Validar datos de la solicitud
var detalles = SolicitudDetalleService.ListAllBySolicitud(id);

// Verificar que origen y destino existan en sistemas externos
foreach (var detalle in detalles)
{
    if (detalle.ConcesionarioIdOrigen != null)
    {
        var origen = ConcesionarioService.GetById(detalle.ConcesionarioIdOrigen.Value);
        if (string.IsNullOrEmpty(origen.IdDireccionTMS))
        {
            return Json(new {
                success = false,
                message = $"El concesionario origen no tiene ID de TMS configurado"
            });
        }
    }
}
```

**PASO 4: Cambiar estado a "En Proceso"**
```sql
UPDATE Solicitud
SET EstadoId = 2, -- En Proceso
    Comentarios = CONCAT(Comentarios, '\nReenviado el ', GETDATE())
WHERE Id = @SolicitudId
```

**PASO 5: Reenviar a sistema externo**
```csharp
// Preparar mensaje (igual que en envío original)
var mensaje = PrepararMensajeTMS(solicitud, detalles);

// Enviar a Azure Service Bus
try
{
    await ServiceBus.SendAsync("tms", mensaje);

    return Json(new {
        success = true,
        message = "Solicitud reenviada correctamente. Espere confirmación."
    });
}
catch (Exception ex)
{
    // Si falla nuevamente, volver a estado Error
    SolicitudService.UpdateStatus(id, 4);

    DataBaseTracer.WriteLog(ex);

    return Json(new {
        success = false,
        message = $"Error al reenviar: {ex.Message}"
    });
}
```

**PASO 6: Esperar callback**
```
→ Si callback exitoso → Estado = Registrada
→ Si callback con error → Estado = Error (nuevamente)
```

#### Consulta SQL para Solicitudes con Error

```sql
-- Listar solicitudes con error de los últimos 7 días
SELECT
    s.Id,
    s.CodSolicitud,
    s.FechaCreacion,
    ts.Nombre AS TipoSolicitud,
    u.Nombre AS Solicitante,
    COUNT(sd.Id) AS TotalVehiculos,
    s.Comentarios
FROM Solicitud s
INNER JOIN Usuario u ON s.UsuarioCreacion = u.Id
LEFT JOIN TipoSolicitud ts ON s.TipoSolicitudId = ts.Id
LEFT JOIN SolicitudDetalle sd ON s.Id = sd.SolicitudId
WHERE s.EstadoId = 4 -- Error
  AND s.FechaBorrado IS NULL
  AND s.FechaCreacion >= DATEADD(DAY, -7, GETDATE())
GROUP BY s.Id, s.CodSolicitud, s.FechaCreacion, ts.Nombre, u.Nombre, s.Comentarios
ORDER BY s.FechaCreacion DESC
```

---

## 6. INTEGRACIONES EXTERNAS

El Portal BGB se integra con múltiples sistemas externos para gestionar el ciclo completo de vehículos. Esta sección documenta cada integración en detalle.

### 6.1 Arquitectura de Integraciones

```
┌───────────────────────────────────────────────────────────────┐
│                     PORTAL BGB (Core)                         │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │           Service Agents (Capa de Integración)          │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │ │
│  │  │APIMoveIT │ │  APITMS  │ │  APISLC  │ │  Email   │  │ │
│  │  └─────┬────┘ └─────┬────┘ └─────┬────┘ └─────┬────┘  │ │
│  └────────┼────────────┼────────────┼────────────┼────────┘ │
└───────────┼────────────┼────────────┼────────────┼──────────┘
            │            │            │            │
            │            │            │            │
     ┌──────▼──────┐ ┌──▼──────────┐ │      ┌────▼─────┐
     │   MoveIT    │ │Azure Service│ │      │  SMTP    │
     │   Gateway   │ │     Bus     │ │      │  Server  │
     │             │ │             │ │      └──────────┘
     │ SOAP + REST │ │   Queue     │ │
     └─────────────┘ │    "tms"    │ │
                     │    "slc"    │ │
                     └──────┬──────┘ │
                            │        │
                     ┌──────▼──────┐ │
                     │  TMS System │ │
                     │  (External) │ │
                     └─────────────┘ │
                                     │
                              ┌──────▼──────┐
                              │  SLC System │
                              │  (External) │
                              │   SOAP API  │
                              └─────────────┘
```

### 6.2 Integración con MoveIT Gateway

**Service Agent:** `Acerca-Portal-BMW.ServiceAgent.APIMoveIT`
**Propósito:** Consultar estado de vehículos en tiempo real y gestionar movimientos

#### Configuración (appsettings.json)

```json
{
  "BGBMoveIT": {
    "SoapURLMoveIT": "https://gateway.moveecar.io/bmw/bmwbgm/inbound-soap/{ENV}/BgbService",
    "TMSMoveitApi": "https://gateway.moveecar.io/bmw/bmwbgm/inbound-rest/{ENV}/",
    "MoveitToken": "2e6aecba-6279-4b39-a9b9-2547c6d28353",
    "CustomerExposedApi": "https://gateway.moveecar.io/customer-exposed/{ENV}/",
    "ENV": "TST"
  }
}
```

**Ambientes disponibles:**
- **TST** (Test): Desarrollo y pruebas
- **QAL** (Quality Assurance): Pre-producción
- **PRD** (Producción): Ambiente productivo

**URLs completas por ambiente:**
- TST: `https://gateway.moveecar.io/bmw/bmwbgm/inbound-soap/TST/BgbService`
- QAL: `https://gateway.moveecar.io/bmw/bmwbgm/inbound-soap/QAL/BgbService`
- PRD: `https://gateway.moveecar.io/bmw/bmwbgm/inbound-soap/PRD/BgbService`

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

## 9. GLOSARIO DE TÉRMINOS

### A

**Azure Service Bus**
Sistema de mensajería en la nube utilizado para comunicación asíncrona entre el Portal BGB y sistemas TMS/SLC. El portal envía mensajes a colas ("queues") y los sistemas externos los procesan.

**AllConcesionarios**
Campo booleano en Usuario. Si = 1, el usuario puede ver vehículos de todos los concesionarios. Si = 0, solo ve los concesionarios asignados explícitamente.

**APIMoveIT**
Service Agent para integración con la plataforma MoveIT Gateway. Proporciona métodos para consultar estado de vehículos en tiempo real.

**APITMS**
Service Agent para integración con el sistema TMS (Transport Management System) vía Azure Service Bus.

**APISLC**
Service Agent para integración con el sistema SLC (Supplier Logistic Client) vía SOAP.

### B

**Bastidor**
Ver **VIN**. Número de identificación único de un vehículo (17 caracteres). También llamado "número de bastidor" o "chasis".

**BGB**
BMW Gateway Barcelona. Nombre del portal.

**Buno**
Código BUNO (BMW Unique Number). Identificador único de concesionarios BMW.

### C

**Callback**
Llamada HTTP que sistemas externos (TMS, SLC, MoveIT) hacen al portal para notificar cambios de estado o completar operaciones asíncronas.

**Cesión**
Cambio de propietario/titularidad de un vehículo entre concesionarios. Puede incluir o no transporte físico del vehículo.

**Centro Logístico**
Ubicación donde se realizan servicios a vehículos. Los principales son:
- SANTANDER (norte)
- CIEMPOZUELOS (centro)

**Claims**
Información del usuario almacenada en el token de autenticación (ClaimsPrincipal). Incluye roles, permisos, concesionarios asignados, etc.

**ClaimsPrincipal**
Objeto que representa al usuario autenticado con todos sus claims (permisos, roles, configuración).

**Código HST**
Identificador de concesionarios/gestionarios. Contiene flags especiales:
- KOVP2: Requiere validación especial
- Cesion: Permite cesiones
- BloquearServicios: No permite servicios

**Concesionario**
Distribuidor oficial de vehículos BMW. Puede ser origen o destino de transportes/servicios.

**Cookie Authentication**
Sistema de autenticación del portal basado en cookies seguras. Cookie principal: "Acerca-BMW.Cookie".

### D

**Dapper**
Micro-ORM utilizado para acceso a datos. Permite ejecutar stored procedures y mapear resultados a objetos C#.

**Dead Letter Queue (DLQ)**
Cola especial en Azure Service Bus donde van mensajes que fallaron después de múltiples reintentos. Requiere intervención manual.

**Dirección Libre**
Dirección que NO es un concesionario registrado. Utilizada para entregas a talleres externos, particulares, etc.

**DTO (Data Transfer Object)**
Objeto utilizado para transferir datos entre capas. Ejemplos: VehiculoDTO, SolicitudDTO.

### E

**ENV (Environment)**
Ambiente de ejecución. Valores:
- TST (Test): Desarrollo
- QAL (Quality Assurance): Pre-producción
- PRD (Producción)

**ERD (Entity Relationship Diagram)**
Diagrama de relaciones entre entidades de base de datos.

**Estado de Solicitud**
Estado actual de una solicitud. Valores:
- 1: Pendiente
- 2: En Proceso
- 3: Registrada
- 4: Error
- 5: Cancelada
- 6: Pendiente Validación
- 7: Cancelada Validación
- 8: Pendiente Cancelación

### G

**GUID (Globally Unique Identifier)**
Identificador único global (128 bits). Formato: `8f3e4567-e89b-12d3-a456-426614174000`. Utilizado para IdSolicitudTMS, IdAgrupacion en SolicitudesDatosTemp.

**Grupo de Usuarios**
Agrupación lógica de usuarios con configuración común (concesionarios, cuentas de facturación, códigos HST).

### H

**HSTS (HTTP Strict Transport Security)**
Header de seguridad que fuerza conexiones HTTPS. Configurado por 365 días en el portal.

### I

**IdDireccionTMS**
Identificador de una dirección (concesionario) en el sistema TMS externo.

**IdDireccionSLC**
Identificador de una dirección (concesionario) en el sistema SLC externo.

**IdSolicitudTMS**
GUID que identifica la solicitud en el sistema TMS después de ser enviada.

**IdSolicitudSLC**
Código que identifica la solicitud en el sistema SLC después de ser enviada.

### J

**Junction Table**
Tabla intermedia en relaciones muchos-a-muchos (M:M). Ejemplos: UsuarioRol, UsuarioConcesionario.

### K

**Kendo UI**
Biblioteca de componentes UI de Telerik utilizada en el frontend. Incluye grids, datepickers, etc.

**KOVP2**
Flag especial en CodigoHST. Si = 1, los vehículos de ese código requieren autorización especial antes de transporte.

### M

**MoveIT Gateway**
Plataforma externa de BMW para gestión de movimientos de vehículos. Proporciona APIs SOAP y REST.

**Matricula**
Número de matrícula/placa del vehículo. Ejemplo: "ABC1234".

### O

**ORM (Object-Relational Mapping)**
Técnica para mapear datos de BD relacional a objetos. El portal usa Dapper (micro-ORM).

### P

**PDI (Pre-Delivery Inspection)**
Inspección previa a la entrega de un vehículo nuevo. Uno de los tipos de servicio más comunes.

**Permiso**
Acción que se puede realizar en un proceso. Valores:
- Ver (1): Lectura
- Editar (2): Escritura
- Usuario (3): Gestión de usuarios

**Proceso**
Módulo funcional del sistema. Ejemplos: Solicitudes, Vehículos, Usuarios. Puede tener estructura jerárquica (campo Padre).

### R

**RAC (Return Authorization Code)**
Código de autorización de retorno. Utilizado en reclamaciones y devoluciones.

**Razor Pages**
Tecnología de ASP.NET Core para crear vistas HTML con código C# embebido (.cshtml).

**Repository Pattern**
Patrón de diseño que encapsula acceso a datos. Cada entidad tiene su repositorio (UsuariosRepository, SolicitudesRepository, etc.).

**Rol**
Agrupación de permisos. Ejemplos: Admin, Usuario, Transportista. Un usuario puede tener múltiples roles.

**RolProcesoPermiso**
Relación ternaria que vincula Rol + Proceso + Permiso. Define qué roles pueden hacer qué acciones en qué módulos.

### S

**Service Agent**
Capa de integración que encapsula comunicación con sistemas externos. Ejemplos: APIMoveIT, APITMS, APISLC.

**Service Bus**
Ver **Azure Service Bus**.

**SLC (Supplier Logistic Client)**
Sistema externo para gestión de servicios logísticos (reparaciones, PDI, preparación).

**SOAP (Simple Object Access Protocol)**
Protocolo de comunicación basado en XML. Utilizado para integración con MoveIT y SLC.

**Soft Delete**
Borrado lógico. Los registros no se eliminan físicamente, se marcan con FechaBorrado != NULL.

**Solicitud**
Petición de servicio o transporte para uno o más vehículos. Tiene cabecera (Solicitud) y líneas (SolicitudDetalle).

**SolicitudDetalle**
Línea de solicitud. Cada línea representa un vehículo en la solicitud.

**Stored Procedure (SP)**
Procedimiento almacenado en SQL Server. Todas las operaciones de BD pasan por SPs. Ejemplos: SP_Usuarios_Login, SP_Solicitudes_Add.

### T

**TMS (Transport Management System)**
Sistema externo para gestión de transportes de vehículos.

**Trasiego**
Cambio de destino de un vehículo durante su transporte. Ejemplo: Vehículo iba de A→B pero se solicita que vaya de A→C.

**Tipo de Solicitud**
Categoría de solicitud:
- 1: Servicio (PDI, reparación, etc.)
- 2: Transporte
- 3: Mixta (servicio + transporte)

### V

**VIN (Vehicle Identification Number)**
Número de identificación único de un vehículo (17 caracteres). También llamado "bastidor". Ejemplo: "WBA12345678901234".

**VMO (View Model Object)**
Objeto utilizado para transferir datos entre controlador y vista. Ejemplos: UsuarioVMO, SolicitudVMO.

### W

**WCF (Windows Communication Foundation)**
Tecnología legacy de Microsoft para servicios web. Proyecto: WCFCoreServiceBMW.

---

## CONCLUSIÓN

Este manual proporciona documentación exhaustiva del Portal BGB (MoveIT) para un agente de IA con acceso de lectura a la base de datos. El agente puede utilizar este manual para:

✅ Entender la arquitectura completa del sistema
✅ Conocer el modelo de datos y relaciones
✅ Comprender los flujos de negocio críticos
✅ Diagnosticar problemas comunes
✅ Proporcionar consultas SQL útiles
✅ Explicar términos técnicos

**Información de contacto para escalación:**
- Administrador del sistema: [Pendiente]
- Equipo TMS: [Pendiente]
- Equipo SLC: [Pendiente]
- Equipo MoveIT: [Pendiente]

**Última actualización:** 16 de enero de 2026
**Versión del manual:** 1.0
**Rama Git:** Motorizacion

---

*Fin del Manual Técnico - Portal BGB (MoveIT)*

