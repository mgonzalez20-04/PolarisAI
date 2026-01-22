# n8n Integration - Quick Start Guide

## Inicio Rapido (5 minutos)

### 1. Verificar Variables de Entorno

Abre `.env.local` y verifica que tengas:

```env
N8N_WEBHOOK_API_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
DATABASE_URL="postgresql://..."
```

### 2. Instalar Dependencias (si es necesario)

```bash
npm install
```

### 3. Iniciar el Servidor

```bash
npm run dev
```

El servidor estara disponible en `http://localhost:3000`

### 4. Probar la Integracion

#### Opcion A: Script Automatico (PowerShell - Windows)

```powershell
$env:N8N_WEBHOOK_API_KEY="tu-api-key"
.\test-n8n-webhook.ps1
```

#### Opcion B: Script Automatico (Bash - Linux/Mac)

```bash
N8N_WEBHOOK_API_KEY="tu-api-key" ./test-n8n-webhook.sh
```

#### Opcion C: Prueba Manual con cURL

```bash
curl -X POST http://localhost:3000/api/n8n/webhook \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "messageId": "test_message_12345678901",
    "subject": "Test Email",
    "from": "Test User <test@example.com>",
    "fromEmail": "test@example.com",
    "to": "support@company.com",
    "receivedAt": "2024-01-20T10:00:00Z",
    "bodyPreview": "This is a test email",
    "aiCatalog": {
      "category": "question",
      "sentiment": "neutral",
      "priority": "medium"
    }
  }'
```

#### Opcion D: Prueba Manual con Postman

1. Crea una nueva peticion POST
2. URL: `http://localhost:3000/api/n8n/webhook`
3. Headers:
   - `Content-Type: application/json`
   - `x-api-key: YOUR_API_KEY`
4. Body (raw JSON): Ver ejemplo arriba

### 5. Verificar que Funciona

#### Health Check

```bash
curl http://localhost:3000/api/n8n/webhook
```

Respuesta esperada:
```json
{
  "success": true,
  "status": "operational",
  "circuitBreaker": "CLOSED",
  "metrics": {...}
}
```

#### Ver Metricas

```bash
curl -H "x-api-key: YOUR_KEY" \
  http://localhost:3000/api/n8n/metrics
```

#### Ver Logs

```bash
curl -H "x-api-key: YOUR_KEY" \
  http://localhost:3000/api/n8n/logs
```

## Configurar n8n Workflow

### Paso 1: Nodo Microsoft Outlook Trigger

1. Agrega un nodo "Microsoft Outlook Trigger"
2. Configura:
   - Trigger: "Poll for new emails"
   - Poll Interval: 5 minutos
   - Folder: Inbox

### Paso 2: Nodo OpenAI

1. Agrega un nodo "OpenAI"
2. Configura:
   - Operation: "Text"
   - Model: "gpt-4" o "gpt-3.5-turbo"
   - Prompt:

```
Analiza este correo y devuelve JSON con:
- category: bug | feature | question | support | other
- sentiment: positive | negative | neutral
- priority: low | medium | high | urgent
- tags: array de tags relevantes
- summary: resumen breve

Subject: {{$json.subject}}
Body: {{$json.bodyPreview}}
```

### Paso 3: Nodo HTTP Request

1. Agrega un nodo "HTTP Request"
2. Configura:
   - Method: POST
   - URL: `https://tu-dominio.com/api/n8n/webhook`
   - Authentication: "Header Auth"
     - Name: `x-api-key`
     - Value: `{{$env.N8N_WEBHOOK_API_KEY}}`
   - Send Body: Yes
   - Body Content Type: JSON
   - Body (JSON):

