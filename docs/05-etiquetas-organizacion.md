# Etiquetas y Organización

## Sistema de etiquetas

Las etiquetas (tags) te permiten clasificar y organizar tus emails de manera personalizada, más allá de los estados y prioridades estándar.

## Crear etiquetas

### Desde la gestión de etiquetas
1. Abre cualquier email
2. Haz clic en **"Añadir etiqueta"**
3. En el menú desplegable, haz clic en **"Gestionar etiquetas"**
4. Crea una nueva etiqueta con:
   - **Nombre**: Descriptivo y corto (ej: "Facturación", "Bug", "VIP")
   - **Color**: Elige un color para identificarla visualmente

### Colores disponibles
El sistema ofrece una paleta de colores para diferenciar etiquetas:
- Rojo: Problemas urgentes o críticos
- Naranja: Requiere atención pronto
- Amarillo: En espera de información
- Verde: Completado o verificado
- Azul: Información general
- Morado: VIP o alta prioridad
- Gris: Archivado o referencia

## Asignar etiquetas a emails

### Método rápido
1. Abre un email
2. Haz clic en **"Añadir etiqueta"**
3. Selecciona una etiqueta existente de la lista
4. La etiqueta se asigna inmediatamente

### Asignar múltiples etiquetas
Puedes asignar varias etiquetas a un mismo email:
- "Bug" + "Alta prioridad" + "Cliente VIP"
- "Consulta" + "Documentación" + "FAQ"

### Quitar etiquetas
1. En la vista del email, ve a las etiquetas asignadas
2. Haz clic en la **X** de la etiqueta que quieres quitar
3. La etiqueta se elimina del email

## Tipos de etiquetas sugeridas

### Por tipo de problema
- **Bug**: Errores o fallos del sistema
- **Feature Request**: Solicitudes de nuevas funcionalidades
- **Consulta**: Preguntas generales
- **Documentación**: Requiere documentación o manual
- **Configuración**: Problemas de configuración

### Por departamento
- **Facturación**: Relacionado con pagos y facturas
- **Técnico**: Soporte técnico
- **Ventas**: Consultas de ventas
- **Legal**: Temas legales o contratos

### Por urgencia
- **Urgente**: Requiere atención inmediata
- **Bloqueante**: Bloquea el trabajo del cliente
- **Programado**: Para atender en fecha específica

### Por estado especial
- **Esperando cliente**: Pendiente de respuesta del cliente
- **Escalado**: Escalado a nivel superior
- **VIP**: Cliente importante
- **Requiere seguimiento**: Necesita seguimiento posterior

### Por canal o producto
- **Producto A**: Relacionado con producto específico
- **Producto B**: Otro producto
- **API**: Problemas con la API
- **Web**: Problemas con la aplicación web
- **Mobile**: Problemas con app móvil

## Filtrar por etiquetas

### En el dashboard
1. Usa la barra de búsqueda o filtros
2. Selecciona una etiqueta específica
3. Verás solo los emails con esa etiqueta

### Combinación de filtros
Puedes combinar:
- Estado + Etiqueta: "Active" + "Bug" = Bugs activos
- Prioridad + Etiqueta: "High" + "VIP" = Casos VIP urgentes

## Gestión de etiquetas

### Editar etiquetas existentes
1. Ve a **"Gestionar etiquetas"**
2. Haz clic en la etiqueta que quieres editar
3. Cambia el nombre o color
4. Guarda los cambios

**Nota**: Los cambios se aplican a todos los emails con esa etiqueta

### Eliminar etiquetas
1. Ve a **"Gestionar etiquetas"**
2. Haz clic en eliminar junto a la etiqueta
3. Confirma la eliminación

**Advertencia**: Eliminar una etiqueta la quitará de todos los emails que la tengan asignada

### Combinar etiquetas (merge)
Si tienes etiquetas duplicadas o similares:
1. Crea una nueva etiqueta con el nombre correcto
2. Reasigna los emails manualmente
3. Elimina las etiquetas antiguas

## Organización con carpetas

### Carpetas de Microsoft 365
Si tu cuenta de Microsoft 365 tiene carpetas organizadas:
- El sistema sincroniza la estructura de carpetas
- Puedes ver a qué carpeta pertenece cada email
- Filtra emails por carpeta específica

### Configurar carpetas visibles
1. Ve a **Configuración** → **Carpetas**
2. Marca las carpetas que quieres ver en el dashboard
3. Oculta carpetas que no uses (ej: "Spam", "Borradores")
4. Guarda los cambios

