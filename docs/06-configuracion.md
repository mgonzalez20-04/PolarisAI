# Configuración y Ajustes

## Acceder a la configuración

1. Haz clic en tu nombre de usuario o avatar en la parte superior derecha
2. Selecciona **"Configuración"** o **"Settings"**
3. Verás las diferentes secciones de configuración disponibles

## Cuenta y perfil

### Información personal
- **Nombre**: Tu nombre completo
- **Email**: Dirección de correo (no se puede cambiar después del registro)
- **Avatar**: Imagen de perfil (sincronizada con tu cuenta de Microsoft/Google si usas OAuth)

### Cambiar contraseña
Si creaste tu cuenta con email y contraseña:
1. Ve a **Cuenta** → **Seguridad**
2. Haz clic en **"Cambiar contraseña"**
3. Ingresa tu contraseña actual
4. Ingresa la nueva contraseña (mínimo 8 caracteres)
5. Confirma la nueva contraseña
6. Guarda los cambios

### Autenticación
El sistema soporta múltiples métodos de autenticación:
- **Microsoft Entra ID (Azure AD)**: Para organizaciones empresariales
- **Google**: Cuenta personal o de workspace
- **GitHub**: Para desarrolladores
- **Credenciales**: Email y contraseña tradicional

## Preferencias del usuario

### Agrupación de emails
- **Agrupar emails del mismo hilo**: Activa/desactiva la agrupación de conversaciones
- Si está activo, emails con el mismo `conversationId` aparecen agrupados

### Carpetas visibles
- Selecciona qué carpetas de tu buzón quieres ver en el dashboard
- Oculta carpetas que no uses (Spam, Borradores, etc.)
- Cambia el orden de las carpetas

### Idioma de la interfaz
- Español (por defecto)
- Inglés
- Otros idiomas (según disponibilidad)

### Zona horaria
- Configura tu zona horaria para mostrar fechas correctamente
- Afecta cómo se muestran las fechas de recepción de emails

## Configuración de sincronización

### Microsoft 365 / Outlook

#### Conectar cuenta
1. Ve a **Configuración** → **Integraciones**
2. Haz clic en **"Conectar Microsoft 365"**
3. Inicia sesión con tu cuenta de Microsoft
4. Autoriza los permisos necesarios:
   - Leer emails
   - Leer estructura de carpetas
   - Leer perfil básico

#### Frecuencia de sincronización
- **Automática**: Sincroniza cada 5-15 minutos (configurable)
- **Manual**: Solo sincroniza cuando haces clic en "Sincronizar"

#### Sincronización inicial
La primera sincronización puede tardar varios minutos dependiendo de:
- Cantidad de emails en tu buzón
- Rango de fechas configurado (últimos 30 días por defecto)
- Velocidad de la API de Microsoft Graph

#### Permisos OAuth
Los permisos solicitados son:
- `Mail.Read`: Leer emails
- `Mail.ReadBasic`: Información básica de emails
- `MailboxSettings.Read`: Configuración del buzón
- `User.Read`: Información básica del perfil

### Desconectar cuenta
1. Ve a **Configuración** → **Integraciones**
2. Haz clic en **"Desconectar"** junto a tu cuenta de Microsoft
3. Confirma la desconexión

**Advertencia**: Desconectar la cuenta no elimina los emails ya sincronizados

## Configuración del agente de IA

### Habilitar/Deshabilitar el agente
1. Ve a **Configuración** → **Agente IA**
2. Activa o desactiva las funcionalidades:
   - **Sugerencias automáticas**: Muestra sugerencias al abrir emails
   - **Chat interactivo**: Permite chatear con el agente
   - **RAG (Búsqueda en conocimientos)**: Busca en la base de conocimientos

### Configuración de RAG

#### Base de conocimientos
- **Habilitado**: Activa/desactiva búsqueda en documentación
- **Top K**: Cuántos documentos recuperar (default: 5)
- **Similitud mínima**: Umbral de similitud (0-1, default: 0.75)

#### Casos históricos
- **Habilitado**: Activa/desactiva búsqueda en casos resueltos
- **Top K**: Cuántos casos recuperar (default: 10)
- **Confianza mínima**: Umbral de confianza (0-1, default: 0.7)

