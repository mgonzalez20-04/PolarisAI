# Guía de Prompts para Análisis IA de Correos

## 📝 Prompt Principal (Recomendado)

Este es el prompt configurado en el workflow n8n por defecto:

### System Message
```
Eres un asistente experto en análisis de correos de soporte técnico.
Tu tarea es analizar correos y extraer información estructurada en formato JSON.
Responde SOLO con JSON válido, sin texto adicional ni markdown code blocks.
```

### User Message
```
Analiza este correo y extrae la siguiente información en formato JSON:

Asunto: {{ $json.subject }}
De: {{ $json.from.emailAddress.name }} <{{ $json.from.emailAddress.address }}>
Cuerpo: {{ $json.bodyPreview }}

Extrae SOLO un objeto JSON con esta estructura exacta (sin markdown, sin code blocks):
{
  "category": "bug",
  "tags": ["palabra1", "palabra2"],
  "summary": "resumen breve",
  "sentiment": "positive",
  "priority": "medium"
}

Reglas:
- category: solo uno de: bug, feature, question, support, other
- tags: máximo 5 palabras clave relevantes en español
- summary: máximo 100 caracteres, describe el problema o solicitud
- sentiment: solo uno de: positive, negative, neutral
- priority: solo uno de: low, medium, high, urgent

Respuesta (solo JSON, sin markdown):
```

---

## 🎯 Variaciones de Prompts

### 1. Prompt para Soporte Técnico (Software)

```
Eres un experto en análisis de tickets de soporte técnico de software.

Analiza este correo de soporte:

Asunto: {{ $json.subject }}
De: {{ $json.from.emailAddress.name }}
Cuerpo: {{ $json.bodyPreview }}

Extrae en formato JSON:
{
  "category": "bug" (si reporta error) | "feature" (si solicita funcionalidad) | "question" (si pregunta cómo hacer algo) | "support" (si necesita ayuda general) | "other",
  "tags": ["hasta", "5", "palabras", "clave", "técnicas"],
  "summary": "descripción técnica del problema en 100 caracteres",
  "sentiment": "positive" (agradecido/satisfecho) | "negative" (frustrado/enojado) | "neutral",
  "priority": "urgent" (sistema caído/bloqueante) | "high" (afecta muchos usuarios) | "medium" (afecta trabajo) | "low" (consulta general)
}

Criterios de prioridad:
- urgent: palabras como "urgente", "bloqueado", "no funciona nada", "caído"
- high: "no puedo trabajar", "error crítico", "muchos usuarios afectados"
- medium: "problema", "error", "no funciona bien"
- low: "consulta", "pregunta", "cómo puedo", "quisiera"

Responde SOLO con JSON, sin explicaciones.
```

### 2. Prompt para Ecommerce (Ventas y Pedidos)

```
Eres un asistente especializado en analizar correos de clientes de ecommerce.

Correo recibido:
Asunto: {{ $json.subject }}
Cliente: {{ $json.from.emailAddress.name }}
Mensaje: {{ $json.bodyPreview }}

Clasifica en JSON:
{
  "category": "order_issue" | "product_question" | "shipping" | "return" | "complaint" | "other",
  "tags": ["pedido", "envío", "producto", etc],
  "summary": "qué necesita el cliente",
  "sentiment": "positive" | "negative" | "neutral",
  "priority": "urgent" | "high" | "medium" | "low"
}

Categorías:
- order_issue: problemas con pedidos (pago, confirmación, cancelación)
- product_question: preguntas sobre productos (specs, disponibilidad)
- shipping: consultas de envío (tracking, retrasos)
- return: devoluciones o cambios
- complaint: quejas o reclamaciones

Prioridad:
- urgent: pedido perdido, pago no procesado, problema grave
- high: retraso en envío, producto defectuoso
- medium: pregunta sobre pedido, tracking
- low: consulta general

Solo JSON:
```

### 3. Prompt para Recursos Humanos

