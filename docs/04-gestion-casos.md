# Gestión de Casos

## ¿Qué es un caso?

Un caso es un registro estructurado de un problema de soporte que fue resuelto. Los casos sirven como base de conocimientos para:
- Que el agente de IA aprenda de soluciones anteriores
- Que tu equipo consulte cómo se resolvieron problemas similares
- Analizar patrones y problemas recurrentes

## Diferencia entre Email y Caso

### Email
- Comunicación recibida del cliente
- Puede contener múltiples problemas
- Se gestiona con estados (New, Active, Resolved, Closed)

### Caso
- Documentación estructurada de un problema específico y su solución
- Vinculado a un email particular
- Se crea cuando hay una solución valiosa que documentar

**Nota**: No todos los emails necesitan un caso. Solo crea casos para problemas que requieren documentación para futuras referencias.

## Crear un caso

### Método 1: Desde el email

Cuando resuelves un email importante:
1. Abre el email en la vista de detalle
2. Cambia el estado a "Resolved"
3. Escribe las **Notas de Resolución** detalladas
4. Haz clic en **"Guardar Cambios"**
5. Opcionalmente, crea un caso formal desde el menú "Casos"

### Método 2: Con el agente de IA

El agente puede crear casos automáticamente:
1. Abre el chat con el agente
2. Di: "Crea un caso para esta solución" o "Documenta este problema como caso"
3. El agente usará la herramienta `CreateCaseTool`
4. Revisa y edita el caso creado si es necesario

### Método 3: Manual desde la sección de Casos

1. Ve a **Dashboard** → **Casos**
2. Haz clic en **"Nuevo Caso"**
3. Completa la información:
   - Título descriptivo
   - Descripción del problema
   - Solución aplicada
   - Respuesta al cliente (opcional)
   - Categoría y etiquetas
4. Guarda el caso

## Información de un caso

### Campos principales

#### Título
- Resumen breve y descriptivo del problema
- Ejemplo: "Error de conexión a la base de datos tras actualización"

#### Descripción
- Explicación detallada del problema
- Síntomas que reportó el cliente
- Contexto relevante (versión, configuración, etc.)

#### Resolución
**Este es el campo más importante para el aprendizaje del agente**
- Pasos específicos que seguiste para resolver el problema
- Comandos ejecutados o cambios realizados
- Por qué funcionó esta solución
- Tiempo aproximado de resolución

Ejemplo de una buena resolución:
```
1. Identifiqué que el error ocurría después de la actualización a v2.1
2. Revisé los logs y encontré: "Connection timeout: 5000ms exceeded"
3. Aumenté el timeout en config.json de 5000 a 10000
4. Reinicié el servicio: systemctl restart app-service
5. Verifiqué que la conexión funcionara correctamente
6. La causa raíz era que la nueva versión tiene consultas más lentas
```

#### Respuesta
- La respuesta que enviaste al cliente (opcional)
- Puede ser en formato plantilla para reutilizar
- El agente puede usar esto para generar respuestas similares

#### Categoría
- Clasifica el tipo de problema
- Ejemplos: "Conexión", "Autenticación", "Performance", "Bugs"
- Ayuda al agente a encontrar casos relevantes

#### Etiquetas
- Tags adicionales para clasificación más granular
- Ejemplos: "database", "v2.1", "timeout", "critical"

#### Prioridad
- Indica la severidad del problema original
- Ayuda a priorizar casos similares en el futuro

#### Estado
- **open**: Caso abierto, en investigación
- **resolved**: Problema resuelto
- **closed**: Caso cerrado y documentado

## Gestionar casos existentes

### Ver lista de casos
1. Ve a **Dashboard** → **Casos**
2. Verás todos los casos con:
   - Título
   - Estado
   - Fecha de creación
   - Fecha de resolución (si aplica)

### Filtrar casos
- Por estado (abiertos, resueltos, cerrados)
- Por categoría
- Por fecha de resolución
- Por prioridad

### Editar un caso
1. Haz clic en el caso que quieres editar
2. Actualiza la información necesaria
3. Guarda los cambios

