# Migración Completada: OAuth → n8n Workflows

## 📋 Resumen

Tu aplicación ha sido migrada exitosamente de un modelo de sincronización manual con OAuth de Microsoft a un modelo automatizado donde **n8n** orquesta todo el flujo de correos.

### Antes (OAuth Manual)
```
Usuario → Click "Sync" → OAuth Microsoft → Microsoft Graph API → App DB
```

### Ahora (n8n Automático)
```
n8n Schedule → Microsoft Graph → IA Analysis → Webhook → App DB
     ↓
 Cada 5 min
```

---

## ✅ Cambios Implementados

### Backend
- ✅ Webhook endpoint creado: `/api/n8n/webhook`
- ✅ Autenticación simplificada a email/password
- ✅ Sistema OAuth eliminado
- ✅ Modelo `Account` eliminado de Prisma
- ✅ Funciones de sincronización manual eliminadas

### Frontend
- ✅ Botones "Sincronizar Correos" y "Sincronizar Carpetas" eliminados
- ✅ Mensajes actualizados: "Los correos se sincronizan automáticamente cada 5 minutos"
- ✅ Página de login actualizada sin referencias a Microsoft OAuth

### Dependencias
- ✅ `@microsoft/microsoft-graph-client` eliminada
- ✅ `@auth/prisma-adapter` eliminada

---

## 📂 Archivos Creados

### 1. Webhook Backend
- `src/app/api/n8n/webhook/route.ts` - Endpoint principal
- `src/lib/n8n/webhook-helpers.ts` - Funciones auxiliares

### 2. Documentación n8n
- `docs/n8n-workflow-guide.md` - Guía completa paso a paso
- `docs/n8n-email-sync-workflow.json` - Workflow exportable para importar
- `docs/QUICK_START_N8N.md` - Guía rápida de 5 minutos
- `docs/N8N_MIGRATION_README.md` - Este archivo

---

## 🚀 Cómo Empezar

### Opción 1: Quick Start (15 minutos)

Sigue la guía rápida:
```bash
cat docs/QUICK_START_N8N.md
```

Pasos rápidos:
1. Crear App Registration en Azure (5 min)
2. Configurar credenciales en n8n (3 min)
3. Importar workflow desde `n8n-email-sync-workflow.json` (2 min)
4. Testear y activar (5 min)

### Opción 2: Guía Completa

Para una configuración detallada con optimizaciones:
```bash
cat docs/n8n-workflow-guide.md
```

---

## 🔧 Configuración Técnica

### Webhook Endpoint

**URL**: `POST /api/n8n/webhook`

**Headers requeridos**:
```http
Content-Type: application/json
x-api-key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Payload esperado**:
```json
{
  "messageId": "AAMkADtest123",
  "subject": "Error en la aplicación",
  "from": "Juan Perez",
  "fromEmail": "juan.perez@cliente.com",
  "to": "soporte@tuempresa.com",
  "receivedAt": "2025-01-21T10:30:00Z",
  "bodyText": "Hola, tengo un problema...",
  "bodyPreview": "Hola, tengo un problema...",
  "aiCatalog": {
    "category": "bug",
    "tags": ["app-loading", "critical"],
    "summary": "Usuario reporta fallo al cargar la app",
    "sentiment": "negative",
    "priority": "high"
  },
  "conversationId": "AAQkADtest-conversation",
  "hasAttachments": false
}
```

**Respuesta exitosa (200)**:
```json
{
  "success": true,
  "emailId": "cm5x1y2z3...",
  "messageId": "AAMkADtest123",
  "userId": "cm5x1y2z3...",
  "created": true,
  "message": "Email recibido y procesado correctamente"
}
```

### Variables de Entorno

Asegúrate de tener en `.env.local`:
```bash
# n8n Webhook Integration
N8N_WEBHOOK_API_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ODFkOTM2Ni04NmMwLTQ3ZGYtYWY0OS1kODg5ZjFjMzhlY2YiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY4OTg2MTc1fQ.MUnqI4spNWfPgCwU7eFo8XzSjBB81EEf_vBZaaDV0b0"
```

---

## 🧪 Testing

### Test Manual del Webhook

```bash
curl -X POST http://localhost:3000/api/n8n/webhook \
  -H "Content-Type: application/json" \
  -H "x-api-key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "messageId": "AAMkADtest123456789",
    "subject": "Test Email",
    "from": "Test User",
    "fromEmail": "test@example.com",
    "to": "soporte@tuempresa.com",
    "receivedAt": "2025-01-21T10:30:00Z",
    "bodyText": "This is a test email",
    "aiCatalog": {
      "category": "question",
      "tags": ["test"],
      "summary": "Test email",
      "sentiment": "neutral",
      "priority": "low"
    }
  }'
