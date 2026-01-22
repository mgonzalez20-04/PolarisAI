# 🎯 Configuración Completa de n8n con Vector Store

## ✅ Tu Configuración (Endpoints de la Aplicación)

n8n llamará a tus endpoints y tu aplicación:
- Recibe la query de texto
- Llama a OpenAI para generar el embedding
- Busca en Supabase con pgvector
- Devuelve los resultados

---

## 📋 Paso 1: URLs de tus Endpoints

**Desarrollo (localhost):**
```
http://localhost:3000/api/vector-search/knowledge
http://localhost:3000/api/vector-search/cases
```

**Producción:**
```
https://tu-dominio.com/api/vector-search/knowledge
https://tu-dominio.com/api/vector-search/cases
```

**API Key:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ODFkOTM2Ni04NmMwLTQ3ZGYtYWY0OS1kODg5ZjFjMzhlY2YiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY4OTkwMTE5fQ.oO_EWiPfv7ZS2i7didM1kVaNdl_MjnZCtWuHKjtF9n0
```

---

## 🔧 Paso 2: Configurar en n8n

### A. Nodo OpenAI - Agregar Tools

1. En tu nodo OpenAI (donde analizas el email)
2. Habilita **"Tools"**
3. Agrega **2 funciones** (Tools):

#### Tool 1: search_knowledge_base

**Copiar esta configuración:**

```json
{
  "name": "search_knowledge_base",
  "description": "Searches documentation, manuals, and guides in the knowledge base using semantic search. Use this when you need to understand technical concepts, find documentation, or get context about the system.",
  "parameters": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "The search query. Can be a question or keywords describing what you're looking for."
      },
      "limit": {
        "type": "number",
        "description": "Maximum number of results to return (default: 5)",
        "default": 5
      }
    },
    "required": ["query"]
  }
}
```

#### Tool 2: search_resolved_cases

**Copiar esta configuración:**

```json
{
  "name": "search_resolved_cases",
  "description": "Searches for similar resolved support cases. Use this to find how similar issues were handled and resolved in the past. Only searches closed/resolved cases.",
  "parameters": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "Description of the issue or problem to search for"
      },
      "userId": {
        "type": "string",
        "description": "User ID to search cases for. Use the current user's ID."
      },
      "limit": {
        "type": "number",
        "description": "Maximum number of results (default: 5)",
        "default": 5
      }
    },
    "required": ["query", "userId"]
  }
}
```

---

### B. Actualizar el Prompt de OpenAI

Reemplaza tu prompt actual con este:

```
Analyze this email and categorize it.

You have access to two tools to help you:
1. search_knowledge_base - Search documentation and manuals
2. search_resolved_cases - Search similar past resolved cases

Use these tools when you need additional context to better understand the email.

After gathering context (if needed), return JSON with:
{
  "category": "bug | feature | question | support | other",
  "sentiment": "positive | negative | neutral",
  "priority": "low | medium | high | urgent",
  "tags": ["array", "of", "tags"],
  "summary": "Brief summary (include relevant insights from tools if used)"
}

