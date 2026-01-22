# Sistema de Aprendizaje del Agente - Guía de Implementación

## 📋 Resumen

Se ha implementado un sistema completo de aprendizaje continuo para el agente de IA de PolarisAI. El agente ahora puede:

1. ✅ **Recibir feedback de los usuarios** (👍/👎, comentarios)
2. ✅ **Extraer automáticamente casos** de tickets resueltos
3. ✅ **Aprender de correcciones manuales** de los usuarios
4. ✅ **Acceder a un manual completo** de funcionamiento de la aplicación
5. ✅ **Estar disponible en múltiples ubicaciones** (emails + página de ayuda dedicada)

---

## 🎯 Funcionalidades Implementadas

### 1. Sistema de Feedback (`/api/agent/feedback`)

**Archivo**: `src/app/api/agent/feedback/route.ts`

Los usuarios pueden dar feedback de 3 formas:

- **Rating**: 👍 (positivo) o 👎 (negativo)
- **Comentarios**: Explicar qué les gustó o qué podría mejorar
- **Correcciones**: Editar la respuesta del agente con la versión correcta

**Componente UI**: `src/components/agent-message-feedback.tsx`

Este componente se muestra automáticamente después de cada respuesta del agente en el chat.

**Cómo funciona:**
```typescript
POST /api/agent/feedback
{
  "emailId": "email_id",
  "conversationId": "conv_id",
  "messageId": "msg_id",
  "feedbackType": "rating" | "correction",
  "rating": 1 | -1,
  "comment": "Texto opcional",
  "originalSuggestion": "Respuesta original",
  "userChoice": "Respuesta corregida"
}
```

### 2. Extracción Automática de Casos

**Archivo**: `src/lib/agent/learning/auto-case-creator.ts`

Cuando un email se marca como "Resolved" o "Closed", el sistema automáticamente:

1. Verifica que tenga notas de resolución (mínimo 50 caracteres)
2. Extrae toda la información relevante (asunto, contenido, solución)
3. Genera embeddings para búsqueda semántica
4. Crea un caso en la base de datos
5. Marca el email con `hasCase = true`

**Integración automática:**
```typescript
// En src/app/api/emails/[id]/route.ts
// Se ejecuta automáticamente al actualizar el estado del email
PATCH /api/emails/{id}
{
  "status": "Resolved",
  "resolutionNotes": "Solución detallada..."
}
```

**Funciones principales:**
- `createCaseFromResolvedEmail()`: Crea un caso individual
- `processResolvedEmailsWithoutCases()`: Procesa emails en batch (para migración)
- `updateCaseEmbedding()`: Regenera embeddings de casos existentes

### 3. Sistema de Correcciones Manuales

Integrado en el sistema de feedback. Cuando un usuario corrige una respuesta:

1. Se guarda la versión original y la corregida
2. Se almacena en `AgentFeedback` con tipo `correction`
3. El sistema puede usar estas correcciones para:
   - Analizar patrones de error
   - Mejorar prompts
   - Fine-tuning futuro

### 4. Manual de Funcionamiento

**Carpeta**: `docs/`

Se han creado 6 documentos Markdown completos:

1. **01-introduccion.md**: Introducción general a PolarisAI
2. **02-gestion-emails.md**: Gestión de correos electrónicos
3. **03-agente-ia.md**: Cómo usar el agente de IA
4. **04-gestion-casos.md**: Gestión de casos y tickets
5. **05-etiquetas-organizacion.md**: Sistema de etiquetas
6. **06-configuracion.md**: Configuración y ajustes

**Script de carga**: `scripts/load-knowledge-base.ts`

Este script:
- Lee todos los archivos `.md` de la carpeta `docs/`
- Divide cada documento en chunks (secciones H2)
- Genera embeddings para cada chunk
- Guarda todo en las tablas `KnowledgeDocument` y `KnowledgeChunk`

### 5. Página Dedicada de Ayuda

**Archivo**: `src/app/dashboard/help/page.tsx`
**API**: `src/app/api/agent/help/route.ts`

