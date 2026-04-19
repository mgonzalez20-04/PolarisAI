# Configuración de Sincronización de Carpetas de Soporte

Este documento describe los pasos necesarios para configurar la sincronización de carpetas desde el buzón de correo `soporte@iodigital.es`.

## Contexto

La aplicación PolarisAI sincroniza las carpetas del buzón de soporte de Microsoft 365 para mostrar la estructura de carpetas del correo en el dashboard.

## Requisitos Previos

1. **Acceso al buzón de soporte**: Necesitas las credenciales de `soporte@iodigital.es`
2. **Base de datos PostgreSQL configurada**: El `.env.local` debe tener la conexión a la base de datos de producción
3. **Credenciales de Microsoft Azure AD**: Ya configuradas en el `.env.local`

## Pasos de Configuración

### 1. Verificar Configuración de Autenticación

Asegúrate de que el archivo `src/auth.ts` incluye los permisos necesarios para acceder a buzones compartidos:

```typescript
MicrosoftEntraID({
  clientId: process.env.MICROSOFT_CLIENT_ID!,
  clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
  issuer: `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID}/v2.0`,
  authorization: {
    params: {
      scope: "openid profile email offline_access Mail.Read Mail.ReadWrite Mail.Read.Shared Mail.ReadWrite.Shared MailboxSettings.Read",
    },
  },
}),
```

**Permisos importantes:**
- `Mail.Read.Shared` - Leer correos de buzones compartidos
- `Mail.ReadWrite.Shared` - Escribir en buzones compartidos

### 2. Verificar Variables de Entorno

Tu archivo `.env.local` debe contener:

```env
# Database (PostgreSQL en prod.server.iodigital.es)
DATABASE_URL="postgresql://user:password@servidor:5432/database"

# NextAuth (v5 usa AUTH_SECRET)
AUTH_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:3000"

# Microsoft/Azure AD - REQUIRED FOR MICROSOFT LOGIN
MICROSOFT_CLIENT_ID="your-client-id"
MICROSOFT_CLIENT_SECRET="your-client-secret"
MICROSOFT_TENANT_ID="your-tenant-id"
```

**Nota**: Las credenciales reales están en el archivo `.env.local` del proyecto (no versionado en git).

### 3. Ejecutar el Proyecto

```bash
# Instalar dependencias (si es necesario)
npm install

# Ejecutar en modo desarrollo
npm run dev
```

El servidor se iniciará en `http://localhost:3000`

### 4. Iniciar Sesión con el Buzón de Soporte

**IMPORTANTE**: Debes iniciar sesión con la cuenta `soporte@iodigital.es`, NO con tu cuenta personal.

1. Abre `http://localhost:3000` en tu navegador
2. Haz clic en **"Sign in with Microsoft"**
3. Introduce las credenciales:
   - **Email**: `soporte@iodigital.es`
   - **Contraseña**: (La contraseña del buzón de soporte)
4. Acepta los permisos cuando se soliciten

### 5. Sincronizar Carpetas

Una vez iniciada sesión:

1. Verás el dashboard principal
2. En la barra lateral izquierda, en la sección de **"Gestionar carpetas"**, verás un botón **"Sincronizar carpetas"**
3. Haz clic en **"Sincronizar carpetas"**
4. Espera unos segundos mientras se descargan las carpetas desde Microsoft Graph
5. Las carpetas del buzón `soporte@iodigital.es` aparecerán en la lista

### 6. Verificar Sincronización

Deberías ver carpetas como:
- Bandeja de entrada
- Elementos enviados
- Borradores
- Archivo
- Elementos eliminados
- (Y cualquier otra carpeta personalizada que tenga el buzón)

## Cómo Funciona la Sincronización

### Detección Automática del Buzón

El código detecta automáticamente de qué buzón obtener las carpetas:

```typescript
// Si es soporte@iodigital.es, usa /me, sino usa /users/soporte@iodigital.es
const endpoint = userEmail === "soporte@iodigital.es"
  ? "https://graph.microsoft.com/v1.0/me/mailFolders"
  : `https://graph.microsoft.com/v1.0/users/soporte@iodigital.es/mailFolders`;
```

- Si inicias sesión con `soporte@iodigital.es` → usa `/me/mailFolders` (acceso directo)
- Si inicias sesión con otra cuenta → intenta acceder a `/users/soporte@iodigital.es/mailFolders` (requiere permisos compartidos)

### API de Sincronización

El endpoint `/api/folders` (método POST) realiza:

1. Verifica que el usuario esté autenticado
2. Verifica que tenga un access token de Microsoft
3. Llama a Microsoft Graph API para obtener las carpetas
4. Sincroniza las carpetas con la base de datos PostgreSQL
5. Retorna la lista actualizada de carpetas

## Solución de Problemas

### Error: "No access token available"

**Causa**: No has iniciado sesión con Microsoft o la sesión expiró.

**Solución**:
1. Cierra sesión
2. Vuelve a iniciar sesión con `soporte@iodigital.es`

### Error: "Failed to fetch folders from Microsoft Graph"

**Causa**: El access token no tiene permisos o expiró.

**Soluciones**:
1. Verifica que los permisos en Azure AD estén configurados correctamente
2. Cierra sesión y vuelve a iniciar sesión para obtener un nuevo token
3. Verifica que la cuenta `soporte@iodigital.es` existe y está activa

### Las carpetas no aparecen

**Soluciones**:
1. Abre la consola del navegador (F12) y busca errores
2. Verifica los logs del servidor en la terminal
3. Intenta hacer clic en "Sincronizar carpetas" nuevamente

### Error de permisos en Azure AD

Si ves errores relacionados con permisos:

1. Ve al [Azure Portal](https://portal.azure.com)
2. Navega a **Azure Active Directory** > **App registrations**
3. Busca tu aplicación (usando el CLIENT_ID)
4. Ve a **API permissions**
5. Verifica que tienes:
   - `Mail.Read.Shared`
   - `Mail.ReadWrite.Shared`
6. Haz clic en **"Grant admin consent"** si no está marcado como concedido

## Archivos Modificados

Para esta funcionalidad se modificaron los siguientes archivos:

1. **`src/auth.ts`**
   - Agregado `accessToken` a la sesión
   - Agregados permisos `Mail.Read.Shared` y `Mail.ReadWrite.Shared`

2. **`src/app/api/folders/route.ts`**
   - Implementado método POST para sincronización
   - Conecta con Microsoft Graph API
   - Sincroniza carpetas con la base de datos

3. **`src/components/folder-navigation.tsx`**
   - Agregado botón "Sincronizar carpetas"
   - Agregada función `syncFolders()`
   - Agregado estado de loading durante la sincronización

## Notas Adicionales

- **Frecuencia de sincronización**: Manual (el usuario debe hacer clic en el botón)
- **Cache**: Las carpetas se cachean en la base de datos
- **Actualización**: Se recomienda sincronizar cada vez que se creen nuevas carpetas en Outlook
- **Permisos**: Solo los usuarios autenticados pueden sincronizar carpetas

## Siguientes Pasos (Opcional)

Para mejorar la experiencia, se podría:

1. **Sincronización automática**: Agregar un cron job que sincronice cada X minutos
2. **Webhooks**: Usar Microsoft Graph webhooks para recibir notificaciones de cambios
3. **Indicador visual**: Mostrar última fecha de sincronización
4. **Sincronización incremental**: Solo actualizar carpetas que cambiaron
