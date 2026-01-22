# Integración de Vector Store de Supabase con n8n

Esta guía te muestra cómo integrar el vector store de Supabase con tu flujo de n8n para que OpenAI pueda consultar tu base de conocimientos durante el análisis de emails.

## 📋 Resumen

El sistema ahora tiene dos endpoints API que OpenAI puede usar como **herramientas (tools/functions)**:

1. **`/api/vector-search/knowledge`** - Busca en la base de conocimientos
2. **`/api/vector-search/cases`** - Busca casos resueltos similares

Estos endpoints usan **pgvector** en Supabase para búsquedas semánticas ultrarrápidas.

## ✅ Requisitos Previos

- ✅ pgvector habilitado en Supabase (ya verificado)
- ✅ Base de conocimientos cargada con embeddings
- ✅ `OPENAI_API_KEY` configurada en `.env.local`
- ✅ `N8N_WEBHOOK_API_KEY` configurada

## 🚀 Configuración en n8n

### Paso 1: Modificar el Nodo de OpenAI

En tu flujo de n8n, en el paso donde OpenAI analiza los emails, necesitas agregar **Function Calling** (llamadas a funciones).

#### Ubicación en el flujo actual:
```
Microsoft Outlook Trigger
    ↓
[OpenAI Categorization] ← MODIFICAR ESTE NODO
    ↓
HTTP Request Node (webhook)
```

### Paso 2: Configurar Function Calling en OpenAI

En el nodo de OpenAI, habilita **"Allow Manual Tool Selection"** y agrega las siguientes funciones:

#### Función 1: Buscar en Base de Conocimientos

**Nombre de la función:** `search_knowledge_base`

**Descripción:**
```
Searches the knowledge base using semantic vector search. Use this to find relevant documentation, guides, or information that can help answer the email or understand the context better.
```

**Parámetros (JSON Schema):**
```json
{
  "type": "object",
  "properties": {
    "query": {
      "type": "string",
      "description": "The search query to find relevant knowledge base articles"
    },
    "limit": {
      "type": "number",
      "description": "Maximum number of results to return (default: 5)",
      "default": 5
    },
    "minSimilarity": {
      "type": "number",
      "description": "Minimum similarity threshold 0-1 (default: 0.7)",
      "default": 0.7
    }
  },
  "required": ["query"]
}
```

#### Función 2: Buscar Casos Resueltos

**Nombre de la función:** `search_resolved_cases`

**Descripción:**
```
Searches for similar resolved cases using semantic vector search. Use this to find how similar issues were resolved in the past.
```

**Parámetros (JSON Schema):**
```json
{
  "type": "object",
  "properties": {
    "query": {
      "type": "string",
      "description": "The search query describing the issue or case"
    },
    "userId": {
      "type": "string",
      "description": "The user ID to search cases for"
    },
    "limit": {
      "type": "number",
      "description": "Maximum number of results to return (default: 5)",
      "default": 5
    }
  },
  "required": ["query", "userId"]
}
```

### Paso 3: Agregar Nodos HTTP Request para las Funciones

Cuando OpenAI decida llamar a una función, n8n necesita hacer la solicitud HTTP real. Agrega estos nodos:

#### HTTP Request 1: Knowledge Base Search

**Configuración:**
- **Method:** POST
- **URL:** `http://localhost:3000/api/vector-search/knowledge`
  - En producción: `https://tu-dominio.com/api/vector-search/knowledge`
- **Authentication:** Header Auth
  - **Name:** `x-api-key`
  - **Value:** `{{$env.N8N_WEBHOOK_API_KEY}}`
- **Body:** JSON
  ```json
  {
    "query": "{{$json.arguments.query}}",
    "limit": "{{$json.arguments.limit || 5}}",
    "minSimilarity": "{{$json.arguments.minSimilarity || 0.7}}"
  }
  ```

#### HTTP Request 2: Cases Search

**Configuración:**
- **Method:** POST
- **URL:** `http://localhost:3000/api/vector-search/cases`
  - En producción: `https://tu-dominio.com/api/vector-search/cases`