Nueva página accesible desde el sidebar en **"Centro de Ayuda"**.

Características:
- Chat exclusivo para preguntas sobre la aplicación
- Búsqueda solo en la base de conocimientos (manual)
- Preguntas sugeridas frecuentes
- Muestra las fuentes de información usadas
- No se mezcla con conversaciones de tickets

---

## 🚀 Cómo Usar el Sistema

### Paso 1: Cargar el Manual en la Base de Datos

```bash
# Instalar dependencias si es necesario
npm install

# Ejecutar el script de carga
npx tsx scripts/load-knowledge-base.ts
```

**Salida esperada:**
```
============================================================
Cargador de Base de Conocimientos
============================================================

Encontrados 6 documentos para procesar:
  - 01-introduccion.md
  - 02-gestion-emails.md
  - 03-agente-ia.md
  - 04-gestion-casos.md
  - 05-etiquetas-organizacion.md
  - 06-configuracion.md

Procesando: 01-introduccion.md
  Generando embedding del documento...
  Documento creado: abc123
  Procesando 3 chunks...
    Chunk 1/3 procesado
    Chunk 2/3 procesado
    Chunk 3/3 procesado
✓ Documento completado: Introducción a PolarisAI

...

============================================================
✓ Carga completada exitosamente
============================================================
Total documentos: 6
Total chunks: 28

Los documentos están ahora disponibles para el agente de IA
```

### Paso 2: Verificar la Configuración

Asegúrate de tener estas variables de entorno en tu `.env`:

```env
# Modelos de IA
ANTHROPIC_API_KEY=tu_api_key
OPENAI_API_KEY=tu_api_key

DEFAULT_FAST_MODEL=claude-3-5-haiku-20241022
DEFAULT_QUALITY_MODEL=claude-3-5-sonnet-20241022

# RAG (Retrieval-Augmented Generation)
ENABLE_RAG=true
RAG_KNOWLEDGE_BASE_TOP_K=5
RAG_HISTORICAL_CASES_TOP_K=10
RAG_MIN_SIMILARITY=0.75

# Conversación
CONVERSATION_SUMMARY_THRESHOLD=8000
```

### Paso 3: Usar el Sistema

#### A. Chat en Emails (Ya existente)

1. Abre cualquier email
2. Haz clic en "Chat IA"
3. Pregunta al agente
4. Después de cada respuesta:
   - Haz clic en 👍 si te gustó
   - Haz clic en 👎 si no te gustó
   - Añade un comentario explicando por qué
   - O haz clic en "Corregir respuesta" para editar

#### B. Resolución de Tickets con Aprendizaje Automático

1. Gestiona un ticket normalmente
2. Cuando lo resuelvas:
   ```
   Estado: Resolved
   Notas de Resolución: [Escribe DETALLADAMENTE cómo lo resolviste]
   ```
3. Haz clic en "Guardar Cambios"
4. **El sistema creará automáticamente un caso**
5. Este caso estará disponible para futuras sugerencias

**Ejemplo de buenas notas de resolución:**
```
Problema: El cliente no podía iniciar sesión en el panel

Diagnóstico:
1. Revisé los logs y encontré error: "Invalid token"
2. El token OAuth había expirado

Solución:
1. Desconecté la cuenta de Microsoft en Configuración
2. Volví a conectar la cuenta
3. Reautenticé con OAuth
4. Probé el acceso exitosamente

Tiempo de resolución: 10 minutos
Causa raíz: Token OAuth expirado después de 90 días
```

#### C. Centro de Ayuda

1. Haz clic en "Centro de Ayuda" en el sidebar
2. Pregunta cualquier cosa sobre la aplicación:
   - "¿Cómo sincronizo mis emails?"
   - "¿Qué es un caso?"
   - "¿Cómo creo etiquetas?"
3. El agente buscará en el manual y responderá
4. Verás las fuentes usadas debajo de cada respuesta

---

