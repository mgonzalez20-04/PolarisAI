# Manual Portal BGB - FLUJOS DE NEGOCIO CRÍTICOS (Parte 1)

_Capítulo 5 - Secciones 5.1-5.2_

---

# Manual Portal BGB - FLUJOS DE NEGOCIO CRÍTICOS

_Capítulo 5 del Manual Técnico Portal BGB (MoveIT)_

---

## 5. FLUJOS DE NEGOCIO CRÍTICOS

Esta sección documenta los flujos completos paso a paso de las operaciones más importantes del sistema. Para cada flujo se incluye:
- Diagrama de secuencia
- Pasos detallados con validaciones
- Tablas afectadas y operaciones SQL
- Estados y transiciones
- Puntos de integración con sistemas externos

---

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