**Nota**: Los cambios en casos existentes mejoran automáticamente las futuras sugerencias del agente

### Eliminar un caso
- Solo elimina casos si fueron creados por error
- Los casos con soluciones valiosas deben mantenerse para el aprendizaje del agente

## Búsqueda de casos similares

### Búsqueda automática del agente
Cuando analizas un email, el agente busca automáticamente casos similares usando:
- **Similitud semántica**: Compara el significado, no solo palabras exactas
- **Embeddings**: Representaciones vectoriales del contenido
- **Puntuación de similitud**: Porcentaje de coincidencia

### Búsqueda manual
1. Ve a la sección de **Casos**
2. Usa la barra de búsqueda
3. Busca por:
   - Palabras clave del problema
   - Categoría
   - Etiquetas

## Casos y aprendizaje del agente

### Cómo el agente usa los casos

#### 1. Al recibir un email nuevo
- El agente busca casos con problemas similares
- Muestra los 3-5 casos más relevantes
- Calcula un porcentaje de similitud

#### 2. Al generar respuestas
- Usa las soluciones documentadas en casos similares
- Adapta la respuesta al contexto específico del email
- Combina información de múltiples casos si es necesario

#### 3. Para aprender patrones
- Identifica problemas recurrentes
- Aprende qué soluciones funcionan mejor
- Mejora la confianza en sus sugerencias con más datos

### Mejores prácticas para casos

#### 1. Documenta soluciones únicas
Si resolviste algo de manera diferente o innovadora, documéntalo

#### 2. Sé específico y detallado
Más detalles = mejor aprendizaje del agente

#### 3. Usa lenguaje claro
Escribe como si le explicaras a un colega

#### 4. Incluye contexto relevante
- Versiones de software
- Configuraciones específicas
- Condiciones que desencadenaron el problema

#### 5. Actualiza casos obsoletos
Si una solución ya no funciona, actualiza el caso con la nueva solución

#### 6. Categoriza correctamente
Usa categorías consistentes para facilitar la búsqueda

## Análisis de casos

### Métricas útiles
Los administradores pueden analizar:
- Casos resueltos por categoría
- Tiempo promedio de resolución
- Problemas más frecuentes
- Tasa de reutilización de soluciones

### Identificar tendencias
- ¿Qué problemas se repiten más?
- ¿Qué categorías necesitan más documentación?
- ¿Qué soluciones son más efectivas?

## Ejemplo de flujo completo

### Escenario
Cliente reporta: "No puedo acceder al panel de administración, me sale error 500"

### Pasos:
1. **Recibir email**: El email llega y aparece en tu dashboard
2. **Revisar sugerencias**: El agente encuentra 2 casos similares de errores 500
3. **Investigar**: Revisas los logs y encuentras un problema de permisos
4. **Resolver**: Ajustas los permisos del directorio
5. **Documentar**: Cambias el email a "Resolved" y escribes en notas de resolución:
   ```
   Problema: Error 500 al acceder a /admin
   Causa: Permisos incorrectos en /var/www/admin (755 en lugar de 775)
   Solución: chmod 775 /var/www/admin && systemctl restart apache2
   ```
6. **Crear caso** (opcional): Si es un problema recurrente, creas un caso formal
7. **Aprendizaje**: La próxima vez que llegue un error 500 similar, el agente sugerirá esta solución

## Preguntas frecuentes

**¿Cuántos casos debo crear?**
No hay un número exacto, pero documenta al menos problemas que:
- Fueron difíciles de resolver
- Son recurrentes
- Tienen soluciones no obvias
- Requirieron investigación

**¿Qué pasa si edito un caso?**
El agente usará la información actualizada en futuras sugerencias. Los embeddings se regeneran automáticamente.

**¿Puedo importar casos de otro sistema?**
Sí, puedes usar la API para importar casos en batch. Consulta con el administrador del sistema.

**¿Los casos son privados o compartidos?**
Los casos son específicos por usuario, pero el administrador puede configurar el sistema para compartir casos entre el equipo.