## 📊 Flujo de Aprendizaje

```
┌─────────────────┐
│ Usuario usa     │
│ el agente       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Agente responde │
│ con sugerencia  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│ Usuario da feedback:            │
│ - 👍/👎 Rating                   │
│ - Comentario                    │
│ - Corrección                    │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────┐
│ Feedback guardado   │
│ en AgentFeedback    │
└────────┬────────────┘
         │
         ▼
┌──────────────────────────────┐
│ Usuario resuelve el ticket   │
│ con notas de resolución      │
└────────┬─────────────────────┘
         │
         ▼
┌────────────────────────────┐
│ Sistema crea caso          │
│ automáticamente con        │
│ embeddings                 │
└────────┬───────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ Caso disponible para:       │
│ - RAG en futuros tickets    │
│ - Sugerencias automáticas   │
│ - Búsqueda de similares     │
└─────────────────────────────┘
```

---

## 🗄️ Estructura de Base de Datos

### Tablas Principales

#### `AgentFeedback`
```sql
CREATE TABLE "AgentFeedback" (
  id                 String    @id @default(cuid())
  userId             String
  emailId            String?
  conversationId     String?
  messageId          String?
  feedbackType       String    -- rating | correction | suggestion_accepted | suggestion_rejected
  originalSuggestion String?   -- Sugerencia original del agente
  userChoice         String?   -- Versión corregida por el usuario
  rating             Int?      -- 1 (positivo) o -1 (negativo)
  comment            String?   -- Comentario del usuario
  metadata           String?   -- JSON metadata adicional
  createdAt          DateTime  @default(now())
)
```

#### `Case`
```sql
CREATE TABLE "Case" (
  id          String    @id @default(cuid())
  userId      String
  emailId     String    @unique
  title       String
  description String?   -- Descripción del problema
  resolution  String?   -- Solución aplicada
  response    String?   -- Respuesta enviada al cliente
  tags        String?   -- JSON array de tags
  priority    String?
  status      String    @default("open")
  category    String?   -- bug, feature, question, etc.
  embedding   vector(1536)? -- Embedding para RAG
  resolvedAt  DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
)
```

#### `KnowledgeDocument` y `KnowledgeChunk`
```sql
CREATE TABLE "KnowledgeDocument" (
  id          String   @id @default(cuid())
  userId      String
  title       String
  content     String   -- Documento completo
  category    String?
  tags        String?
  embedding   vector(1536)?
  language    String?  @default("es")
  isPublished Boolean  @default(false)
  source      String?  -- docs/filename.md
  createdAt   DateTime @default(now())
)

CREATE TABLE "KnowledgeChunk" (
  id          String   @id @default(cuid())
  documentId  String
  content     String   -- Chunk del documento (sección)
  chunkIndex  Int      -- Orden del chunk
  embedding   vector(1536)?
  tokenCount  Int?
  metadata    String?  -- JSON metadata
  createdAt   DateTime @default(now())
)
```

---

## 📈 Métricas y Análisis

### Consultas SQL Útiles

#### 1. Ver feedback por tipo
```sql
SELECT feedbackType, COUNT(*) as count
FROM AgentFeedback
WHERE userId = 'user_id'
GROUP BY feedbackType;
```

#### 2. Rating promedio
```sql
SELECT
  COUNT(CASE WHEN rating = 1 THEN 1 END) as positivos,
  COUNT(CASE WHEN rating = -1 THEN 1 END) as negativos,
  ROUND(AVG(rating) * 100, 2) as porcentaje_satisfaccion
FROM AgentFeedback
WHERE rating IS NOT NULL
  AND userId = 'user_id';
```

#### 3. Casos creados por categoría
```sql
SELECT category, COUNT(*) as count
FROM Case
WHERE userId = 'user_id'
  AND status = 'resolved'
GROUP BY category
ORDER BY count DESC;
```

