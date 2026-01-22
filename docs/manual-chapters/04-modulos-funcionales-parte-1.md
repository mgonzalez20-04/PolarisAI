# Manual Portal BGB - MÓDULOS FUNCIONALES (Parte 1)

_Capítulo 4 - Secciones 4.1-4.7_

---

# Manual Portal BGB - MÓDULOS FUNCIONALES

_Capítulo 4 del Manual Técnico Portal BGB (MoveIT)_

---

## 4. MÓDULOS FUNCIONALES

---

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