```

### Test del Workflow n8n

1. En n8n, abrir el workflow **"Email Sync - Microsoft to App"**
2. Click derecho en el primer nodo → **"Execute Workflow"**
3. Verificar que todos los nodos se ejecutan correctamente
4. Revisar logs en la aplicación Next.js

---

## 📊 Arquitectura del Workflow n8n

```mermaid
graph TD
    A[Schedule Trigger<br/>Cada 5 min] --> B[Get Emails<br/>Microsoft Graph API]
    B --> C[Split In Batches<br/>10 correos]
    C --> D[OpenAI Analysis<br/>Categorizar con IA]
    D --> E[Transform Data<br/>Mapear formato]
    E --> F[Send to Webhook<br/>POST a la app]
    F --> G{Success?}
    G -->|Yes| H[Success<br/>Log OK]
    G -->|No| I[Error<br/>Log Error]
    H --> J{Batch<br/>Complete?}
    I --> J
    J -->|No| C
    J -->|Yes| K[End]
```

---

## 🔍 Monitoreo y Logs

### Logs en n8n

Ver ejecuciones:
1. n8n → **Executions** tab
2. Click en una ejecución para ver detalles
3. Revisar cada nodo para debugging

### Logs en la Aplicación

En la consola de Next.js verás:
```
Email processed via n8n webhook: cm5x1y2z3... (AAMkADtest123)
  Subject: Error en la aplicación
  Category: bug
  Sentiment: negative
  Priority: high