- **Authentication:** Header Auth
  - **Name:** `x-api-key`
  - **Value:** `{{$env.N8N_WEBHOOK_API_KEY}}`
- **Body:** JSON
  ```json
  {
    "query": "{{$json.arguments.query}}",
    "userId": "{{$json.arguments.userId}}",
    "limit": "{{$json.arguments.limit || 5}}"
  }
  ```

### Paso 4: Conectar el Flujo

El flujo completo debería verse así:

```
┌─────────────────────────┐
│ Microsoft Outlook       │
│ Trigger                 │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ OpenAI Chat Model       │
│ (with function calling) │
└────────────┬────────────┘
             │
             ├──[IF function_call = search_knowledge_base]──┐
             │                                                ▼
             │                              ┌─────────────────────────────┐
             │                              │ HTTP Request:               │
             │                              │ /api/vector-search/knowledge│
             │                              └──────────────┬──────────────┘
             │                                             │
             │                                             ▼
             │                              ┌─────────────────────────────┐
             │                              │ Return to OpenAI with       │
             │                              │ function result             │
             │                              └──────────────┬──────────────┘
             │                                             │
             │◄────────────────────────────────────────────┘
             │
             ├──[IF function_call = search_resolved_cases]──┐
             │                                                ▼
             │                              ┌─────────────────────────────┐
             │                              │ HTTP Request:               │
             │                              │ /api/vector-search/cases    │
             │                              └──────────────┬──────────────┘
             │                                             │
             │                                             ▼
             │                              ┌─────────────────────────────┐
             │                              │ Return to OpenAI with       │
             │                              │ function result             │
             │                              └──────────────┬──────────────┘
             │                                             │
             │◄────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────┐
│ OpenAI Final Response   │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ HTTP Request:           │
│ /api/n8n/webhook        │
└─────────────────────────┘
```

### Paso 5: Actualizar el Prompt de OpenAI

Modifica el prompt del nodo de OpenAI para incluir instrucciones sobre cuándo usar las herramientas:

```
Analyze this email and categorize it. If you need additional context:
- Use `search_knowledge_base` to find relevant documentation or guides
- Use `search_resolved_cases` to find how similar issues were resolved before

Return JSON with:
- category: bug | feature | question | support | other
- sentiment: positive | negative | neutral
- priority: low | medium | high | urgent
- tags: array of relevant tags
- summary: brief summary (include insights from knowledge base if found)

Email Subject: {{$json.subject}}
Email From: {{$json.from}}
Email Body: {{$json.bodyPreview}}
```

## 🧪 Probar la Integración

### 1. Verificar Endpoints (Health Check)

```bash
# Verificar endpoint de conocimientos
curl http://localhost:3000/api/vector-search/knowledge

# Verificar endpoint de casos
curl http://localhost:3000/api/vector-search/cases
```

### 2. Prueba de Búsqueda en Base de Conocimientos

```bash
curl -X POST http://localhost:3000/api/vector-search/knowledge \
  -H "Content-Type: application/json" \
  -H "x-api-key: TU_N8N_WEBHOOK_API_KEY" \
  -d '{
    "query": "¿Cómo configurar el agente de IA?",
    "limit": 3,
    "minSimilarity": 0.7
  }'
```

**Respuesta esperada:**
```json
{
  "success": true,
  "query": "¿Cómo configurar el agente de IA?",
  "resultsCount": 2,
  "results": [
    {
      "documentId": "doc_abc123",
      "documentTitle": "Configuración del Agente",
      "category": "setup",
      "content": "## Configuración del Agente\n\nPara configurar el agente...",
      "similarity": 0.92
    }
  ],
  "metadata": {
    "limit": 3,
    "minSimilarity": 0.7,
    "totalFound": 2,
    "filtered": 0
  }
}
```

### 3. Prueba de Búsqueda de Casos

