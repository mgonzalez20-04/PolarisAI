# ✅ Checklist de Verificación del Workflow n8n

## 🎯 Objetivo
Este documento te ayuda a verificar que **TODOS** los componentes del workflow están configurados correctamente antes de activarlo.

---

## 📋 Checklist General

### ✅ 1. Variables de Entorno (.env.local)

**Archivo**: `.env.local`

```bash
# ✅ REQUERIDO: API Key para el webhook
N8N_WEBHOOK_API_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ODFkOTM2Zi04NmMwLTQ3ZGYtYWY0OS1kODg5ZjFjMzhlY2YiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY4OTkwMTE5fQ.oO_EWiPfv7ZS2i7didM1kVaNdl_MjnZCtWuHKjtF9n0"

# ✅ REQUERIDO: Base de datos
DATABASE_URL="postgresql://postgres.vptpfsxugbmrybrgofes:pruebasManu@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# ✅ REQUERIDO: NextAuth
NEXTAUTH_SECRET="dev-secret-change-in-production"
NEXTAUTH_URL="http://localhost:3000"

# ⚠️ NO REQUERIDO para n8n (ya no se usa OAuth directo)
# Pero puedes dejarlo por si acaso
MICROSOFT_CLIENT_ID="e7f3f9c5-f2ec-489f-a413-2fa7c4fa149b"
MICROSOFT_CLIENT_SECRET="YOUR_AZURE_CLIENT_SECRET_HERE"
MICROSOFT_TENANT_ID="fd8cb27e-290a-493e-99fa-dc570e67692e"
```

**Verificación**:
- ✅ `N8N_WEBHOOK_API_KEY` está presente
- ✅ `DATABASE_URL` apunta a tu base de datos
- ✅ `NEXTAUTH_SECRET` está configurado

---

### ✅ 2. Variable en n8n

**Ruta**: n8n → Settings → Variables

**Variable requerida**:
```
Key: WEBHOOK_API_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ODFkOTM2Zi04NmMwLTQ3ZGYtYWY0OS1kODg5ZjFjMzhlY2YiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY4OTkwMTE5fQ.oO_EWiPfv7ZS2i7didM1kVaNdl_MjnZCtWuHKjtF9n0
```

**Verificación**:
- ✅ La variable existe en n8n
- ✅ El valor coincide EXACTAMENTE con `N8N_WEBHOOK_API_KEY` en `.env.local`

---

### ✅ 3. Credenciales en n8n

#### A. Microsoft Graph OAuth2

**Ruta**: n8n → Settings → Credentials → Microsoft Graph OAuth2 API

**Configuración esperada**:
```
Name: Microsoft 365 Email (o cualquier nombre)
Grant Type: Authorization Code

Authorization URL:
https://login.microsoftonline.com/fd8cb27e-290a-493e-99fa-dc570e67692e/oauth2/v2.0/authorize

Access Token URL:
https://login.microsoftonline.com/fd8cb27e-290a-493e-99fa-dc570e67692e/oauth2/v2.0/token

Client ID: e7f3f9c5-f2ec-489f-a413-2fa7c4fa149b
Client Secret: YOUR_AZURE_CLIENT_SECRET_HERE

Scope:
https://graph.microsoft.com/Mail.ReadWrite https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/User.Read offline_access

Auth URI Query Parameters: prompt=consent
Authentication: Body

Estado: ✅ Connected (debe mostrar "Connected" o un check verde)
```

**Verificación**:
- ✅ URLs tienen el Tenant ID específico (NO `/common`)
- ✅ Client ID y Secret son correctos
- ✅ Scope incluye todos los permisos
- ✅ Estado: Connected (conectado exitosamente)

#### B. OpenAI API

**Ruta**: n8n → Settings → Credentials → OpenAI API

**Configuración esperada**:
```
Name: OpenAI Email Analysis (o cualquier nombre)
API Key: sk-proj-... (tu API key de OpenAI)
```

**Verificación**:
- ✅ API key válida de OpenAI
- ✅ Credencial guardada

---

## 🔧 Checklist del Workflow

