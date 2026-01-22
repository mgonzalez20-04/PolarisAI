# 📧 Configuración n8n con Nueva Cuenta Outlook

## 🎯 Resumen

Esta guía te ayudará a configurar n8n para capturar correos desde **cualquier cuenta de Outlook** y enviarlos automáticamente a tu aplicación inbox-copilot vía webhook.

---

## ✅ Pre-requisitos

- ✅ n8n instalado y corriendo
- ✅ Credenciales de Microsoft Azure (Client ID, Client Secret, Tenant ID)
- ✅ Aplicación inbox-copilot corriendo en `http://localhost:3000`

---

## 🔧 Configuración Paso a Paso

### 1. Configurar Credenciales de Microsoft en n8n

1. Ve a **n8n → Credentials → Add Credential**
2. Busca **Microsoft Outlook**
3. Completa los datos:
   - **Client ID**: `e7f3f9c5-f2ec-489f-a413-2fa7c4fa149b`
   - **Client Secret**: `YOUR_AZURE_CLIENT_SECRET_HERE`
   - **Tenant ID**: `fd8cb27e-290a-493e-99fa-dc570e67692e`
4. Haz clic en **Connect my account**
5. **Inicia sesión con la NUEVA cuenta de Outlook** que quieres monitorizar
6. Autoriza los permisos solicitados
7. Guarda las credenciales

---

### 2. Crear Workflow de Sincronización

#### Opción A: Importar Workflow Existente

Si ya tienes el archivo `workflow-outlook-trigger.json` en tu proyecto:

1. Ve a **n8n → Workflows → Import from File**
2. Selecciona `workflow-outlook-trigger.json`
3. Actualiza el nodo de credenciales con las nuevas credenciales del paso 1
4. Activa el workflow

#### Opción B: Crear Workflow desde Cero

**Nodo 1: Email Trigger (Microsoft Outlook)**
```
Tipo: Trigger
Operación: When an email is received
Carpeta: Inbox
Credenciales: [Seleccionar las credenciales del paso 1]
Frecuencia: Cada 1 minuto
```

**Nodo 2: Procesar con IA (Opcional)**
```
Tipo: AI Agent / OpenAI
Prompt: "Analiza este email y extrae:
- category: bug|feature|question|support|other
- sentiment: positive|negative|neutral
- priority: low|medium|high|urgent
- tags: array de etiquetas relevantes
- summary: resumen breve

Email: {{$json.body}}"
```

**Nodo 3: HTTP Request - Enviar a Webhook**
```
Método: POST
URL: http://localhost:3000/api/n8n/webhook
Authentication: Header Auth
Headers:
  - x-api-key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ODFkOTM2Ni04NmMwLTQ3ZGYtYWY0OS1kODg5ZjFjMzhlY2YiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY4OTkwMTE5fQ.oO_EWiPfv7ZS2i7didM1kVaNdl_MjnZCtWuHKjtF9n0

Body (JSON):
{
  "messageId": "{{$json.id}}",
  "subject": "{{$json.subject}}",
  "from": "{{$json.from.name}} <{{$json.from.address}}>",
  "fromEmail": "{{$json.from.address}}",
  "to": "{{$json.toRecipients[0].address}}",
  "cc": "{{$json.ccRecipients[0]?.address}}",
  "receivedAt": "{{$json.receivedDateTime}}",
  "bodyPreview": "{{$json.bodyPreview}}",
  "bodyText": "{{$json.body.content}}",
  "bodyHtml": "{{$json.body.content}}",
  "aiCatalog": {
    "category": "{{$json.aiCategory || 'other'}}",
    "tags": {{$json.aiTags || []}},
    "summary": "{{$json.aiSummary || $json.bodyPreview}}",
    "sentiment": "{{$json.aiSentiment || 'neutral'}}",
    "priority": "{{$json.aiPriority || 'medium'}}"
  },
  "conversationId": "{{$json.conversationId}}",
  "hasAttachments": {{$json.hasAttachments}}
}
```

