# Manual Portal BGB - FLUJOS DE NEGOCIO CRÍTICOS (Parte 2)

_Capítulo 5 - Secciones 5.3-5.7_

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