### 📍 Estructura Esperada del Workflow

```
[1] Microsoft Outlook Trigger (cuando llega correo)
        ↓
[2] OpenAI - Analyze Email (analiza con IA)
        ↓
[3] Transform to Webhook Format (transforma datos)
        ↓
[4] Send to App Webhook (envía a la aplicación)
        ↓
[5] Check Success (verifica si funcionó)
        ↓
    [6a] Success         [6b] Log Error
```

---

### ✅ Nodo 1: Microsoft Outlook Trigger

**Nombre sugerido**: "When Email Received" o "Microsoft Outlook Trigger"

**Configuración**:
```
Type: n8n-nodes-base.microsoftOutlookTrigger
Resource: Message
Event: Message Received
Credentials: [Tu credencial Microsoft Graph OAuth2] ✅ Connected
```

**Verificación**:
- ✅ El nodo es un **Trigger** (tiene icono de rayo ⚡)
- ✅ Tipo: Microsoft Outlook Trigger
- ✅ Event: "Message Received" (cuando llega correo)
- ✅ Credencial: Seleccionada y conectada

---

### ✅ Nodo 2: OpenAI - Analyze Email

**Nombre sugerido**: "OpenAI - Analyze Email"

**Configuración**:
```
Type: @n8n/n8n-nodes-langchain.openAi
Resource: Text
Operation: Message
Model: gpt-4o-mini
Credentials: [Tu credencial OpenAI] ✅

Messages:
  - Role: system
    Content: "Eres un asistente experto en análisis de correos de soporte. Tu tarea es analizar correos y extraer información estructurada en formato JSON. Responde SOLO con JSON válido, sin texto adicional ni markdown code blocks."

  - Role: user
    Content: ={{ "Analiza este correo y extrae la siguiente información en formato JSON:\n\nAsunto: " + $json.subject + "\nDe: " + $json.from.emailAddress.name + " <" + $json.from.emailAddress.address + ">\nCuerpo: " + $json.bodyPreview + "\n\nExtrae SOLO un objeto JSON con esta estructura exacta (sin markdown, sin code blocks):\n{\n  \"category\": \"bug\",\n  \"tags\": [\"palabra1\", \"palabra2\"],\n  \"summary\": \"resumen breve\",\n  \"sentiment\": \"positive\",\n  \"priority\": \"medium\"\n}\n\nReglas:\n- category: solo uno de: bug, feature, question, support, other\n- tags: máximo 5 palabras clave relevantes\n- summary: máximo 100 caracteres\n- sentiment: solo uno de: positive, negative, neutral\n- priority: solo uno de: low, medium, high, urgent" }}

Options:
  Temperature: 0.3
  Max Tokens: 500
  Simplify Output: true
```

**Verificación**:
- ✅ Credencial OpenAI seleccionada
- ✅ Model: gpt-4o-mini
- ✅ Prompt configurado correctamente (con las expresiones n8n `={{ ... }}`)
- ✅ Temperature: 0.3
- ✅ Simplify Output: activado

---

### ✅ Nodo 3: Transform to Webhook Format

**Nombre sugerido**: "Transform to Webhook Format"

**Configuración**:
```
Type: n8n-nodes-base.code
Language: JavaScript
```

**⚠️ IMPORTANTE: Código JavaScript**

El código debe referenciar el **nombre exacto** del primer nodo (Outlook Trigger). Si tu nodo se llama "When Email Received", usa ese nombre:

```javascript
// Parse AI response
let aiAnalysis;
try {
  // OpenAI devuelve el JSON en message.content
  const content = $input.item.json.message?.content || $input.item.json.text || JSON.stringify($input.item.json);

  // Limpiar markdown code blocks si existen
  const cleanContent = content
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();

  aiAnalysis = JSON.parse(cleanContent);
} catch (error) {
  // Fallback values si falla el parsing
  console.error("Error parsing AI response:", error);
  console.error("Raw content:", $input.item.json);

  aiAnalysis = {
    category: "other",
    tags: ["sin-categorizar"],
    summary: ($input.first().json.subject || "Sin resumen").substring(0, 100),
    sentiment: "neutral",
    priority: "medium"
  };
}

// ⚠️ CRÍTICO: Reemplaza 'When Email Received' con el nombre EXACTO de tu nodo trigger
const email = $('When Email Received').item.json;

// Ensure toRecipients exists and has at least one recipient
if (!email.toRecipients || email.toRecipients.length === 0) {
  throw new Error('Email has no recipients');
}

// Transform to webhook format
return {
  json: {
    messageId: email.id,
    subject: email.subject,
    from: email.from.emailAddress.name || email.from.emailAddress.address,
    fromEmail: email.from.emailAddress.address,
    to: email.toRecipients[0].emailAddress.address,
    cc: email.toRecipients.slice(1).map(r => r.emailAddress.address).join(', ') || undefined,
    receivedAt: email.receivedDateTime,
    bodyPreview: email.bodyPreview,
    bodyText: email.body.contentType === 'text' ? email.body.content : undefined,
    bodyHtml: email.body.contentType === 'html' ? email.body.content : undefined,
    aiCatalog: {
      category: aiAnalysis.category,
      tags: Array.isArray(aiAnalysis.tags) ? aiAnalysis.tags : [],
      summary: aiAnalysis.summary,
      sentiment: aiAnalysis.sentiment,
      priority: aiAnalysis.priority
    },
    conversationId: email.conversationId,
    hasAttachments: email.hasAttachments || false
  }
};
```

**Verificación**:
- ✅ El código está completo (no faltan líneas)
- ✅ La línea `const email = $('NOMBRE').item.json;` tiene el **nombre correcto** del trigger
- ✅ No hay errores de sintaxis (n8n te avisaría)

---

### ✅ Nodo 4: Send to App Webhook

**Nombre sugerido**: "Send to App Webhook"

**Configuración**:
```
Type: n8n-nodes-base.httpRequest
Method: POST
URL: http://localhost:3000/api/n8n/webhook
    (Si tu app está en otro puerto o dominio, cámbialo)

Authentication: None

Send Headers: true
Headers:
  - Name: Content-Type
    Value: application/json
  - Name: x-api-key
    Value: ={{ $vars.WEBHOOK_API_KEY }}

Send Body: true
Content Type: JSON
Body: ={{ JSON.stringify($json) }}

Options:
  Timeout: 10000 (10 segundos)
```