#### Conversaciones
- **Habilitado**: Activa/desactiva búsqueda en historial de conversaciones
- **Top K**: Cuántos mensajes recuperar (default: 5)

### Modelos de IA

#### Modelo rápido (tareas simples)
- **Claude 3.5 Haiku** (default): Rápido y económico
- Usado para: búsquedas, clasificación, resúmenes cortos

#### Modelo de calidad (tareas complejas)
- **Claude 3.5 Sonnet** (default): Mayor calidad
- Usado para: generación de respuestas, razonamiento complejo

### Umbral de resumen
- **Token threshold**: Cuándo resumir conversaciones largas (default: 8000 tokens)
- Conversaciones más largas se resumen automáticamente para ahorrar costos

### Streaming
- **Habilitado**: Las respuestas aparecen progresivamente (como ChatGPT)
- **Deshabilitado**: Espera la respuesta completa antes de mostrarla

## Notificaciones

### Notificaciones de email
- **Nuevos emails**: Notificación cuando llega un email nuevo
- **Emails de alta prioridad**: Notificación inmediata para prioridad alta/urgente
- **Menciones**: Cuando alguien te menciona en un email

### Notificaciones del sistema
- **Actualizaciones**: Cuando hay nuevas funcionalidades
- **Mantenimiento**: Avisos de mantenimiento programado
- **Errores de sincronización**: Si la sincronización falla

### Canales de notificación
- **En la aplicación**: Banner dentro de la app
- **Email**: Envío de notificaciones por correo
- **Push notifications**: Notificaciones del navegador (requiere permiso)

## Configuración de administrador

Solo disponible para usuarios con rol "admin".

### Gestión de usuarios
- Ver lista de todos los usuarios
- Crear nuevos usuarios
- Desactivar/eliminar usuarios
- Cambiar roles (user/admin)

### Configuración global

#### Límites de uso
- **Max emails por sincronización**: Límite de emails a sincronizar
- **Max tokens por conversación**: Límite de tokens antes de forzar resumen
- **Rate limiting**: Límite de requests a la API

#### APIs y claves

##### OpenAI API
- **API Key**: Para generar embeddings
- **Modelo de embeddings**: text-embedding-3-small (1536 dim)

##### Anthropic API
- **API Key**: Para el agente Claude
- **Modelos disponibles**: Haiku, Sonnet, Opus

##### Microsoft Graph API
- **Client ID**: ID de aplicación Azure
- **Client Secret**: Secret de aplicación Azure
- **Tenant ID**: ID del tenant de Microsoft

### Gestión de base de conocimientos
- Subir documentos en batch
- Editar documentos existentes
- Eliminar documentos obsoletos
- Regenerar embeddings

### Analytics y métricas
- **Token usage**: Uso de tokens por usuario y período
- **API costs**: Costos de API (OpenAI + Anthropic)
- **Response times**: Tiempos de respuesta del agente
- **User activity**: Actividad por usuario
- **Popular queries**: Preguntas más frecuentes al agente

## Seguridad y privacidad

### Seguridad de la cuenta

#### Autenticación de dos factores (2FA)
1. Ve a **Cuenta** → **Seguridad**
2. Haz clic en **"Configurar 2FA"**
3. Escanea el código QR con tu app de autenticación (Google Authenticator, Authy, etc.)
4. Ingresa el código de verificación
5. Guarda los códigos de recuperación en un lugar seguro

#### Sesiones activas
- Ver todas las sesiones activas
- Ubicación y dispositivo de cada sesión
- Cerrar sesiones remotamente si es necesario

### Privacidad de datos

#### Datos almacenados
El sistema almacena:
- Emails sincronizados de tu buzón
- Conversaciones con el agente
- Casos y soluciones documentadas
- Embeddings (representaciones vectoriales de texto)
- Métricas de uso anónimas

#### Datos NO almacenados
- Contraseñas (solo hashes bcrypt)
- Tokens OAuth (refrescados automáticamente)
- Contenido de emails eliminados de tu buzón original