### Vista de carpetas
- **Inbox**: Bandeja de entrada principal
- **Enviados**: Emails enviados
- **Archivo**: Emails archivados
- **Carpetas personalizadas**: Cualquier carpeta que hayas creado en Outlook

## Agrupar emails por conversación

### ¿Qué es una conversación?
Emails relacionados con el mismo asunto (thread) se agrupan juntos usando el campo `conversationId` de Microsoft 365.

### Activar agrupación
1. Ve a **Configuración** → **Preferencias**
2. Activa **"Agrupar emails del mismo hilo"**
3. Los emails relacionados aparecerán agrupados en el dashboard

### Ventajas de agrupar
- Ves toda la conversación junta
- No pierdes contexto de intercambios anteriores
- Facilita el seguimiento de casos complejos

## Estrategias de organización

### Método 1: Por flujo de trabajo
```
Nuevo email → "En revisión"
Investigando → "En progreso"
Esperando respuesta → "Esperando cliente"
Resuelto → "Completado"
Cerrado → Archivo
```

### Método 2: Por tipo de problema
```
Bug → Etiqueta "Bug" + Prioridad según severidad
Consulta → Etiqueta "Consulta" + Estado "Active"
Feature Request → Etiqueta "Feature" + "Planificado"
```

### Método 3: Por cliente o producto
```
Cliente VIP → Etiqueta "VIP" + Prioridad "High"
Producto A → Etiqueta "Producto A"
Producto B → Etiqueta "Producto B"
```

### Método 4: Híbrido
Combina varios métodos:
```
Email de cliente VIP reportando bug crítico:
- Prioridad: Urgente
- Estado: Active
- Etiquetas: VIP, Bug, Producto A
- Carpeta: Inbox
```

## Mejores prácticas

1. **Crea pocas etiquetas inicialmente**: Empieza con 5-10 etiquetas esenciales
2. **Usa nombres consistentes**: "Bug" en lugar de "Error", "Fallo", "Problema"
3. **Colores con significado**: Asigna colores de manera consistente (rojo = urgente, verde = completado)
4. **Etiqueta al recibir**: Asigna etiquetas cuando revisas por primera vez el email
5. **Revisa regularmente**: Limpia etiquetas que no uses
6. **Documenta tu sistema**: Si trabajas en equipo, documenta qué significa cada etiqueta
7. **No sobre-etiquetes**: 2-3 etiquetas por email suelen ser suficientes

## Búsqueda avanzada

### Por múltiples criterios
Combina búsquedas para encontrar emails específicos:
- Etiqueta "Bug" + Estado "Active" + Prioridad "High"
- Remitente específico + Etiqueta "VIP"
- Fecha + Etiqueta + Carpeta

### Búsqueda de texto + etiquetas
1. Escribe palabras clave en la barra de búsqueda
2. Aplica filtros de etiquetas adicionales
3. Obtén resultados muy específicos

## Informes y análisis

### Ver distribución de etiquetas
Los administradores pueden ver:
- Cuántos emails tienen cada etiqueta
- Etiquetas más usadas
- Tendencias en el tiempo

### Métricas útiles
- Emails por etiqueta por semana/mes
- Tiempo promedio de resolución por etiqueta
- Etiquetas que correlacionan con alta/baja prioridad

## Integración con el agente de IA

### El agente usa etiquetas para:
- Entender el tipo de problema
- Buscar casos similares con las mismas etiquetas
- Sugerir soluciones relevantes al contexto

### Ejemplo
Si etiquetas un email como "Bug" + "API":
- El agente buscará casos anteriores de bugs en la API
- Priorizará soluciones técnicas sobre consultas generales
- Sugerirá documentación relacionada con la API

## Preguntas frecuentes

**¿Cuántas etiquetas puedo crear?**
No hay límite técnico, pero recomendamos mantener entre 10-20 etiquetas para no complicar la organización.

**¿Las etiquetas son compartidas con mi equipo?**
No, cada usuario tiene su propio conjunto de etiquetas personalizadas.

**¿Puedo exportar emails por etiqueta?**
Actualmente esta función no está disponible, pero puedes usar los filtros para ver emails específicos.

**¿Las etiquetas afectan el aprendizaje del agente?**
Sí, las etiquetas ayudan al agente a contextualizar mejor los problemas y mejorar sus sugerencias.