---

### 3. Probar el Workflow

1. Envía un correo de prueba a la cuenta de Outlook configurada
2. Espera 1 minuto (o ejecuta el workflow manualmente)
3. Verifica en n8n que el correo fue capturado y enviado
4. Verifica en tu aplicación que el correo aparece en el dashboard

---

## 🔍 Verificación

### Verificar webhook funciona:

```bash
curl -X POST http://localhost:3000/api/n8n/webhook \
  -H "x-api-key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ODFkOTM2Ni04NmMwLTQ3ZGYtYWY0OS1kODg5ZjFjMzhlY2YiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY4OTkwMTE5fQ.oO_EWiPfv7ZS2i7didM1kVaNdl_MjnZCtWuHKjtF9n0" \
  -H "Content-Type: application/json" \
  -d '{
    "messageId": "test123456789",
    "subject": "Test Email",
    "from": "Test User <test@example.com>",
    "fromEmail": "test@example.com",
    "to": "admin@inbox-copilot.com",
    "receivedAt": "2025-01-21T10:00:00Z",
    "bodyPreview": "This is a test email",
    "aiCatalog": {
      "category": "question",
      "sentiment": "neutral",
      "priority": "medium"
    }
  }'
```

**Respuesta esperada:**
```json
{
  "success": true,
  "emailId": "...",
  "messageId": "test123456789",
  "created": true,
  "message": "Email recibido y procesado correctamente"
}
```

---

## 🚨 Solución de Problemas

### Error: "Unauthorized"
- Verifica que el header `x-api-key` sea correcto
- Revisa que la API key en `.env.local` coincida

### Error: "Payload invalido"
- Verifica que el JSON tenga todos los campos requeridos
- Consulta el schema en `/src/app/api/n8n/webhook/route.ts`

### Los correos no llegan
- Verifica que el workflow esté activado en n8n
- Revisa los logs de ejecución en n8n
- Verifica que las credenciales de Outlook estén activas
- Comprueba que la cuenta de Outlook esté recibiendo correos

### Error: "User not found"
- El webhook crea usuarios automáticamente
- Verifica que el email receptor esté en el campo `to`

---

## 📊 Flujo Completo

```
┌─────────────┐
│   Outlook   │ Correo llega
│   (Nueva    │
│   Cuenta)   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│     n8n     │ Captura cada minuto
│  Workflow   │
└──────┬──────┘
       │
       ▼ Procesa con IA (opcional)
       │
       ▼
┌─────────────┐
│   Webhook   │ POST /api/n8n/webhook
│localhost:3000│
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Supabase   │ Guarda en PostgreSQL
│ (Database)  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Dashboard  │ Muestra correos
│   Next.js   │
└─────────────┘
```

---

## ✨ Ventajas de esta Arquitectura

✅ **Multi-cuenta**: n8n puede monitorizar múltiples cuentas simultáneamente
✅ **Seguro**: La app no necesita credenciales de Microsoft
✅ **Escalable**: n8n maneja la carga de sincronización
✅ **IA integrada**: Catalogación automática antes de guardar
✅ **Desacoplado**: Cambiar de cuenta es solo actualizar n8n

---

## 📝 Credenciales de Acceso

**Aplicación Web:**
- URL: http://localhost:3000
- Usuario: `admin`
- Password: `admin`

**Webhook API:**
- URL: `http://localhost:3000/api/n8n/webhook`
- API Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

---

## 🎉 ¡Listo!

Ahora tu aplicación está configurada para recibir correos de cualquier cuenta de Outlook a través de n8n. Solo necesitas configurar las credenciales en n8n y activar el workflow.

**Próximos pasos:**
1. Configura n8n con la nueva cuenta de Outlook (Paso 1)
2. Activa el workflow de sincronización (Paso 2)
3. Envía un correo de prueba (Paso 3)
4. Accede al dashboard y verifica que aparece

¿Necesitas ayuda? Revisa la sección de solución de problemas o contacta con soporte.