```json
{
  "messageId": "{{$json.id}}",
  "subject": "{{$json.subject}}",
  "from": "{{$json.from}}",
  "fromEmail": "{{$json.fromEmail}}",
  "to": "{{$json.to}}",
  "cc": "{{$json.cc}}",
  "receivedAt": "{{$json.receivedDateTime}}",
  "bodyPreview": "{{$json.bodyPreview}}",
  "bodyText": "{{$json.body.content}}",
  "bodyHtml": "{{$json.body.content}}",
  "aiCatalog": {
    "category": "{{$json.aiCategory}}",
    "tags": {{$json.aiTags}},
    "summary": "{{$json.aiSummary}}",
    "sentiment": "{{$json.aiSentiment}}",
    "priority": "{{$json.aiPriority}}"
  },
  "conversationId": "{{$json.conversationId}}",
  "folderPath": "Inbox",
  "hasAttachments": {{$json.hasAttachments}}
}
```

### Paso 4: Activar Workflow

1. Guarda el workflow
2. Activa el workflow
3. Espera 5 minutos para la primera ejecucion

## Monitoreo

### Dashboard de Metricas

Puedes crear un dashboard simple con:

```bash
# Script de monitoreo continuo
while true; do
  clear
  echo "=== n8n Webhook Metrics ==="
  curl -s -H "x-api-key: $N8N_WEBHOOK_API_KEY" \
    http://localhost:3000/api/n8n/metrics | jq '.'
  sleep 10
done
```

### Alertas Recomendadas

Configura alertas si:
- Success rate < 90%
- Circuit breaker = "OPEN"
- Average processing time > 500ms
- Error rate > 10%

## Troubleshooting Rapido

### Problema: "Unauthorized"

**Solucion:**
1. Verifica que `N8N_WEBHOOK_API_KEY` este en `.env.local`
2. Verifica que el header sea correcto: `x-api-key` o `Authorization: Bearer`

### Problema: "Rate limit exceeded"

**Solucion:**
1. Espera 60 segundos
2. Verifica que no tengas multiples workflows apuntando al mismo endpoint
3. Considera aumentar el limite en `webhook-helpers.ts`

### Problema: "Circuit breaker is OPEN"

**Solucion:**
1. Verifica la conexion a la base de datos
2. Revisa los logs: `GET /api/n8n/logs`
3. Espera 60 segundos para recuperacion automatica
4. Reset manual: `POST /api/n8n/metrics/reset`

### Problema: Emails duplicados

**Solucion:**
No es un problema - la idempotencia esta funcionando. Los emails con el mismo `messageId` no se duplican en la base de datos.

### Problema: Procesamiento lento

**Solucion:**
1. Verifica metricas: `GET /api/n8n/metrics`
2. Revisa el estado de la base de datos
3. Considera optimizar queries o agregar indices

## Archivos Importantes

```
src/lib/n8n/
├── webhook-logger.ts          # Sistema de logging
├── email-processor.ts         # Procesador con circuit breaker
├── webhook-helpers.ts         # Utilidades y validacion
└── README.md                  # Documentacion completa

src/app/api/n8n/
├── webhook/route.ts           # Endpoint principal
├── metrics/route.ts           # Metricas
└── logs/route.ts              # Logs

test-n8n-webhook.ps1          # Script de prueba (Windows)
test-n8n-webhook.sh           # Script de prueba (Linux/Mac)
N8N_INTEGRATION_SUMMARY.md   # Resumen completo
```

## Documentacion Completa

Para mas detalles, consulta:
- `src/lib/n8n/README.md` - Guia completa de integracion
- `N8N_INTEGRATION_SUMMARY.md` - Resumen de implementacion

## Soporte

Si tienes problemas:

1. **Logs de consola**: Revisa la salida de `npm run dev`
2. **Logs del webhook**: `curl -H "x-api-key: KEY" localhost:3000/api/n8n/logs`
3. **Metricas**: `curl -H "x-api-key: KEY" localhost:3000/api/n8n/metrics`
4. **Health check**: `curl localhost:3000/api/n8n/webhook`

## Proximos Pasos

1. Probar localmente con los scripts de prueba
2. Configurar el workflow de n8n
3. Activar el workflow y monitorear
4. Revisar metricas periodicamente
5. Configurar alertas en produccion

---

**Tiempo estimado de configuracion:** 5-10 minutos
**Dificultad:** Basica
