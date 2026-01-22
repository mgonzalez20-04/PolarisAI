# Guía Completa: Workflow n8n para Sincronización de Correos

## Índice
1. [Requisitos Previos](#requisitos-previos)
2. [Configuración de Credenciales](#configuración-de-credenciales)
3. [Estructura del Workflow](#estructura-del-workflow)
4. [Configuración Nodo por Nodo](#configuración-nodo-por-nodo)
5. [Testing y Troubleshooting](#testing-y-troubleshooting)
6. [Optimizaciones](#optimizaciones)

---

## Requisitos Previos

### 1. Cuenta de Microsoft 365
- Acceso a Azure Portal
- Permisos para crear App Registrations
- Buzón de correo activo

### 2. n8n Instalado
- n8n cloud o self-hosted
- Versión 1.0+ recomendada

### 3. API Keys
- OpenAI API Key (para análisis IA)
- O Claude API Key (alternativa)
- Webhook API Key de tu aplicación (ya configurada)

---

## Configuración de Credenciales

### Paso 1: Crear App Registration en Azure

1. Ir a [Azure Portal](https://portal.azure.com)
2. Navegar a **Azure Active Directory** > **App registrations** > **New registration**
3. Configurar la aplicación:
   - **Name**: `n8n Email Integration`
   - **Supported account types**: `Accounts in this organizational directory only`
   - **Redirect URI**: `https://your-n8n-instance.com/rest/oauth2-credential/callback`

4. Después de crear, anotar:
   - **Application (client) ID**
   - **Directory (tenant) ID**

5. Crear un **Client Secret**:
   - Ir a **Certificates & secrets** > **New client secret**
   - Description: `n8n Integration Secret`
   - Expiration: `24 months` (recomendado)
   - Copiar el **Value** (solo visible una vez)

6. Configurar **API Permissions**:
   - Ir a **API permissions** > **Add a permission**
   - Seleccionar **Microsoft Graph** > **Delegated permissions**
   - Agregar permisos:
     - ✅ `Mail.ReadWrite` - Leer y escribir correos
     - ✅ `Mail.Read` - Leer correos
     - ✅ `User.Read` - Leer perfil del usuario
     - ✅ `offline_access` - Mantener acceso con refresh token
   - Click en **Grant admin consent** (si tienes permisos de admin)

### Paso 2: Configurar Credenciales en n8n

#### A. Microsoft Graph OAuth2

1. En n8n, ir a **Settings** > **Credentials** > **Add Credential**
2. Buscar y seleccionar **Microsoft Graph OAuth2 API**
3. Completar:
   - **Credential Name**: `Microsoft 365 - Email Sync`
   - **Authorization URL**: `https://login.microsoftonline.com/{TENANT_ID}/oauth2/v2.0/authorize`
     - Reemplazar `{TENANT_ID}` con tu Directory (tenant) ID
   - **Access Token URL**: `https://login.microsoftonline.com/{TENANT_ID}/oauth2/v2.0/token`
   - **Client ID**: Tu Application (client) ID de Azure
   - **Client Secret**: El valor del secret que copiaste
   - **Scope**: `https://graph.microsoft.com/Mail.ReadWrite https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/User.Read offline_access`
   - **Auth URI Query Parameters**: `prompt=consent`
   - **Authentication**: `Body`

4. Click en **Connect my account** y autorizar

#### B. OpenAI API (para análisis IA)

1. Ir a **Settings** > **Credentials** > **Add Credential**
2. Seleccionar **OpenAI API**
3. Completar:
   - **Credential Name**: `OpenAI - Email Analysis`
   - **API Key**: Tu OpenAI API Key (empieza con `sk-...`)

#### C. Webhook API Key (para tu aplicación)

1. En n8n, ir a **Settings** > **Variables**
2. Crear nueva variable:
   - **Key**: `WEBHOOK_API_KEY`
   - **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ODFkOTM2Ni04NmMwLTQ3ZGYtYWY0OS1kODg5ZjFjMzhlY2YiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY4OTg2MTc1fQ.MUnqI4spNWfPgCwU7eFo8XzSjBB81EEf_vBZaaDV0b0`
   - **Type**: `String`

---

## Estructura del Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                     WORKFLOW OVERVIEW                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Schedule Trigger (cada 5 minutos)                       │
│           ↓                                                  │
│  2. HTTP Request - Get Emails (Microsoft Graph)             │
│           ↓                                                  │
│  3. Split In Batches (procesar de 10 en 10)                │
│           ↓                                                  │
│  4. OpenAI - Analyze Email (categorizar con IA)            │
│           ↓                                                  │
│  5. Function - Transform Data (mapear al formato webhook)  │
│           ↓                                                  │
│  6. HTTP Request - Send to Webhook (enviar a la app)       │
│           ↓                                                  │
│  7. IF - Check Success (manejar errores)                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Configuración Nodo por Nodo

### Nodo 1: Schedule Trigger

**Tipo**: `Schedule Trigger`

**Configuración**:
```json
{
  "rule": {
    "interval": [
      {
        "field": "cronExpression",
        "expression": "*/5 * * * *"
      }
    ]
  }
}
```

**Explicación**:
- `*/5 * * * *` = Cada 5 minutos
- Puedes ajustar a `*/10 * * * *` (cada 10 min) o `0 * * * *` (cada hora)

**Configuración visual en n8n**:
1. Agregar nodo **Schedule Trigger**
2. Mode: `Every 5 Minutes`
3. O usar **Cron Expression**: `*/5 * * * *`

---

### Nodo 2: HTTP Request - Get Emails

**Tipo**: `HTTP Request`

**Configuración**:
```json
{
  "method": "GET",
  "url": "https://graph.microsoft.com/v1.0/me/messages",
  "authentication": "predefinedCredentialType",
  "nodeCredentialType": "microsoftGraphOAuth2Api",
  "sendQuery": true,
  "queryParameters": {
    "parameters": [
      {
        "name": "$top",
        "value": "50"
      },
      {
        "name": "$orderby",
        "value": "receivedDateTime DESC"
      },
      {
        "name": "$select",
        "value": "id,subject,from,toRecipients,receivedDateTime,bodyPreview,body,conversationId,hasAttachments"
      },
      {
        "name": "$filter",
        "value": "receivedDateTime ge {{ $now.minus({minutes: 10}).toISO() }}"
      }
    ]
  }
}
```

**Configuración visual en n8n**:
1. Agregar nodo **HTTP Request**
2. **Method**: `GET`
3. **URL**: `https://graph.microsoft.com/v1.0/me/messages`
4. **Authentication**: Seleccionar `Microsoft Graph OAuth2 API` (tu credencial)
5. **Send Query Parameters**: ✅ Activar
6. Agregar parámetros:
   - `$top` = `50` (máximo 50 correos por request)
   - `$orderby` = `receivedDateTime DESC`
   - `$select` = `id,subject,from,toRecipients,receivedDateTime,bodyPreview,body,conversationId,hasAttachments`
   - `$filter` = `receivedDateTime ge {{ $now.minus({minutes: 10}).toISO() }}`

**Explicación del filtro**:
- Solo obtiene correos de los últimos 10 minutos
- Evita procesar correos antiguos
- Ajustar según la frecuencia del Schedule Trigger

---

### Nodo 3: Split In Batches

**Tipo**: `Split In Batches`

**Configuración**:
```json
{
  "batchSize": 10,
  "options": {
    "reset": false
  }
}
```

**Configuración visual en n8n**:
1. Agregar nodo **Split In Batches**
2. **Batch Size**: `10`
3. **Options** > **Reset**: ❌ Desactivar

**Explicación**:
- Procesa 10 correos a la vez
- Evita timeout en análisis IA
- Mejora la tasa de éxito

---

### Nodo 4: OpenAI - Analyze Email

**Tipo**: `OpenAI`

**Configuración**:
```json
{
  "resource": "text",
  "operation": "message",
  "model": "gpt-4o-mini",
  "messages": {
    "values": [
      {
        "role": "system",
        "content": "Eres un asistente experto en análisis de correos de soporte. Tu tarea es analizar correos y extraer información estructurada en formato JSON. Responde SOLO con JSON válido, sin texto adicional."
      },
      {
        "role": "user",
        "content": "Analiza este correo y extrae la siguiente información en formato JSON:\n\nAsunto: {{ $json.subject }}\nDe: {{ $json.from.emailAddress.name }} <{{ $json.from.emailAddress.address }}>\nCuerpo: {{ $json.bodyPreview }}\n\nExtrae:\n{\n  \"category\": \"bug\" | \"feature\" | \"question\" | \"support\" | \"other\",\n  \"tags\": [\"array\", \"de\", \"palabras\", \"clave\"],\n  \"summary\": \"resumen en 1-2 líneas\",\n  \"sentiment\": \"positive\" | \"negative\" | \"neutral\",\n  \"priority\": \"low\" | \"medium\" | \"high\" | \"urgent\"\n}\n\nRespuesta:"
      }
    ]
  },
  "options": {
    "temperature": 0.3,
    "maxTokens": 500
  },
  "simplifyOutput": true
}
```

**Configuración visual en n8n**:
1. Agregar nodo **OpenAI**
2. **Credential**: Seleccionar `OpenAI - Email Analysis`
3. **Resource**: `Text`
4. **Operation**: `Message a model`
5. **Model**: `gpt-4o-mini` (más rápido y barato)
6. **Messages**: Agregar 2 mensajes:

**Mensaje 1 (System)**:
```
Eres un asistente experto en análisis de correos de soporte. Tu tarea es analizar correos y extraer información estructurada en formato JSON. Responde SOLO con JSON válido, sin texto adicional.
```

**Mensaje 2 (User)**:
```
Analiza este correo y extrae la siguiente información en formato JSON:

Asunto: {{ $json.subject }}
De: {{ $json.from.emailAddress.name }} <{{ $json.from.emailAddress.address }}>
Cuerpo: {{ $json.bodyPreview }}

Extrae:
{
  "category": "bug" | "feature" | "question" | "support" | "other",
  "tags": ["array", "de", "palabras", "clave"],
  "summary": "resumen en 1-2 líneas",
  "sentiment": "positive" | "negative" | "neutral",
  "priority": "low" | "medium" | "high" | "urgent"
}

Respuesta:
```

7. **Options**:
   - **Temperature**: `0.3` (más determinista)
   - **Max Tokens**: `500`
   - **Simplify Output**: ✅ Activar

**Alternativa con Claude**:
Si prefieres usar Claude en lugar de OpenAI:
1. Usar nodo **HTTP Request**
2. URL: `https://api.anthropic.com/v1/messages`
3. Method: `POST`
4. Headers:
   - `x-api-key`: Tu Claude API Key
   - `anthropic-version`: `2023-06-01`
   - `content-type`: `application/json`
5. Body (JSON):
```json
{
  "model": "claude-3-haiku-20240307",
  "max_tokens": 500,
  "messages": [
    {
      "role": "user",
      "content": "Analiza este correo..."
    }
  ]
}
```

---

### Nodo 5: Function - Transform Data

**Tipo**: `Code`

**Configuración**:
```javascript
// Parse AI response
let aiAnalysis;
try {
  // OpenAI devuelve el JSON en message.content
  const content = $input.item.json.message.content;

  // Limpiar markdown code blocks si existen
  const cleanContent = content
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();

  aiAnalysis = JSON.parse(cleanContent);
} catch (error) {
  // Fallback values si falla el parsing
  aiAnalysis = {
    category: "other",
    tags: ["sin-categorizar"],
    summary: $input.item.json.subject || "Sin resumen",
    sentiment: "neutral",
    priority: "medium"
  };
  console.error("Error parsing AI response:", error);
}

// Get email data from previous node
const email = $('HTTP Request').item.json;

// Transform to webhook format
return {
  json: {
    messageId: email.id,
    subject: email.subject,
    from: email.from.emailAddress.name || email.from.emailAddress.address,
    fromEmail: email.from.emailAddress.address,
    to: email.toRecipients[0].emailAddress.address,
    cc: email.toRecipients.slice(1).map(r => r.emailAddress.address).join(', '),
    receivedAt: email.receivedDateTime,
    bodyPreview: email.bodyPreview,
    bodyText: email.body.contentType === 'text' ? email.body.content : null,
    bodyHtml: email.body.contentType === 'html' ? email.body.content : null,
    aiCatalog: {
      category: aiAnalysis.category,
      tags: aiAnalysis.tags || [],
      summary: aiAnalysis.summary,
      sentiment: aiAnalysis.sentiment,
      priority: aiAnalysis.priority
    },
    conversationId: email.conversationId,
    hasAttachments: email.hasAttachments || false
  }
};
```

**Configuración visual en n8n**:
1. Agregar nodo **Code**
2. **Language**: `JavaScript`
3. Copiar el código de arriba
4. **Run Once for All Items**: ❌ Desactivar (procesar item por item)

---

### Nodo 6: HTTP Request - Send to Webhook

**Tipo**: `HTTP Request`

**Configuración**:
```json
{
  "method": "POST",
  "url": "http://localhost:3000/api/n8n/webhook",
  "authentication": "none",
  "sendHeaders": true,
  "headerParameters": {
    "parameters": [
      {
        "name": "Content-Type",
        "value": "application/json"
      },
      {
        "name": "x-api-key",
        "value": "={{ $vars.WEBHOOK_API_KEY }}"
      }
    ]
  },
  "sendBody": true,
  "bodyParameters": {
    "parameters": []
  },
  "jsonParameters": true,
  "options": {
    "response": {
      "response": {
        "fullResponse": false
      }
    },
    "timeout": 10000
  }
}
```

**Configuración visual en n8n**:
1. Agregar nodo **HTTP Request**
2. **Method**: `POST`
3. **URL**: `http://localhost:3000/api/n8n/webhook`
   - **IMPORTANTE**: Cambiar `localhost` por tu dominio en producción
4. **Authentication**: `None`
5. **Send Headers**: ✅ Activar
6. Agregar headers:
   - `Content-Type` = `application/json`
   - `x-api-key` = `={{ $vars.WEBHOOK_API_KEY }}`
7. **Send Body**: ✅ Activar
8. **Body Content Type**: `JSON`
9. **Specify Body**: `Using JSON`
10. En el campo JSON, poner: `{{ $json }}`
11. **Options** > **Timeout**: `10000` (10 segundos)

---

### Nodo 7: IF - Check Success

**Tipo**: `IF`

**Configuración**:
```json
{
  "conditions": {
    "options": {
      "caseSensitive": true,
      "leftValue": "",
      "typeValidation": "strict"
    },
    "conditions": [
      {
        "id": "1",
        "leftValue": "={{ $json.success }}",
        "rightValue": true,
        "operator": {
          "type": "boolean",
          "operation": "equals"
        }
      }
    ],
    "combinator": "and"
  }
}
```

**Configuración visual en n8n**:
1. Agregar nodo **IF**
2. **Condition**: `{{ $json.success }}` equals `true`

**Branch TRUE (Success)**:
1. Agregar nodo **No Operation** (opcional)
2. O conectar a nodo de logging/notificación

**Branch FALSE (Error)**:
1. Agregar nodo **Code** para logging:
```javascript
console.error('Failed to send email to webhook:', {
  emailId: $('Function').item.json.messageId,
  error: $json.error || $json
});

return { json: { error: 'Webhook failed' } };
```

---

## Testing y Troubleshooting

### Testear el Workflow

#### 1. Test Manual (antes de activar el Schedule)

1. Click derecho en **Schedule Trigger**
2. Seleccionar **Execute Node**
3. Verificar que cada nodo se ejecuta correctamente
4. Revisar datos en cada paso

#### 2. Verificar Respuestas

**Nodo HTTP Request (Get Emails)**:
```json
{
  "value": [
    {
      "id": "AAMkAD...",
      "subject": "Asunto del correo",
      "from": {
        "emailAddress": {
          "name": "Juan Perez",
          "address": "juan@example.com"
        }
      },
      ...
    }
  ]
}
```

**Nodo OpenAI**:
```json
{
  "category": "bug",
  "tags": ["error", "login", "urgente"],
  "summary": "Usuario reporta error al iniciar sesión en la plataforma",
  "sentiment": "negative",
  "priority": "high"
}
```

**Nodo HTTP Request (Send to Webhook)**:
```json
{
  "success": true,
  "emailId": "cm5x1y2z3...",
  "messageId": "AAMkADtest123456789",
  "userId": "cm5x1y2z3...",
  "created": true,
  "message": "Email recibido y procesado correctamente"
}
```

#### 3. Errores Comunes y Soluciones

**Error: "401 Unauthorized" en Microsoft Graph**
- Solución: Regenerar credenciales OAuth2 en n8n
- Verificar que los scopes son correctos
- Re-autorizar la conexión

**Error: "Invalid JSON" en OpenAI**
- Solución: Ajustar el prompt para ser más específico
- Aumentar temperatura a 0.5
- Verificar que bodyPreview no está vacío

**Error: "API key invalida" en Webhook**
- Solución: Verificar variable `WEBHOOK_API_KEY` en n8n
- Verificar que `.env.local` tiene la misma key
- Verificar que el header se envía correctamente

**Error: "Timeout" en Webhook**
- Solución: Aumentar timeout a 30000ms
- Verificar que la aplicación está corriendo
- Verificar la URL (localhost vs dominio público)

---

## Optimizaciones

### 1. Filtrado Inteligente

En lugar de procesar TODOS los correos, filtrar por:

**Por remitente**:
```
$filter=from/emailAddress/address eq 'cliente@example.com'
```

**Por asunto**:
```
$filter=contains(subject,'soporte') or contains(subject,'ayuda')
```

**Combinar filtros**:
```
$filter=receivedDateTime ge {{ $now.minus({minutes: 10}).toISO() }} and from/emailAddress/address eq 'cliente@example.com'
```

### 2. Rate Limiting

Si tienes muchos correos, agregar un nodo **Wait** entre batches:
```javascript
// En un nodo Code antes del webhook
return new Promise(resolve => {
  setTimeout(() => {
    resolve({ json: $input.item.json });
  }, 1000); // Esperar 1 segundo
});
```

### 3. Caché de Análisis IA

Para evitar analizar el mismo correo dos veces:

1. Agregar nodo **Redis** o **PostgreSQL** después de Get Emails
2. Verificar si `messageId` ya fue procesado
3. Si existe, saltar análisis IA
4. Si no existe, procesar y guardar en caché

### 4. Notificaciones

Agregar nodo **Slack** o **Email** en el branch FALSE del IF:
```json
{
  "channel": "#alerts",
  "text": "❌ Error procesando email: {{ $('Function').item.json.subject }}"
}
```

### 5. Logging Avanzado

Agregar nodo **PostgreSQL** para guardar logs:
```sql
INSERT INTO n8n_logs (workflow_id, email_id, status, error, created_at)
VALUES ('email-sync', '{{ $json.messageId }}', 'success', NULL, NOW())
```

---

## Próximos Pasos

1. ✅ Configurar credenciales en n8n
2. ✅ Crear el workflow
3. ✅ Testear manualmente
4. ✅ Activar el Schedule Trigger
5. ✅ Monitorear los primeros 30 minutos
6. ✅ Ajustar filtros y optimizaciones según sea necesario

---

## Soporte

Si encuentras problemas:
1. Revisar logs de n8n (Executions tab)
2. Revisar logs de la aplicación Next.js
3. Verificar que todas las credenciales están activas
4. Testear cada nodo individualmente

---

**¡Listo!** Tu workflow n8n está configurado para sincronizar correos automáticamente cada 5 minutos con análisis IA incluido.