```bash
curl -X POST http://localhost:3000/api/vector-search/cases \
  -H "Content-Type: application/json" \
  -H "x-api-key: TU_N8N_WEBHOOK_API_KEY" \
  -d '{
    "query": "problema con inicio de sesión",
    "userId": "USER_ID_AQUI",
    "limit": 3
  }'
```

## 📊 Ventajas de Esta Integración

✅ **Contexto Enriquecido:** OpenAI puede consultar documentación relevante antes de categorizar

✅ **Soluciones Previas:** Puede encontrar cómo se resolvieron problemas similares

✅ **Búsqueda Semántica:** No busca palabras exactas, entiende el significado

✅ **Ultra Rápido:** pgvector con índices HNSW = búsquedas en milisegundos

✅ **Escalable:** Funciona con millones de documentos

## 🔍 Ejemplo de Flujo Completo

**Email recibido:**
```
Subject: "No puedo iniciar sesión en la aplicación"
Body: "Hola, estoy intentando acceder pero me dice que mi contraseña es incorrecta"
```

**OpenAI decide consultar:**
1. Llama a `search_knowledge_base("problemas de autenticación")`
2. Recibe documentación sobre el sistema de login
3. Llama a `search_resolved_cases("no puedo iniciar sesión")`
4. Encuentra 2 casos similares resueltos
5. Analiza el email con todo este contexto

**Resultado final:**
```json
{
  "category": "support",
  "sentiment": "neutral",
  "priority": "medium",
  "tags": ["authentication", "login", "password"],
  "summary": "Usuario con problema de login. Similar al caso #123 resuelto con reset de contraseña. Documentación sugiere verificar que el email esté confirmado."
}
```

## 🛠️ Solución de Problemas

### Error: "OpenAI API key not configured"

**Causa:** No está configurada la variable `OPENAI_API_KEY`

**Solución:**
```bash
# Agregar a .env.local
OPENAI_API_KEY="sk-..."
```

### Error: "Unauthorized: Invalid or missing API key"

**Causa:** La API key de n8n no es correcta

**Solución:**
- Verifica que `N8N_WEBHOOK_API_KEY` en `.env.local` coincida con la que usas en n8n

### Error: "No results found"

**Causa:** La base de conocimientos está vacía o no tiene embeddings

**Solución:**
```bash
# Cargar documentos de la carpeta docs/
npx tsx scripts/load-knowledge-base.ts

# Verificar que hay documentos
npx tsx -e "import {PrismaClient} from '@prisma/client'; const p = new PrismaClient(); p.knowledgeDocument.count().then(c => console.log('Docs:', c)).finally(() => p.$disconnect())"
```

### La búsqueda es lenta

**Causa:** Los índices HNSW no están creados

**Solución:**
```bash
# Ejecutar migración de pgvector
node migrate-to-pgvector.js
```

## 📚 Recursos Adicionales

- [Documentación de pgvector](https://github.com/pgvector/pgvector)
- [OpenAI Function Calling](https://platform.openai.com/docs/guides/function-calling)
- [n8n HTTP Request Node](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/)

## 🔐 Seguridad

- ✅ Los endpoints requieren autenticación con API key
- ✅ Solo accesibles con `N8N_WEBHOOK_API_KEY`
- ✅ Validación de parámetros en todos los endpoints
- ✅ Rate limiting habilitado (heredado de n8n webhook)

## 🎯 Próximos Pasos Recomendados

1. **Cargar Base de Conocimientos:**
   ```bash
   npx tsx scripts/load-knowledge-base.ts
   ```

2. **Probar los Endpoints Manualmente** (como se mostró arriba)

3. **Configurar n8n** siguiendo los pasos de esta guía

4. **Probar con un Email Real** en el flujo de n8n

5. **Monitorear Resultados** en el dashboard de n8n

---

**¡Listo para usar! 🚀**

Ahora tu flujo de n8n puede aprovechar el poder de la búsqueda vectorial en Supabase para dar a OpenAI contexto enriquecido durante el análisis de emails.