#### 4. Correcciones más frecuentes
```sql
SELECT
  LEFT(originalSuggestion, 50) as suggestion,
  LEFT(userChoice, 50) as correction,
  createdAt
FROM AgentFeedback
WHERE feedbackType = 'correction'
  AND userId = 'user_id'
ORDER BY createdAt DESC
LIMIT 10;
```

---

## 🔧 Mantenimiento

### Regenerar Embeddings

Si actualizas el manual o los casos:

```typescript
// Para documentos
import { updateCaseEmbedding } from '@/lib/agent/learning/auto-case-creator';

await updateCaseEmbedding(caseId);
```

```bash
# Recargar todo el manual
npx tsx scripts/load-knowledge-base.ts
```

### Procesar Emails Históricos

Si ya tienes emails resueltos sin casos:

```typescript
import { processResolvedEmailsWithoutCases } from '@/lib/agent/learning/auto-case-creator';

const stats = await processResolvedEmailsWithoutCases(userId);
console.log(stats);
// { processed: 50, created: 35, skipped: 10, errors: 5 }
```

### Limpiar Feedback Antiguo

```sql
-- Eliminar feedback de hace más de 1 año
DELETE FROM AgentFeedback
WHERE createdAt < NOW() - INTERVAL '1 year';
```

---

## 🎓 Mejores Prácticas

### Para Usuarios

1. **Da feedback regularmente**: Cada 👍/👎 ayuda al sistema a mejorar
2. **Escribe notas de resolución detalladas**: Mínimo 50 caracteres, idealmente 200-500
3. **Usa la función de corrección**: Si el agente se equivoca, corrígelo
4. **Consulta el Centro de Ayuda**: Para dudas sobre la aplicación
5. **Crea casos manualmente** para problemas complejos que quieras documentar

### Para Administradores

1. **Monitorea las métricas**: Revisa el feedback para identificar patrones
2. **Actualiza el manual**: Añade nuevas secciones según necesidad
3. **Revisa correcciones**: Analiza las correcciones frecuentes para mejorar prompts
4. **Limpia datos**: Elimina feedback y casos obsoletos periódicamente
5. **Fine-tuning**: Considera usar el feedback para fine-tuning del modelo

---

## ⚠️ Limitaciones y Consideraciones

### Costos de API

- **Embeddings (OpenAI)**: ~$0.0001 por 1000 tokens
- **Claude Sonnet**: $0.003 por 1000 tokens input, $0.015 por 1000 tokens output
- **Claude Haiku**: Más barato pero menor calidad

El sistema ya incluye optimizaciones:
- Cache de embeddings
- Resumen automático de conversaciones
- Selección inteligente de modelo (Haiku vs Sonnet)

### Privacidad

- El feedback se almacena con el `userId`
- Los casos contienen información de emails (cuidado con datos sensibles)
- Considera anonimizar datos si planeas fine-tuning externo

### Fine-Tuning (Futuro)

El sistema actual NO hace fine-tuning automático. Para implementarlo:

1. Exporta el feedback y casos
2. Crea dataset de entrenamiento
3. Usa la API de fine-tuning de Anthropic/OpenAI
4. Actualiza los modelos en las variables de entorno

---

## 📞 Soporte

Si tienes problemas:

1. **Revisa los logs**: `console.log` en el navegador y servidor
2. **Verifica la base de datos**: Consulta directamente las tablas
3. **Prueba endpoints directamente**: Usa Postman o curl
4. **Regenera embeddings**: Si las búsquedas no funcionan
5. **Recarga el manual**: Si el agente de ayuda no responde bien

---

## ✅ Checklist de Implementación

- [x] Sistema de feedback implementado
- [x] Extracción automática de casos funcionando
- [x] Manual de funcionamiento creado (6 documentos)
- [x] Script de carga del manual
- [x] Página de ayuda dedicada
- [x] Integración en el sidebar
- [x] Componentes UI para feedback
- [x] API endpoints creados
- [x] Documentación completa

**¡El sistema está listo para usar!** 🎉

Ejecuta el script de carga del manual y empieza a usar el sistema de aprendizaje continuo.
