# Agente de Inteligencia Artificial

## ¿Qué es el agente de IA?

El agente de IA es tu asistente personal impulsado por Claude AI de Anthropic. Te ayuda a responder tickets de soporte más rápido al:
- Analizar el contenido del email
- Buscar casos similares resueltos anteriormente
- Sugerir respuestas basadas en tu base de conocimientos
- Responder preguntas sobre cómo resolver problemas

## Dos modos de uso

### 1. Sugerencias automáticas

Cuando abres un email, el sistema automáticamente:
- Busca en tu historial de casos resueltos
- Encuentra los 3-5 casos más similares
- Muestra un porcentaje de coincidencia
- Genera una respuesta sugerida basada en soluciones anteriores

**Cómo usar las sugerencias:**
1. Abre cualquier email
2. Mira el panel derecho "Sugerencias IA"
3. Revisa los casos similares mostrados
4. Lee la respuesta sugerida
5. Edita y personaliza la respuesta según sea necesario
6. Envía al cliente

### 2. Chat interactivo con el agente

Para conversaciones más complejas o personalizadas:
1. Abre un email
2. Haz clic en el botón **"Chat IA"** en la parte superior derecha
3. Escribe tu pregunta o solicitud
4. El agente responderá con información contextual

**Ejemplos de preguntas que puedes hacer:**
- "¿Cómo resuelvo este tipo de problema?"
- "Dame más información sobre [tema específico]"
- "¿Qué pasos debo seguir para solucionar esto?"
- "Genera una respuesta más formal/informal"
- "Traduce esta respuesta al inglés"
- "Explícame por qué ocurre este error"

## Cómo funciona el agente

### 1. Análisis del contexto
El agente tiene acceso a:
- El contenido completo del email
- Información del remitente
- Etiquetas asignadas
- Conversaciones anteriores sobre este email
- Prioridad y estado actual

### 2. Búsqueda RAG (Retrieval-Augmented Generation)
El agente busca información en tres fuentes:
- **Base de conocimientos**: Documentación técnica y manuales
- **Casos históricos**: Tickets similares resueltos anteriormente
- **Conversaciones**: Mensajes previos en esta conversación

### 3. Selección inteligente de modelo
- Para tareas simples (búsquedas, clasificación): Usa Claude Haiku (rápido y económico)
- Para respuestas complejas: Usa Claude Sonnet (mayor calidad)

### 4. Memoria de conversación
- El agente recuerda toda tu conversación
- Puede hacer referencia a mensajes anteriores
- Resume automáticamente conversaciones muy largas para ahorrar costos

## Herramientas del agente

El agente tiene acceso a herramientas especiales:

### GetEmailContextTool
- Obtiene información detallada del email actual
- Accede al historial de conversaciones
- Revisa casos relacionados

### CreateCaseTool
- Puede crear automáticamente un caso de soporte
- Extrae información relevante de la conversación
- Guarda la solución para futuras referencias

**Ejemplo de uso:**
```
Tú: "Crea un caso para documentar esta solución"
Agente: [Crea el caso automáticamente y te confirma]
```

## Calidad de las respuestas

### Factores que mejoran las respuestas:
1. **Historial rico**: Más casos resueltos = mejores sugerencias
2. **Notas detalladas**: Escribe notas de resolución completas
3. **Documentación actualizada**: Mantén la base de conocimientos al día
4. **Feedback**: Dale feedback al agente (👍/👎) sobre sus respuestas

### Confianza y precisión
- Cada sugerencia incluye un porcentaje de confianza
- Sugerencias >80%: Muy confiables
- Sugerencias 60-80%: Revisa y ajusta
- Sugerencias <60%: Úsala como punto de partida

## Dar feedback al agente

### ¿Por qué es importante?
Tu feedback ayuda al agente a aprender y mejorar con el tiempo.

### Tipos de feedback:

#### 1. Rating (👍/👎)
- Haz clic en los botones de thumbs up/down
- Indica si la respuesta fue útil o no

#### 2. Correcciones
- Si la respuesta no es correcta, puedes editarla
- El sistema guarda tu corrección
- Futuros casos similares usarán tu versión corregida

#### 3. Comentarios
- Añade comentarios explicando qué faltó o qué estuvo mal
- Ayuda al equipo a mejorar el sistema

## Costos y tokens

### ¿Qué son los tokens?
Los tokens son unidades de texto que el modelo de IA procesa. Aproximadamente:
- 1 token ≈ 4 caracteres en español
- 100 tokens ≈ 75 palabras

### Optimización de costos
El sistema está diseñado para minimizar costos:
- Usa modelos más baratos cuando es posible
- Resume conversaciones largas automáticamente
- Cachea embeddings para evitar recalcularlos
- Limita el contexto a lo más relevante

### Métricas
Los administradores pueden ver:
- Tokens usados por conversación
- Costo por respuesta
- Tiempo de respuesta
- Herramientas utilizadas

## Limitaciones del agente

### Lo que el agente NO puede hacer:
- No puede enviar emails directamente (eres tú quien decide)
- No puede acceder a sistemas externos sin configuración
- No puede ejecutar código en tu servidor
- No puede acceder a información fuera de su contexto

### Cuándo el agente puede no ser útil:
- Problemas completamente nuevos sin casos similares
- Problemas que requieren acceso físico al hardware
- Situaciones que requieren juicio humano crítico
- Casos con información insuficiente en el email

## Mejores prácticas

1. **Sé específico en tus preguntas**: "¿Cómo reinicio el servicio X?" es mejor que "¿Qué hago?"
2. **Da contexto adicional**: Si hay información que no está en el email, menciónala
3. **Revisa siempre las respuestas**: El agente es un asistente, no un reemplazo
4. **Documenta las soluciones**: Escribe notas detalladas cuando resuelvas casos
5. **Da feedback regularmente**: Ayuda al agente a mejorar con tus valoraciones
6. **Usa el chat para casos complejos**: Las sugerencias automáticas son geniales para casos simples
7. **Crea casos importantes**: Documenta soluciones valiosas como casos para referencia futura