```

### Errores Comunes

**401 Unauthorized (Microsoft Graph)**:
- Reconectar credencial OAuth2 en n8n
- Verificar permisos en Azure AD

**Invalid JSON (OpenAI)**:
- Revisar prompt en el nodo OpenAI
- Aumentar temperature a 0.5

**API key invalida (Webhook)**:
- Verificar `N8N_WEBHOOK_API_KEY` en n8n variables
- Verificar `.env.local` en la app

---

## 🎯 Funcionalidades Clave

### Catalogación Automática con IA

La IA analiza cada correo y extrae:
- **Categoría**: bug | feature | question | support | other
- **Tags**: Palabras clave relevantes
- **Summary**: Resumen breve del correo
- **Sentiment**: positive | negative | neutral
- **Priority**: low | medium | high | urgent

### Creación Automática de Usuarios

Si llega un correo a un email no registrado:
- ✅ Se crea un usuario automáticamente
- ✅ Email: del campo `to`
- ✅ Name: extraído del remitente
- ✅ Role: "user"
- ✅ Sin password (solo recibe correos)

### Idempotencia

- ✅ Si el mismo correo llega dos veces (por `messageId`)
- ✅ Se actualiza en lugar de duplicar
- ✅ Solo se modifican campos mutables (isRead, status, categories)

---

## 🛠️ Mantenimiento

### Cambiar Frecuencia de Sincronización

En n8n, editar el nodo **"Every 5 Minutes"**:
- Cada 1 minuto: `* * * * *`
- Cada 5 minutos: `*/5 * * * *` ← Recomendado
- Cada 10 minutos: `*/10 * * * *`
- Cada hora: `0 * * * *`

### Actualizar Modelo de IA

En n8n, editar el nodo **"OpenAI - Analyze Email"**:
- `gpt-4o-mini` ← Recomendado (rápido y barato)
- `gpt-4o` (más preciso)
- `gpt-3.5-turbo` (más económico)

### Filtrar Correos Específicos

En n8n, editar el query parameter `$filter` del nodo **"Get Emails"**:

**Solo no leídos**:
```
receivedDateTime ge {{ $now.minus({minutes: 10}).toISO() }} and isRead eq false
```

**Solo de remitentes específicos**:
```
receivedDateTime ge {{ $now.minus({minutes: 10}).toISO() }} and from/emailAddress/address eq 'cliente@example.com'
```

---

## 🔐 Seguridad

### API Key de n8n

- ✅ Almacenada en variable de entorno
- ✅ Validada en cada request
- ✅ Rechaza requests sin key (401 Unauthorized)

### Validación de Payload

- ✅ Schema validation con Zod
- ✅ Validación de formatos de email
- ✅ Validación de messageId
- ✅ Sanitización de datos

### Idempotencia

- ✅ Evita duplicados por messageId
- ✅ Operaciones atómicas con upsert
- ✅ No hay race conditions

---

## 📈 Optimizaciones Futuras

### 1. Rate Limiting
Agregar límite de requests al webhook:
```typescript
// En el webhook route.ts
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, "1 m"),
});
```

### 2. Caché de Análisis IA
Evitar analizar el mismo correo dos veces:
- Guardar análisis en Redis o PostgreSQL
- Key: hash del bodyPreview
- TTL: 7 días

### 3. Webhooks Bidireccionales
Notificar a n8n cuando se actualiza un correo:
- Endpoint: `POST /api/n8n/email-updated`
- Payload: { emailId, updates }
- n8n puede sincronizar cambios de vuelta a Microsoft

### 4. Notificaciones
Alertas cuando falla el workflow:
- Slack webhook en el branch "Error"
- Email notification
- Discord webhook

---

## 📚 Recursos

### Documentación
- `docs/n8n-workflow-guide.md` - Guía completa
- `docs/QUICK_START_N8N.md` - Quick start de 5 min
- `docs/n8n-email-sync-workflow.json` - Workflow exportable

### APIs
- [Microsoft Graph API](https://learn.microsoft.com/en-us/graph/api/user-list-messages)
- [n8n Documentation](https://docs.n8n.io)
- [OpenAI API](https://platform.openai.com/docs)

### Soporte
- Issues en el repo
- Logs en n8n → Executions
- Logs en Next.js console

---

## ✅ Checklist de Migración

### Completado
- [x] Webhook endpoint creado y testeado
- [x] Sistema OAuth eliminado
- [x] UI actualizada sin botones de sync
- [x] Página de login actualizada
- [x] Dependencias OAuth eliminadas
- [x] Documentación completa creada
- [x] Workflow n8n diseñado y exportado

### Pendiente
- [ ] Migración de base de datos (ejecutar `npm run db:push`)
- [ ] Configurar App Registration en Azure
- [ ] Configurar credenciales en n8n
- [ ] Importar workflow en n8n
- [ ] Testear workflow end-to-end
- [ ] Activar workflow automático

---

## 🎉 Resultado Final

### Lo que cambió
- ❌ Ya NO hay botones de sincronización manual
- ❌ Ya NO necesitas OAuth directo a Microsoft
- ✅ Los correos llegan automáticamente cada 5 minutos
- ✅ Cada correo viene catalogado por IA
- ✅ Usuarios se crean automáticamente

### Lo que se mantiene
- ✅ Dashboard con todos los correos
- ✅ Sistema de tags y filtros
- ✅ Agente IA conversacional
- ✅ Casos y base de conocimientos
- ✅ Analytics y métricas

---

**Fecha de migración**: 21 de Enero de 2025
**Versión**: 0.9.0-beta → 1.0.0 (próximo release)