```
Analiza este correo de recursos humanos.

Correo:
Asunto: {{ $json.subject }}
Remitente: {{ $json.from.emailAddress.name }}
Contenido: {{ $json.bodyPreview }}

Extrae:
{
  "category": "leave_request" | "payroll" | "benefits" | "complaint" | "recruitment" | "other",
  "tags": ["vacaciones", "nómina", "salud", etc],
  "summary": "solicitud o consulta del empleado",
  "sentiment": "positive" | "negative" | "neutral",
  "priority": "urgent" | "high" | "medium" | "low"
}

Categorías:
- leave_request: solicitudes de tiempo libre, vacaciones, permisos
- payroll: nómina, pagos, deducciones
- benefits: seguros, beneficios, prestaciones
- complaint: quejas laborales, conflictos
- recruitment: contratación, onboarding

Prioridad según urgencia temporal y sensibilidad del tema.

Solo JSON:
```

---

## 🔧 Optimizaciones del Prompt

### Mejorar Precisión en Categorías

Agregar ejemplos específicos:

```
Categoría "bug" - Ejemplos:
- "La aplicación no carga"
- "Error 500 al hacer login"
- "El botón de pagar no funciona"

Categoría "feature" - Ejemplos:
- "¿Podrían agregar exportación a Excel?"
- "Sería útil tener modo oscuro"
- "Me gustaría poder filtrar por fecha"

Categoría "question" - Ejemplos:
- "¿Cómo cambio mi contraseña?"
- "¿Dónde veo mis facturas?"
- "¿Puedo usar la app en móvil?"
```

### Mejorar Detección de Sentimiento

```
Sentimiento:
- positive: palabras como "gracias", "excelente", "genial", "perfecto", "me encanta"
- negative: palabras como "frustrado", "molesto", "decepcionado", "terrible", "pésimo", "no funciona"
- neutral: tono informativo sin emociones fuertes
```

### Mejorar Tags (Palabras Clave)

```
Tags - Reglas:
1. Usa solo sustantivos técnicos (no verbos, no adjetivos)
2. Máximo 5 tags
3. En español
4. Sin tildes para facilitar búsqueda
5. Enfócate en: módulos afectados, tipo de error, funcionalidad

Ejemplos buenos: ["login", "pago", "factura", "base-datos", "api"]
Ejemplos malos: ["arreglar", "urgente", "problema", "ayuda"]
```

---

## 🧪 Testing de Prompts

### Ejemplo 1: Bug Report

**Input**:
```
Asunto: Error al iniciar sesión
De: Juan Perez <juan@cliente.com>
Cuerpo: Hola, llevo 2 horas intentando acceder a la plataforma pero me sale "Error 500" cada vez que pongo mi contraseña. Es urgente porque tengo una presentación en 1 hora.
```

**Output Esperado**:
```json
{
  "category": "bug",
  "tags": ["login", "error-500", "autenticacion", "urgente"],
  "summary": "Error 500 al iniciar sesión, usuario bloqueado antes de presentación",
  "sentiment": "negative",
  "priority": "urgent"
}
```

### Ejemplo 2: Feature Request

**Input**:
```
Asunto: Sugerencia de mejora
De: Maria Garcia <maria@empresa.com>
Cuerpo: Buenos días, quería comentarles que sería muy útil poder exportar los reportes a PDF. Actualmente solo puedo verlos en pantalla y tengo que hacer capturas. Gracias!
```

**Output Esperado**:
```json
{
  "category": "feature",
  "tags": ["export", "pdf", "reportes", "mejora"],
  "summary": "Solicita funcionalidad de exportar reportes a PDF",
  "sentiment": "positive",
  "priority": "low"
}
```

### Ejemplo 3: Question

**Input**:
```
Asunto: ¿Cómo funciona el modo oscuro?
De: Carlos Lopez <carlos@test.com>
Cuerpo: Hola equipo, vi que tienen modo oscuro pero no encuentro dónde activarlo. ¿Me pueden guiar? Gracias.
```

**Output Esperado**:
```json
{
  "category": "question",
  "tags": ["modo-oscuro", "configuracion", "ui"],
  "summary": "Pregunta sobre cómo activar el modo oscuro",
  "sentiment": "neutral",
  "priority": "low"
}
```

---

## 🎨 Personalización por Industria

### SaaS / Software
```
Categorías: bug, feature, question, integration, billing
Tags comunes: api, webhook, sso, billing, deployment
Prioridad alta: errores que bloquean trabajo, integraciones caídas
```

### Ecommerce
```
Categorías: order, shipping, product, return, payment
Tags comunes: pedido, envio, tracking, devolucion, tarjeta
Prioridad alta: pedidos perdidos, pagos duplicados
```

