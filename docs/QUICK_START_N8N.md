# Quick Start: Importar Workflow n8n en 5 Minutos

## 🚀 Pasos Rápidos

### 1. Crear App Registration en Azure (5 min)

1. Ve a [Azure Portal](https://portal.azure.com) → **Azure Active Directory**
2. Click en **App registrations** → **New registration**
3. Configura:
   ```
   Name: n8n Email Sync
   Supported account types: Single tenant
   Redirect URI: https://YOUR-N8N-DOMAIN.com/rest/oauth2-credential/callback
   ```
4. **Copia estos valores** (los necesitarás):
   - Application (client) ID: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
   - Directory (tenant) ID: `yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy`

5. Ve a **Certificates & secrets** → **New client secret**
   - Description: `n8n Integration`
   - Expires: 24 months
   - **Copia el Value** (solo se muestra una vez): `xxxxx~xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

6. Ve a **API permissions** → **Add a permission** → **Microsoft Graph** → **Delegated permissions**
   - Selecciona: `Mail.ReadWrite`, `Mail.Read`, `User.Read`, `offline_access`
   - Click **Grant admin consent**

✅ Guarda estos 3 valores:
- Client ID
- Tenant ID
- Client Secret

---

### 2. Configurar Credenciales en n8n (3 min)

#### A. Microsoft Graph OAuth2

1. En n8n: **Settings** → **Credentials** → **Add Credential**
2. Busca: **Microsoft Graph OAuth2 API**
3. Completa:
   ```
   Credential Name: Microsoft 365 Email

   Authorization URL:
   https://login.microsoftonline.com/TU_TENANT_ID/oauth2/v2.0/authorize

   Access Token URL:
   https://login.microsoftonline.com/TU_TENANT_ID/oauth2/v2.0/token

   Client ID: TU_CLIENT_ID

   Client Secret: TU_CLIENT_SECRET

   Scope:
   https://graph.microsoft.com/Mail.ReadWrite https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/User.Read offline_access

   Auth URI Query Parameters:
   prompt=consent

   Authentication: Body
   ```
4. Click **Connect my account** → Autorizar

#### B. OpenAI API

1. **Settings** → **Credentials** → **Add Credential**
2. Busca: **OpenAI API**
3. Completa:
   ```
   Credential Name: OpenAI Email Analysis
   API Key: sk-...tu-api-key...
   ```

#### C. Webhook API Key

1. **Settings** → **Variables** → **Add Variable**
2. Completa:
   ```
   Key: WEBHOOK_API_KEY
   Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ODFkOTM2Ni04NmMwLTQ3ZGYtYWY0OS1kODg5ZjFjMzhlY2YiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY4OTg2MTc1fQ.MUnqI4spNWfPgCwU7eFo8XzSjBB81EEf_vBZaaDV0b0
   Type: String
   ```

---

### 3. Importar el Workflow (2 min)

1. En n8n: **Workflows** → **Add workflow** → **Import from File**
2. Selecciona el archivo: `n8n-email-sync-workflow.json`
3. El workflow se importará con todos los nodos configurados

#### Actualizar Credenciales en el Workflow

Después de importar, actualiza las credenciales en estos nodos:

**Nodo "Get Emails from Microsoft"**:
- Click en el nodo
- En **Credentials**, selecciona tu credencial `Microsoft 365 Email`

**Nodo "OpenAI - Analyze Email"**:
- Click en el nodo
- En **Credentials**, selecciona tu credencial `OpenAI Email Analysis`

**Nodo "Send to App Webhook"**:
- Click en el nodo
- Verifica que el header `x-api-key` use `={{ $vars.WEBHOOK_API_KEY }}`
- **IMPORTANTE**: Cambia la URL de `http://localhost:3000` a tu dominio público si es necesario

---

### 4. Testear el Workflow (2 min)

#### Test Manual

1. Click derecho en **"Every 5 Minutes"** (primer nodo)
2. Selecciona **"Execute Workflow"**
3. Observa que cada nodo se ejecuta:
   - ✅ Get Emails → Debe traer correos
   - ✅ Split In Batches → Divide en grupos de 10
   - ✅ OpenAI → Analiza con IA
   - ✅ Transform → Mapea al formato webhook
   - ✅ Send to Webhook → Envía a tu app
   - ✅ Check Success → Valida respuesta

#### Verificar en tu Aplicación

1. Abre tu aplicación: `http://localhost:3000/dashboard`
2. Deberías ver los correos aparecer
3. Verifica que tienen:
   - Categoría (bug/feature/question)
   - Tags
   - Sentimiento
   - Prioridad

---

### 5. Activar el Workflow (1 min)

1. En la parte superior del workflow, activa el toggle **"Active"**
2. El workflow se ejecutará automáticamente cada 5 minutos
3. Los correos se sincronizarán sin intervención manual

---

## ⚙️ Configuraciones Opcionales

### Cambiar Frecuencia de Sincronización

En el nodo **"Every 5 Minutes"**:
- Cada 1 minuto: `* * * * *`
- Cada 5 minutos: `*/5 * * * *` ← **Recomendado**
- Cada 10 minutos: `*/10 * * * *`
- Cada hora: `0 * * * *`

### Cambiar Modelo de IA

En el nodo **"OpenAI - Analyze Email"**:
- `gpt-4o-mini` ← **Recomendado** (rápido y barato)
- `gpt-4o` (más preciso pero caro)
- `gpt-3.5-turbo` (más barato pero menos preciso)

### Filtrar Correos Específicos

En el nodo **"Get Emails from Microsoft"**, edita el query parameter `$filter`:

**Solo correos no leídos**:
```
receivedDateTime ge {{ $now.minus({minutes: 10}).toISO() }} and isRead eq false
```

**Solo de un remitente específico**:
```
receivedDateTime ge {{ $now.minus({minutes: 10}).toISO() }} and from/emailAddress/address eq 'cliente@example.com'
```

**Solo con palabras clave en el asunto**:
```
receivedDateTime ge {{ $now.minus({minutes: 10}).toISO() }} and (contains(subject,'soporte') or contains(subject,'ayuda'))
```

---

## 🐛 Troubleshooting

### Error: "401 Unauthorized" en Microsoft Graph

**Solución**:
1. Ve a n8n → **Settings** → **Credentials**
2. Encuentra tu credencial `Microsoft 365 Email`
3. Click en **Reconnect**
4. Autoriza de nuevo

### Error: "Invalid JSON" en OpenAI

**Solución**:
1. Edita el nodo **"OpenAI - Analyze Email"**
2. En el prompt del User message, asegúrate de que dice:
   ```
   Responde SOLO con JSON válido, sin texto adicional ni markdown code blocks.
   ```
3. Aumenta **Temperature** a `0.5`

### Error: "API key invalida" en Webhook

**Solución**:
1. Verifica que la variable `WEBHOOK_API_KEY` existe en n8n
2. Verifica que tu app tiene la misma key en `.env.local`
3. Reinicia tu aplicación Next.js

### Error: "Timeout" en Webhook

**Solución**:
1. Edita el nodo **"Send to App Webhook"**
2. En **Options** → **Timeout**, aumenta a `30000` (30 segundos)
3. Verifica que tu aplicación está corriendo
4. Si usas `localhost`, verifica que n8n puede acceder (si n8n está en la nube, necesitas un dominio público o usar ngrok)

---

## 📊 Monitoreo

### Ver Ejecuciones

1. En n8n: **Executions** (tab)
2. Verás todas las ejecuciones del workflow
3. Click en una para ver detalles
4. Revisa los datos de cada nodo

### Logs en tu Aplicación

En la consola de tu app Next.js verás:
```
Email processed via n8n webhook: cm5x1y2z3... (AAMkADtest123)
  Subject: Error en la aplicación
  Category: bug
  Sentiment: negative
  Priority: high
```

---

## 🎉 ¡Listo!

Tu workflow está configurado y funcionando. Los correos se sincronizarán automáticamente cada 5 minutos con análisis IA incluido.

**Próximos pasos**:
- Monitorea las primeras ejecuciones
- Ajusta los filtros según tus necesidades
- Configura notificaciones de errores (opcional)

---

## 📚 Recursos Adicionales

- **Guía completa**: Ver `docs/n8n-workflow-guide.md`
- **Microsoft Graph API**: https://learn.microsoft.com/en-us/graph/api/user-list-messages
- **n8n Documentation**: https://docs.n8n.io
- **OpenAI API**: https://platform.openai.com/docs

---

**Tiempo total de configuración**: ~15 minutos