**Verificación**:
- ✅ Method: POST
- ✅ URL correcta (http://localhost:3000/api/n8n/webhook o tu URL)
- ✅ Header `x-api-key` usa `$vars.WEBHOOK_API_KEY` (con las dobles llaves `={{ }}`)
- ✅ Body usa `={{ JSON.stringify($json) }}`
- ✅ Timeout: 10000

---

### ✅ Nodo 5: Check Success

**Nombre sugerido**: "Check Success"

**Configuración**:
```
Type: n8n-nodes-base.if
Conditions:
  - Left Value: ={{ $json.success }}
    Operation: equals (boolean)
    Right Value: true
```

**Verificación**:
- ✅ Condition: `$json.success` equals `true`
- ✅ Tiene dos salidas: True (verde) y False (rojo)

---

### ✅ Nodos 6a y 6b: Success / Log Error

**6a. Success**:
```
Type: n8n-nodes-base.noOp
Name: Success
```

**6b. Log Error**:
```
Type: n8n-nodes-base.code
Name: Log Error

Código JavaScript:
```javascript
// Log error details
const emailId = $('Transform to Webhook Format').item.json.messageId;
const error = $json.error || $json.details || 'Unknown error';

console.error('❌ Failed to send email to webhook:', {
  emailId: emailId,
  subject: $('Transform to Webhook Format').item.json.subject,
  error: error,
  timestamp: new Date().toISOString()
});

// Return error info for logging
return {
  json: {
    status: 'failed',
    emailId: emailId,
    error: error,
    timestamp: new Date().toISOString()
  }
};
```

**Verificación**:
- ✅ Success es un nodo NoOp (no hace nada, solo marca éxito)
- ✅ Log Error tiene el código JavaScript completo

---

## 🔗 Conexiones Entre Nodos

Verifica que las conexiones sean:

```
Outlook Trigger → OpenAI
OpenAI → Transform
Transform → Send Webhook
Send Webhook → Check Success
Check Success → Success (salida True/verde)
Check Success → Log Error (salida False/rojo)
```

**Verificación**:
- ✅ No hay nodos desconectados
- ✅ El flujo es lineal (un nodo tras otro)
- ✅ Check Success tiene dos ramas de salida

---

## 🧪 Test Previo (Sin OpenAI)

Si quieres probar sin OpenAI (para verificar el resto), puedes:

1. **Temporalmente desactivar el nodo OpenAI**:
   - En el nodo OpenAI, click en los 3 puntos → "Disable"
   - Conecta directamente: Outlook Trigger → Transform

2. **Modificar el nodo Transform temporalmente**:
   - Agrega al inicio del código:
   ```javascript
   // MOCK AI response para testing
   const aiAnalysis = {
     category: "question",
     tags: ["test"],
     summary: "Email de prueba",
     sentiment: "neutral",
     priority: "low"
   };

   // Comenta o elimina el bloque try/catch original
   // ...resto del código igual...
   ```

3. **Prueba el workflow**:
   - Envía un correo de prueba
   - Verifica que llegue hasta el webhook
   - Revisa los logs de tu aplicación Next.js

4. **Restaura el nodo OpenAI**:
   - Elimina el mock
   - Reconecta el nodo OpenAI
   - Configura la credencial OpenAI

---

## 📊 Estado Final Esperado

Antes de activar:

- ✅ Variable `WEBHOOK_API_KEY` existe en n8n
- ✅ Credencial Microsoft Graph OAuth2 conectada
- ✅ Credencial OpenAI configurada (cuando la tengas)
- ✅ Nodo Transform tiene el nombre correcto del trigger
- ✅ Nodo Webhook tiene la URL correcta
- ✅ Todos los nodos están conectados
- ✅ No hay errores de sintaxis en ningún nodo

---

## 🚀 Activar el Workflow

Cuando todo esté listo:

1. En n8n, ve al workflow
2. Toggle **"Active"** (arriba a la derecha)
3. El workflow estará escuchando correos en tiempo real

---

## 🔍 Cómo Verificar que Funciona

### Test en Vivo:

1. **Envía un correo** a tu buzón de Outlook (desde Gmail, otro correo, etc.)
2. **En n8n**: Executions → Deberías ver una nueva ejecución
3. **Click en la ejecución** → Revisa cada nodo:
   - ✅ Outlook Trigger: Verde, capturó el correo
   - ✅ OpenAI: Verde, analizó y devolvió JSON
   - ✅ Transform: Verde, mapeó los datos
   - ✅ Send Webhook: Verde, envió a la app
   - ✅ Check Success: Verde, pasó por la rama Success
4. **En tu app Next.js**: Dashboard → Deberías ver el correo nuevo

### Verificar Logs de la App:

En la consola donde corre tu aplicación Next.js, deberías ver:

```
Email processed via n8n webhook: cm5x1y2z3... (AAMkADtest123)
  Subject: [Asunto del correo]
  Category: [bug/feature/question/etc]
  Sentiment: [positive/negative/neutral]
  Priority: [low/medium/high/urgent]
```

---

## 🐛 Troubleshooting

| Error | Solución |
|-------|----------|
| Outlook Trigger no se activa | Verifica que la credencial Microsoft esté conectada |
| OpenAI falla | Verifica que la API key sea válida |
| Webhook retorna 401 Unauthorized | Verifica que `WEBHOOK_API_KEY` en n8n sea igual a `.env.local` |
| Webhook retorna 400 Bad Request | El formato de datos está mal, revisa el nodo Transform |
| Error "node not found" en Transform | El nombre del nodo en `$('NOMBRE')` no coincide con el trigger real |

---

**Fecha de creación**: 21 de Enero de 2026
**Última actualización**: 21 de Enero de 2026
