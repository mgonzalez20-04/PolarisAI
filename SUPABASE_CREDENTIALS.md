# 🔑 Credenciales de Supabase para n8n

## Cómo obtener las credenciales de Supabase

### 1. Ve a tu proyecto en Supabase

1. Abre https://supabase.com
2. Inicia sesión y selecciona tu proyecto

### 2. Ve a Project Settings

1. En el sidebar izquierdo, haz clic en el ícono de **⚙️ Settings** (engranaje)
2. En el menú de Settings, haz clic en **API**

### 3. Obtén las credenciales

Verás una sección llamada **Project API keys**:

#### 📍 **Host / Project URL**
```
https://[tu-proyecto].supabase.co
```
**Ejemplo:** `https://vptpfsxugbmrybrgofes.supabase.co`

#### 🔐 **Service Role Secret (service_role key)**
Es una clave que empieza con `eyJ...`

**⚠️ IMPORTANTE:**
- NO uses la `anon` key (pública)
- USA la **`service_role`** key (tiene todos los permisos)
- Esta clave es SECRETA, nunca la compartas públicamente

### 4. En n8n, configura:

**Host:**
```
https://[tu-proyecto].supabase.co
```

**Service Role Secret:**
```
eyJ... (la clave service_role completa)
```

---

## ⚠️ Limitación del Vector Store Nativo

La integración nativa de n8n con Supabase Vector Store tiene limitaciones:

- Solo busca en UNA tabla específica
- No puede combinar múltiples fuentes (knowledge base + casos)
- No tiene lógica personalizada
- Busca directamente en la tabla de vectores de Supabase

---

## 🎯 Recomendación: Usar nuestros Endpoints API

En lugar de usar el Vector Store nativo, es mejor usar los endpoints API que creamos porque:

✅ **Control total**: Búsqueda en múltiples tablas (KnowledgeDocument Y Case)
✅ **Lógica personalizada**: Filtros, validaciones, formateo de resultados
✅ **Dos herramientas**: search_knowledge_base Y search_resolved_cases
✅ **Más flexible**: Puedes modificar la lógica sin cambiar n8n

### Para usar nuestros endpoints:

**NO configures Vector Store nativo**. En su lugar:

1. En el nodo OpenAI, habilita **"Tools"**
2. Agrega **"HTTP Request"** como tool
3. Configura las 2 funciones que creamos:
   - `search_knowledge_base`
   - `search_resolved_cases`

---

## 🤔 ¿Cuál elegir?

### Usa **Vector Store Nativo** si:
- Solo quieres búsqueda simple en una tabla
- No necesitas lógica personalizada
- Prefieres la configuración "oficial" de n8n

### Usa **Nuestros Endpoints API** si:
- Quieres búsqueda en knowledge base Y casos
- Necesitas control sobre qué se busca y cómo
- Quieres las 2 herramientas que diseñamos
- **Recomendado** 👈

---

## 📚 Guías Relacionadas

- `docs/N8N_VECTOR_STORE_INTEGRATION.md` - Guía completa de configuración
- `docs/n8n-function-definitions.json` - Definiciones de las funciones

---

**¿Necesitas ayuda decidiendo cuál usar?** Pregúntame y te guío paso a paso.