Email Subject: {{$json.subject}}
Email From: {{$json.from}}
Email Body: {{$json.bodyPreview}}
```

---

### C. Agregar Nodos HTTP Request

Después del nodo OpenAI, cuando detecte que quiere usar una tool, necesitas hacer la llamada HTTP.

En n8n, esto se maneja automáticamente con **"Execute Workflow" o "HTTP Request"** dependiendo de tu versión.

#### Configuración para ambas tools:

**HTTP Request Node 1: Knowledge Base**

- **URL:** `http://localhost:3000/api/vector-search/knowledge`
- **Method:** POST
- **Authentication:** Generic Credential Type → Header Auth
  - **Name:** `x-api-key`
  - **Value:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ODFkOTM2Ni04NmMwLTQ3ZGYtYWY0OS1kODg5ZjFjMzhlY2YiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY4OTkwMTE5fQ.oO_EWiPfv7ZS2i7didM1kVaNdl_MjnZCtWuHKjtF9n0`

**Body Parameters (JSON):**
```json
{
  "query": "={{$json.arguments.query}}",
  "limit": "={{$json.arguments.limit || 5}}"
}
```

**HTTP Request Node 2: Resolved Cases**

- **URL:** `http://localhost:3000/api/vector-search/cases`
- **Method:** POST
- **Authentication:** Generic Credential Type → Header Auth
  - **Name:** `x-api-key`
  - **Value:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ODFkOTM2Ni04NmMwLTQ3ZGYtYWY0OS1kODg5ZjFjMzhlY2YiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY4OTkwMTE5fQ.oO_EWiPfv7ZS2i7didM1kVaNdl_MjnZCtWuHKjtF9n0`

**Body Parameters (JSON):**
```json
{
  "query": "={{$json.arguments.query}}",
  "userId": "={{$json.arguments.userId}}",
  "limit": "={{$json.arguments.limit || 5}}"
}
```

---

## 🔍 Paso 3: Probar los Endpoints

Antes de configurar n8n, verifica que los endpoints funcionan:

### Test 1: Knowledge Base
```bash
curl -X POST http://localhost:3000/api/vector-search/knowledge \
  -H "Content-Type: application/json" \
  -H "x-api-key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ODFkOTM2Ni04NmMwLTQ3ZGYtYWY0OS1kODg5ZjFjMzhlY2YiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY4OTkwMTE5fQ.oO_EWiPfv7ZS2i7didM1kVaNdl_MjnZCtWuHKjtF9n0" \
  -d '{"query": "como funciona el agente IA", "limit": 2}'
```

**Respuesta esperada:**
```json
{
  "success": true,
  "query": "como funciona el agente IA",
  "resultsCount": 2,
  "results": [
    {
      "documentId": "...",
      "documentTitle": "Agente de Inteligencia Artificial",
      "category": "agente-ia",
      "contentPreview": "...",
      "similarity": 0.89
    }
  ]
}
```

---

## 📊 Flujo Completo en n8n

```
1. Microsoft Outlook Trigger
   (Recibe nuevo email)
        ↓
2. OpenAI Chat Model (con tools habilitadas)
   Analiza el email
        ↓
   ¿Necesita buscar documentación?
        ↓ SÍ
3. HTTP Request → /api/vector-search/knowledge
   Tu app:
   - Genera embedding con OpenAI
   - Busca en Supabase
   - Devuelve resultados
        ↓
   Resultados vuelven a OpenAI
        ↓
   ¿Necesita buscar casos?
        ↓ SÍ
4. HTTP Request → /api/vector-search/cases
   Tu app:
   - Genera embedding con OpenAI
   - Busca casos resueltos
   - Devuelve resultados
        ↓
   Resultados vuelven a OpenAI
        ↓
5. OpenAI genera análisis final
   Con contexto de docs + casos
        ↓
6. HTTP Request → /api/n8n/webhook
   Envía resultado a tu app
```

---

## ⚙️ Variables de Entorno Necesarias

Asegúrate de tener en tu `.env.local`:

```env
# OpenAI (para generar embeddings en los endpoints)
OPENAI_API_KEY="YOUR_OPENAI_API_KEY_HERE"

# n8n Webhook API Key (para autenticación)
N8N_WEBHOOK_API_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ODFkOTM2Ni04NmMwLTQ3ZGYtYWY0OS1kODg5ZjFjMzhlY2YiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY4OTkwMTE5fQ.oO_EWiPfv7ZS2i7didM1kVaNdl_MjnZCtWuHKjtF9n0"

# Supabase
DATABASE_URL="postgresql://postgres.vptpfsxugbmrybrgofes:pruebasManu@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
```

---

## ✅ Checklist Final

Antes de probar en n8n:

- [ ] Servidor Next.js corriendo (`npm run dev`)
- [ ] Base de datos con 28 documentos cargados
- [ ] Endpoints responden correctamente (test con curl)
- [ ] Variables de entorno configuradas

En n8n:

- [ ] Tools configuradas en OpenAI
- [ ] Prompt actualizado
- [ ] HTTP Request nodes configurados
- [ ] API key correcta en headers

---

## 🆘 Solución de Problemas

### Error: "Unauthorized"
→ Verifica que el header `x-api-key` esté correcto

### Error: "OpenAI API key not configured"
→ Verifica `OPENAI_API_KEY` en `.env.local`

### Error: "No results found"
→ Los embeddings se están generando pero no hay documentos similares

### No responde
→ Verifica que `npm run dev` esté corriendo

---

**¿Necesitas ayuda probando los endpoints antes de configurar n8n?**
