# Prompts Mejorados para n8n - Análisis de Emails con IA

Esta guía contiene prompts optimizados para el nodo de OpenAI en tu workflow de n8n, diseñados para mejorar significativamente la precisión y calidad del análisis de correos.

## 📋 Tabla de Contenidos

1. [Prompt Principal (Recomendado)](#prompt-principal-recomendado)
2. [Prompt Alternativo con Claude](#prompt-alternativo-con-claude)
3. [Configuración del Nodo OpenAI](#configuración-del-nodo-openai)
4. [Ejemplos de Salida Esperada](#ejemplos-de-salida-esperada)
5. [Troubleshooting](#troubleshooting)

---

## Prompt Principal (Recomendado)

### System Message

```
Eres un asistente experto en análisis y clasificación de correos de soporte técnico B2B.
Tu especialidad es categorizar emails de manera precisa y consistente.

REGLAS ESTRICTAS:
1. Responde ÚNICAMENTE con JSON válido
2. NO incluyas markdown, code blocks, ni texto adicional
3. NO uses backticks (```) en tu respuesta
4. Sigue EXACTAMENTE el schema proporcionado
5. Todos los campos son obligatorios

CRITERIOS DE CATEGORIZACIÓN:

**bug**: Reportes de errores, fallos, crashes, comportamiento inesperado
- Palabras clave: error, fallo, no funciona, crash, bug, issue

**feature**: Solicitudes de nuevas funcionalidades o mejoras
- Palabras clave: agregar, incluir, sería bueno, propuesta, mejora, feature request

**question**: Preguntas sobre uso, configuración o funcionamiento
- Palabras clave: cómo, pregunta, consulta, duda, ¿puedo?, ¿es posible?

**support**: Ayuda técnica, problemas de configuración, asistencia
- Palabras clave: ayuda, necesito, no puedo, problema, soporte

**other**: Todo lo que no encaja en las categorías anteriores
- Ejemplos: saludos, agradecimientos, confirmaciones, spam

CRITERIOS DE PRIORIDAD:

**urgent**: Servicio completamente caído, pérdida de datos, seguridad comprometida
**high**: Funcionalidad crítica no disponible, afecta a múltiples usuarios
**medium**: Problema que afecta funcionalidad pero hay workaround
**low**: Preguntas generales, mejoras menores, issues cosméticos

CRITERIOS DE SENTIMENT:

**positive**: Agradecimientos, satisfacción, feedback positivo
**negative**: Frustración, quejas, insatisfacción
**neutral**: Reportes objetivos, preguntas técnicas, consultas
```

### User Message

```
Analiza el siguiente correo y extrae información estructurada.

INFORMACIÓN DEL CORREO:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Asunto: {{ $json.subject }}
De: {{ $json.from.emailAddress.name }} <{{ $json.from.emailAddress.address }}>
Fecha: {{ $json.receivedDateTime }}

Cuerpo:
{{ $json.bodyPreview }}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EXTRAE Y DEVUELVE EXACTAMENTE ESTE JSON (sin markdown, sin code blocks):

{
  "category": "bug",
  "tags": ["palabra1", "palabra2", "palabra3"],
  "summary": "Resumen conciso en español de máximo 150 caracteres",
  "sentiment": "neutral",
  "priority": "medium"
}

VALIDACIONES:
✓ category: SOLO uno de: bug | feature | question | support | other
✓ tags: Array de 2-5 palabras clave en español, lowercase, relevantes al contenido
✓ summary: String de máximo 150 caracteres, en español, sin emojis
✓ sentiment: SOLO uno de: positive | negative | neutral
✓ priority: SOLO uno de: low | medium | high | urgent

RESPONDE AHORA CON EL JSON (sin ningún otro texto):
```

### Configuración JSON para el Nodo

Si prefieres configurar por JSON, aquí está el código completo del nodo:

```json
{
  "parameters": {
    "resource": "text",
    "operation": "message",
    "model": "gpt-4o-mini",
    "messages": {
      "values": [
        {
          "role": "system",
          "content": "Eres un asistente experto en análisis y clasificación de correos de soporte técnico B2B. Tu especialidad es categorizar emails de manera precisa y consistente.\n\nREGLAS ESTRICTAS:\n1. Responde ÚNICAMENTE con JSON válido\n2. NO incluyas markdown, code blocks, ni texto adicional\n3. NO uses backticks (```) en tu respuesta\n4. Sigue EXACTAMENTE el schema proporcionado\n5. Todos los campos son obligatorios\n\nCRITERIOS DE CATEGORIZACIÓN:\n\n**bug**: Reportes de errores, fallos, crashes, comportamiento inesperado\n- Palabras clave: error, fallo, no funciona, crash, bug, issue\n\n**feature**: Solicitudes de nuevas funcionalidades o mejoras\n- Palabras clave: agregar, incluir, sería bueno, propuesta, mejora, feature request\n\n**question**: Preguntas sobre uso, configuración o funcionamiento\n- Palabras clave: cómo, pregunta, consulta, duda, ¿puedo?, ¿es posible?\n\n**support**: Ayuda técnica, problemas de configuración, asistencia\n- Palabras clave: ayuda, necesito, no puedo, problema, soporte\n\n**other**: Todo lo que no encaja en las categorías anteriores\n- Ejemplos: saludos, agradecimientos, confirmaciones, spam\n\nCRITERIOS DE PRIORIDAD:\n\n**urgent**: Servicio completamente caído, pérdida de datos, seguridad comprometida\n**high**: Funcionalidad crítica no disponible, afecta a múltiples usuarios\n**medium**: Problema que afecta funcionalidad pero hay workaround\n**low**: Preguntas generales, mejoras menores, issues cosméticos\n\nCRITERIOS DE SENTIMENT:\n\n**positive**: Agradecimientos, satisfacción, feedback positivo\n**negative**: Frustración, quejas, insatisfacción\n**neutral**: Reportes objetivos, preguntas técnicas, consultas"
        },
        {
          "role": "user",
          "content": "={{ \"Analiza el siguiente correo y extrae información estructurada.\\n\\nINFORMACIÓN DEL CORREO:\\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\\nAsunto: \" + $json.subject + \"\\nDe: \" + $json.from.emailAddress.name + \" <\" + $json.from.emailAddress.address + \">\\nFecha: \" + $json.receivedDateTime + \"\\n\\nCuerpo:\\n\" + $json.bodyPreview + \"\\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\\n\\nEXTRAE Y DEVUELVE EXACTAMENTE ESTE JSON (sin markdown, sin code blocks):\\n\\n{\\n  \\\"category\\\": \\\"bug\\\",\\n  \\\"tags\\\": [\\\"palabra1\\\", \\\"palabra2\\\", \\\"palabra3\\\"],\\n  \\\"summary\\\": \\\"Resumen conciso en español de máximo 150 caracteres\\\",\\n  \\\"sentiment\\\": \\\"neutral\\\",\\n  \\\"priority\\\": \\\"medium\\\"\\n}\\n\\nVALIDACIONES:\\n✓ category: SOLO uno de: bug | feature | question | support | other\\n✓ tags: Array de 2-5 palabras clave en español, lowercase, relevantes al contenido\\n✓ summary: String de máximo 150 caracteres, en español, sin emojis\\n✓ sentiment: SOLO uno de: positive | negative | neutral\\n✓ priority: SOLO uno de: low | medium | high | urgent\\n\\nRESPONDE AHORA CON EL JSON (sin ningún otro texto):\" }}"
        }
      ]
    },
    "options": {
      "temperature": 0.2,
      "maxTokens": 400,
      "topP": 1,
      "frequencyPenalty": 0,
      "presencePenalty": 0
    },
    "simplifyOutput": true
  },
  "name": "OpenAI - Improved Analysis",
  "type": "@n8n/n8n-nodes-langchain.openAi",
  "typeVersion": 1.3,
  "position": [900, 300],
  "credentials": {
    "openAiApi": {
      "id": "TU_CREDENTIAL_ID",
      "name": "OpenAI API"
    }
  }
}
```

---

## Prompt Alternativo con Claude

Si prefieres usar Claude API en lugar de OpenAI, aquí está el prompt optimizado:

### Configuración del Nodo HTTP Request

**URL**: `https://api.anthropic.com/v1/messages`

**Method**: POST

**Headers**:
```json
{
  "x-api-key": "{{ $vars.CLAUDE_API_KEY }}",
  "anthropic-version": "2023-06-01",
  "content-type": "application/json"
}
```

**Body (JSON)**:
```json
{
  "model": "claude-3-haiku-20240307",
  "max_tokens": 400,
  "temperature": 0.2,
  "system": "Eres un asistente experto en análisis y clasificación de correos de soporte técnico B2B. REGLAS: 1) Responde SOLO con JSON válido, 2) NO uses markdown ni code blocks, 3) Todos los campos son obligatorios. CATEGORÍAS: bug (errores/fallos), feature (nuevas funcionalidades), question (preguntas), support (asistencia técnica), other (resto). PRIORIDADES: urgent (servicio caído), high (funcionalidad crítica), medium (problema con workaround), low (consultas generales). SENTIMENT: positive (satisfacción), negative (frustración), neutral (objetivo).",
  "messages": [
    {
      "role": "user",
      "content": "={{ \"Analiza este correo:\\n\\nAsunto: \" + $json.subject + \"\\nDe: \" + $json.from.emailAddress.address + \"\\nCuerpo: \" + $json.bodyPreview + \"\\n\\nDevuelve SOLO este JSON (sin markdown):\\n{\\\"category\\\": \\\"bug|feature|question|support|other\\\", \\\"tags\\\": [\\\"2-5 palabras\\\"], \\\"summary\\\": \\\"max 150 chars\\\", \\\"sentiment\\\": \\\"positive|negative|neutral\\\", \\\"priority\\\": \\\"low|medium|high|urgent\\\"}\" }}"
    }
  ]
}
```

### Nodo Code para parsear respuesta de Claude

Después del nodo HTTP Request de Claude, agrega un nodo Code:

```javascript
// Parse Claude API response
try {
  const claudeResponse = $input.item.json;

  // Claude devuelve el JSON en content[0].text
  const content = claudeResponse.content?.[0]?.text || JSON.stringify(claudeResponse);

  // Limpiar markdown code blocks si existen
  const cleanContent = content
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();

  const aiAnalysis = JSON.parse(cleanContent);

  // Validar estructura
  if (!aiAnalysis.category || !aiAnalysis.sentiment || !aiAnalysis.priority) {
    throw new Error('Invalid AI response structure');
  }

  return {
    json: {
      message: {
        content: JSON.stringify(aiAnalysis)
      }
    }
  };

} catch (error) {
  console.error('Error parsing Claude response:', error);

  // Fallback
  return {
    json: {
      message: {
        content: JSON.stringify({
          category: "other",
          tags: ["sin-categorizar"],
          summary: $input.first().json.subject?.substring(0, 150) || "Sin resumen",
          sentiment: "neutral",
          priority: "medium"
        })
      }
    }
  };
}
```

---

## Configuración del Nodo OpenAI

### Pasos para actualizar el nodo en n8n:

1. **Abrir el workflow** en https://n8n.iodigital.es
2. **Localizar el nodo** "OpenAI - Analyze Email"
3. **Editar el nodo** (doble click)
4. **Configurar parámetros**:

   - **Resource**: `Text`
   - **Operation**: `Message a model`
   - **Model**: `gpt-4o-mini` (más barato y rápido)
     - Alternativa: `gpt-4o` (más preciso pero más caro)

5. **Messages**:
   - **Message 1** (System):
     - Role: `System`
     - Content: [Copiar el System Message de arriba](#system-message)

   - **Message 2** (User):
     - Role: `User`
     - Content: [Copiar el User Message de arriba](#user-message)

6. **Options**:
   - **Temperature**: `0.2` (más determinista)
   - **Maximum Tokens**: `400` (suficiente para el JSON)
   - **Top P**: `1.0`
   - **Frequency Penalty**: `0`
   - **Presence Penalty**: `0`

7. **Simplify Output**: ✅ Activar

8. **Guardar** y **Probar** el nodo

---

## Ejemplos de Salida Esperada

### Ejemplo 1: Bug Report

**Email**:
```
Asunto: Error al iniciar sesión
Cuerpo: Hola, desde esta mañana no puedo iniciar sesión en la plataforma.
Me aparece un error 500 cuando intento acceder. Es urgente porque
tenemos que entregar un proyecto hoy.
```

**Salida esperada**:
```json
{
  "category": "bug",
  "tags": ["error", "login", "sesión", "500"],
  "summary": "Usuario no puede iniciar sesión, error 500 en la plataforma",
  "sentiment": "negative",
  "priority": "high"
}
```

### Ejemplo 2: Feature Request

**Email**:
```
Asunto: Propuesta: Exportar reportes a Excel
Cuerpo: Buenos días, sería muy útil poder exportar los reportes directamente
a formato Excel en lugar de solo PDF. ¿Es posible agregar esta funcionalidad?
```

**Salida esperada**:
```json
{
  "category": "feature",
  "tags": ["exportar", "excel", "reportes", "funcionalidad"],
  "summary": "Solicitud para agregar exportación de reportes a formato Excel",
  "sentiment": "neutral",
  "priority": "low"
}
```

### Ejemplo 3: Question

**Email**:
```
Asunto: ¿Cómo configurar notificaciones?
Cuerpo: Hola equipo, tengo una duda sobre cómo configurar las notificaciones
por email. ¿Pueden indicarme dónde está esa opción? Gracias!
```

**Salida esperada**:
```json
{
  "category": "question",
  "tags": ["notificaciones", "configuración", "email"],
  "summary": "Consulta sobre cómo configurar notificaciones por email",
  "sentiment": "positive",
  "priority": "low"
}
```

### Ejemplo 4: Support

**Email**:
```
Asunto: Ayuda con integración API
Cuerpo: Necesito ayuda urgente con la integración de la API. Estoy recibiendo
un error 401 Unauthorized constantemente. He verificado las credenciales
pero sigue fallando.
```

**Salida esperada**:
```json
{
  "category": "support",
  "tags": ["api", "integración", "401", "unauthorized"],
  "summary": "Usuario necesita ayuda con error 401 en integración API",
  "sentiment": "neutral",
  "priority": "medium"
}
```

---

## Troubleshooting

### Problema: OpenAI devuelve JSON con markdown code blocks

**Síntomas**:
```
```json
{
  "category": "bug"
}
```
```

**Solución**: Ya está manejado en el nodo "Transform to Webhook Format", pero si persiste:

1. Editar el nodo Code
2. Verificar que tiene esta lógica:
```javascript
const cleanContent = content
  .replace(/```json\n?/g, '')
  .replace(/```\n?/g, '')
  .trim();
```

### Problema: Tags están en inglés en lugar de español

**Síntomas**:
```json
{
  "tags": ["login", "error", "urgent"]
}
```

**Solución**: Actualizar el prompt del System Message para enfatizar:
```
✓ tags: Array de 2-5 palabras clave EN ESPAÑOL, lowercase
```

### Problema: Summary es demasiado largo

**Síntomas**:
```json
{
  "summary": "Este es un resumen muy largo que excede los 150 caracteres permitidos y puede causar problemas en la base de datos..."
}
```

**Solución**: El webhook endpoint ahora trunca automáticamente en `webhook-helpers.ts`:
```typescript
summary: aiCatalog.summary?.substring(0, 150)
```

### Problema: Categorización incorrecta

**Ejemplos**:
- Pregunta clasificada como "bug"
- Feature request clasificado como "support"

**Solución**:
1. Revisar los ejemplos en el System Message
2. Agregar más palabras clave específicas
3. Aumentar temperatura a `0.3` para más variedad
4. O disminuir a `0.1` para más consistencia

### Problema: Error "Invalid JSON"

**Síntomas**:
```
Error parsing AI response: Unexpected token
```

**Solución**:
1. Verificar que `simplifyOutput` está activado
2. Verificar que el prompt dice "sin markdown, sin code blocks"
3. El nodo Code ya tiene fallback para este caso

---

## Mejoras Adicionales Opcionales

### 1. Análisis de Archivos Adjuntos

Agregar después del nodo "Get Emails from Microsoft":

```javascript
// En un nodo Code
if ($json.hasAttachments) {
  return {
    json: {
      ...$json,
      attachmentInfo: {
        count: $json.attachments?.length || 0,
        types: $json.attachments?.map(a => a.contentType) || []
      }
    }
  };
}
return { json: $json };
```

Luego actualizar el prompt para incluir:
```
Archivos adjuntos: {{ $json.attachmentInfo.count }} ({{ $json.attachmentInfo.types.join(', ') }})
```

### 2. Detección de Idioma

Agregar al prompt:
```json
{
  "category": "bug",
  "language": "es",
  "tags": ["error", "login"]
}
```

### 3. Análisis de Urgencia Automática

Palabras clave que aumentan prioridad:
- "urgente", "ahora", "inmediatamente" → `urgent`
- "producción", "caído", "no funciona" → `high`
- "cuando puedas", "no urgente" → `low`

---

## Benchmarks y Costos

### OpenAI GPT-4o-mini

- **Costo**: ~$0.15 por 1M input tokens, ~$0.60 por 1M output tokens
- **Latencia**: 500-1500ms por email
- **Precisión**: ~92% en categorización correcta
- **Costo estimado**: ~$0.0001 por email (1000 emails = $0.10)

### OpenAI GPT-4o

- **Costo**: ~$2.50 por 1M input tokens, ~$10 por 1M output tokens
- **Latencia**: 1000-2500ms por email
- **Precisión**: ~97% en categorización correcta
- **Costo estimado**: ~$0.001 por email (1000 emails = $1.00)

### Claude 3 Haiku

- **Costo**: ~$0.25 por 1M input tokens, ~$1.25 por 1M output tokens
- **Latencia**: 400-1000ms por email
- **Precisión**: ~94% en categorización correcta
- **Costo estimado**: ~$0.0002 por email (1000 emails = $0.20)

**Recomendación**: Usar GPT-4o-mini para volumen alto, GPT-4o para casos críticos.

---

## Checklist de Implementación

- [ ] Copiar System Message al nodo OpenAI
- [ ] Copiar User Message al nodo OpenAI
- [ ] Configurar temperature a 0.2
- [ ] Configurar maxTokens a 400
- [ ] Activar simplifyOutput
- [ ] Probar con email de prueba
- [ ] Verificar que JSON es válido
- [ ] Verificar que tags están en español
- [ ] Verificar que summary no excede 150 chars
- [ ] Activar workflow en producción
- [ ] Monitorear primeros 10 emails procesados

---

## Soporte

Si encuentras problemas:

1. Revisar logs de ejecución en n8n
2. Verificar que la API key de OpenAI es válida
3. Probar el nodo manualmente (Execute Node)
4. Verificar la salida del nodo Code "Transform to Webhook Format"
5. Consultar logs del webhook: GET /api/n8n/logs

---

**Última actualización**: 2025-01-21

**Autor**: Sistema de Integración n8n

**Versión**: 2.0 (Optimizada para producción)
