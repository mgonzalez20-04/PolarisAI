# Manual Portal BGB - ARQUITECTURA GENERAL DEL SISTEMA

_Capítulo 2 del Manual Técnico Portal BGB (MoveIT)_

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