### Servicios Profesionales
```
Categorías: consultation, quote, complaint, followup, billing
Tags comunes: consulta, cotizacion, proyecto, factura
Prioridad alta: clientes VIP, deadlines próximos
```

---

## 📊 Métricas de Calidad del Prompt

Para evaluar si tu prompt funciona bien:

### 1. Precisión de Categorías
```
Objetivo: >90% de correos categorizados correctamente
Cómo medir: Revisar 100 correos manualmente vs IA
```

### 2. Relevancia de Tags
```
Objetivo: >80% de tags útiles para búsqueda
Cómo medir: ¿Puedes encontrar correos similares con esos tags?
```

### 3. Calidad de Summary
```
Objetivo: Summary describe el problema en <100 caracteres
Cómo medir: ¿Entiendes el problema sin leer el correo completo?
```

### 4. Consistencia de Sentiment
```
Objetivo: >85% de sentimientos correctos
Cómo medir: Revisar correos negativos mal clasificados
```

### 5. Precisión de Priority
```
Objetivo: >75% de prioridades alineadas con urgencia real
Cómo medir: ¿Los urgentes realmente son urgentes?
```

---

## 🔄 Iteración del Prompt

### Paso 1: Baseline
Usar el prompt recomendado y testear con 50 correos reales

### Paso 2: Analizar Fallos
Identificar patrones de errores:
- ¿Qué categorías se confunden?
- ¿Qué palabras clave indican urgencia y no las detecta?
- ¿Qué sentimientos se malinterpretan?

### Paso 3: Ajustar Prompt
Agregar ejemplos específicos de los casos que fallan

### Paso 4: Re-testear
Probar con otros 50 correos y medir mejora

### Paso 5: Implementar
Actualizar el prompt en n8n

---

## 💡 Tips Avanzados

### 1. Multi-idioma
Si recibes correos en múltiples idiomas:
```
Detecta el idioma del correo y responde en ese idioma.
Si es español: tags en español
Si es inglés: tags en inglés
```

### 2. Detección de Spam
Agregar campo adicional:
```json
{
  "category": "...",
  "tags": [...],
  "summary": "...",
  "sentiment": "...",
  "priority": "...",
  "isSpam": true,  // ← Nuevo campo
  "spamReason": "Lenguaje promocional excesivo"
}
```

### 3. Extracción de Datos Estructurados
Para casos específicos:
```json
{
  "category": "order_issue",
  "tags": ["pedido", "reembolso"],
  "summary": "Solicita reembolso de pedido #12345",
  "sentiment": "negative",
  "priority": "high",
  "extractedData": {  // ← Datos estructurados
    "orderNumber": "12345",
    "amount": "€49.99",
    "reason": "producto defectuoso"
  }
}
```

---

## 📝 Template para Crear tu Propio Prompt

```
Eres un [ESPECIALISTA EN TU INDUSTRIA].

Analiza este correo de [TIPO DE CORREOS]:

Asunto: {{ $json.subject }}
De: {{ $json.from.emailAddress.name }}
Cuerpo: {{ $json.bodyPreview }}

Extrae en formato JSON:
{
  "category": "[CATEGORÍA 1]" | "[CATEGORÍA 2]" | "[CATEGORÍA 3]",
  "tags": ["tag1", "tag2"],
  "summary": "descripción breve",
  "sentiment": "positive" | "negative" | "neutral",
  "priority": "urgent" | "high" | "medium" | "low"
}

Definiciones:
- [CATEGORÍA 1]: [Descripción] - Ejemplos: [...]
- [CATEGORÍA 2]: [Descripción] - Ejemplos: [...]
- [CATEGORÍA 3]: [Descripción] - Ejemplos: [...]

Criterios de prioridad:
- urgent: [Cuándo asignar]
- high: [Cuándo asignar]
- medium: [Cuándo asignar]
- low: [Cuándo asignar]

Tags comunes de tu industria: [lista]

Responde SOLO con JSON, sin markdown ni explicaciones.
```

---

## 🚀 Próximos Pasos

1. **Testear** el prompt recomendado con tus correos reales
2. **Medir** precisión con una muestra de 50-100 correos
3. **Iterar** el prompt según los resultados
4. **Optimizar** para tu caso de uso específico
5. **Monitorear** y ajustar periódicamente

---

**Prompt actual en uso**: Ver `n8n-email-sync-workflow.json` → Nodo "OpenAI - Analyze Email"