#### Retención de datos
- **Emails**: Se conservan mientras estén en tu cuenta de Microsoft
- **Conversaciones**: Se conservan indefinidamente (puedes eliminarlas manualmente)
- **Casos**: Se conservan indefinidamente (para aprendizaje del agente)
- **Métricas**: Se agregan mensualmente después de 90 días

### Exportar datos
1. Ve a **Cuenta** → **Datos**
2. Haz clic en **"Exportar mis datos"**
3. Selecciona qué datos exportar:
   - Emails
   - Conversaciones
   - Casos
   - Métricas
4. Recibirás un archivo JSON con toda tu información

### Eliminar cuenta
1. Ve a **Cuenta** → **Eliminar cuenta**
2. Lee las advertencias (esta acción es irreversible)
3. Ingresa tu contraseña para confirmar
4. Todos tus datos serán eliminados permanentemente

**Advertencia**: Eliminar tu cuenta borra:
- Todos tus emails sincronizados
- Todas tus conversaciones con el agente
- Todos tus casos documentados
- Todas tus etiquetas personalizadas
- Todas tus preferencias

## Solución de problemas

### La sincronización no funciona

**Posibles causas**:
1. **Token de OAuth expirado**: Desconecta y vuelve a conectar tu cuenta de Microsoft
2. **Permisos insuficientes**: Revisa que hayas autorizado todos los permisos necesarios
3. **Buzón lleno**: Microsoft limita requests si tienes miles de emails
4. **Problemas de red**: Verifica tu conexión a internet

**Solución**:
1. Ve a **Configuración** → **Integraciones**
2. Desconecta tu cuenta de Microsoft
3. Vuelve a conectar y autoriza todos los permisos
4. Intenta sincronizar manualmente

### El agente no responde o da errores

**Posibles causas**:
1. **API key inválida o caducada**: El administrador debe renovar las API keys
2. **Límite de rate excedido**: Has hecho demasiados requests en poco tiempo
3. **Servicio de Claude caído**: Problema temporal de Anthropic

**Solución**:
1. Espera unos minutos y vuelve a intentar
2. Si persiste, contacta con el administrador
3. Verifica el estado del servicio en status.anthropic.com

### Las sugerencias no son relevantes

**Posibles causas**:
1. **Pocos casos documentados**: El sistema necesita más datos para aprender
2. **Casos sin embeddings**: Los embeddings pueden no haberse generado
3. **Problema nuevo**: No hay casos similares en el historial

**Solución**:
1. Documenta más casos con notas de resolución detalladas
2. El administrador puede regenerar embeddings desde la configuración
3. Usa el chat interactivo para preguntas más específicas

### Emails duplicados

**Causa**: La sincronización se ejecutó múltiples veces para el mismo período

**Solución**:
1. No debería ocurrir (el sistema usa `messageId` único)
2. Si ocurre, contacta con el administrador
3. Se puede ejecutar un script de limpieza para eliminar duplicados

## Mejores prácticas de configuración

1. **Activa 2FA**: Mayor seguridad para tu cuenta
2. **Configura carpetas visibles**: Oculta carpetas innecesarias para reducir ruido
3. **Ajusta umbral de resumen**: Si tienes conversaciones muy largas, baja el umbral
4. **Revisa permisos regularmente**: Asegúrate que la conexión con Microsoft esté activa
5. **Exporta datos periódicamente**: Backup de tu información importante
6. **Actualiza documentación**: Mantén la base de conocimientos actualizada

## Preguntas frecuentes

**¿Puedo conectar múltiples cuentas de email?**
Actualmente solo puedes conectar una cuenta de Microsoft 365 por usuario.

**¿Los cambios en configuración afectan emails ya procesados?**
No, los cambios solo afectan nuevos emails y futuras interacciones con el agente.

**¿Puedo revertir cambios en la configuración?**
Sí, simplemente vuelve a cambiar la configuración al valor anterior.

**¿Qué pasa si cambio el modelo de IA?**
Los cambios se aplican inmediatamente a nuevas conversaciones. Conversaciones existentes mantienen el modelo usado originalmente.

**¿Cómo sé si mis API keys están funcionando?**
Ve a la sección de **Health** en configuración del administrador para ver el estado de las integraciones.
