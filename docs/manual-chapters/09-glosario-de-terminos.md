# Manual Portal BGB - GLOSARIO DE TÉRMINOS

_Capítulo 9 del Manual Técnico Portal BGB (MoveIT)_

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