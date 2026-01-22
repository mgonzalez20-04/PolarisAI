# Documentación - Inbox Copilot con n8n

Documentación completa de la migración de OAuth a n8n para sincronización automática de correos con análisis IA.

---

## 🚀 Inicio Rápido

**¿Primera vez configurando n8n?** Empieza aquí:

### [📖 QUICK_START_N8N.md](./QUICK_START_N8N.md)
Guía rápida de 15 minutos para poner en marcha el workflow n8n.

**Lo que aprenderás**:
- ✅ Crear App Registration en Azure (5 min)
- ✅ Configurar credenciales en n8n (3 min)
- ✅ Importar workflow (2 min)
- ✅ Testear y activar (5 min)

**Empieza aquí si**: Quieres configurar todo rápidamente sin entrar en detalles técnicos.

---

## 📚 Documentación Principal

### [📘 N8N_MIGRATION_README.md](./N8N_MIGRATION_README.md)
Resumen ejecutivo de la migración OAuth → n8n.

**Contenido**:
- Resumen de cambios implementados
- Arquitectura antes vs ahora
- Archivos creados y modificados
- Configuración técnica del webhook
- Testing y monitoreo
- Checklist de migración

**Lee esto si**: Quieres entender qué cambió en la aplicación y por qué.

---

### [📙 n8n-workflow-guide.md](./n8n-workflow-guide.md)
Guía completa paso a paso del workflow n8n (60+ páginas).

**Contenido**:
- Requisitos previos
- Configuración detallada de credenciales en Azure
- Estructura completa del workflow
- Configuración de cada nodo explicada
- Troubleshooting exhaustivo
- Optimizaciones avanzadas

**Lee esto si**: Quieres entender a fondo cómo funciona cada parte del workflow.

---

### [🎨 AI_PROMPTS_GUIDE.md](./AI_PROMPTS_GUIDE.md)
Guía de prompts para análisis IA de correos.

**Contenido**:
- Prompt principal recomendado
- Variaciones por industria (SaaS, Ecommerce, HR)
- Optimizaciones del prompt
- Testing y métricas de calidad
- Template para crear prompts personalizados

**Lee esto si**: Quieres optimizar la catalogación automática con IA.

---

## 📦 Archivos Técnicos

### [⚙️ n8n-email-sync-workflow.json](./n8n-email-sync-workflow.json)
Archivo JSON del workflow completo para importar en n8n.

**Qué es**: Workflow completo preconfigurado con todos los nodos.

**Cómo usar**:
1. Descarga el archivo
2. En n8n: Workflows → Import from File
3. Selecciona este archivo
4. Actualiza credenciales
5. Activa el workflow

**Usa esto para**: Importar el workflow en segundos sin configurarlo manualmente.

---

## 🗂️ Estructura de la Documentación

```
docs/
├── README.md                          ← Estás aquí
├── QUICK_START_N8N.md                 ← Empieza aquí (15 min)
├── N8N_MIGRATION_README.md            ← Resumen ejecutivo
├── n8n-workflow-guide.md              ← Guía completa (60+ páginas)
├── AI_PROMPTS_GUIDE.md                ← Optimización de prompts IA
└── n8n-email-sync-workflow.json       ← Workflow exportable
```

---

## 🎯 Flujos de Lectura Recomendados

### Para Desarrolladores (Setup Inicial)
1. **QUICK_START_N8N.md** - Configuración rápida
2. **N8N_MIGRATION_README.md** - Entender cambios
3. **n8n-workflow-guide.md** - Referencia técnica

### Para Product Managers / Stakeholders
1. **N8N_MIGRATION_README.md** - Visión general
2. **QUICK_START_N8N.md** - Ver qué se necesita

### Para Optimización de IA
1. **AI_PROMPTS_GUIDE.md** - Mejora el análisis
2. **n8n-workflow-guide.md** (Nodo 4) - Implementar cambios

### Para DevOps / Mantenimiento
1. **n8n-workflow-guide.md** (Sección Troubleshooting)
2. **N8N_MIGRATION_README.md** (Sección Monitoreo)

---

## 🔧 Arquitectura del Sistema

```
┌──────────────────────────────────────────────────────────────┐
│                      Microsoft Outlook                        │
│                    (Buzón del usuario)                        │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         │ Microsoft Graph API
                         │ (OAuth gestionado por n8n)
                         ↓
┌──────────────────────────────────────────────────────────────┐
│                        n8n Workflow                           │
│                                                               │
│  [Schedule] → [Get Emails] → [Split] → [AI Analysis]        │
│       ↓             ↓            ↓            ↓               │
│  Cada 5 min    MS Graph      10x10      OpenAI/Claude       │
│                                                               │
│  → [Transform] → [Send Webhook] → [Check Success]           │
│         ↓               ↓                  ↓                  │
│    Mapear datos    POST /api/n8n      Log/Retry              │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         │ POST /api/n8n/webhook
                         │ Header: x-api-key
                         ↓
┌──────────────────────────────────────────────────────────────┐
│                   Next.js Application                         │
│                                                               │
│  [Webhook Handler] → [Validate] → [User Lookup/Create]      │
│         ↓                ↓                ↓                   │
│    route.ts          Zod Schema      By email                │
│                                                               │
│  → [Upsert Email] → [Save to PostgreSQL]                    │
│         ↓                    ↓                                │
│  messageId unique    With AI metadata                        │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ↓
┌──────────────────────────────────────────────────────────────┐
│                PostgreSQL + pgvector                          │
│                                                               │
│  - Emails con catalogación IA                                │
│  - Users (creados automáticamente)                           │
│  - Tags, Cases, Conversations                                │
└──────────────────────────────────────────────────────────────┘
```

---

## ✅ Estado de la Migración

### ✅ Completado
- [x] Webhook endpoint (`/api/n8n/webhook`)
- [x] Funciones auxiliares (`webhook-helpers.ts`)
- [x] Eliminación sistema OAuth
- [x] Actualización UI (sin botones sync)
- [x] Actualización página login
- [x] Documentación completa
- [x] Workflow n8n diseñado
- [x] Archivo exportable JSON

### ⏳ Pendiente
- [ ] Ejecutar migración de BD (`npm run db:push`)
- [ ] Configurar App Registration en Azure
- [ ] Configurar credenciales en n8n
- [ ] Importar workflow en n8n
- [ ] Testear end-to-end
- [ ] Activar workflow automático

---

## 🆘 Soporte y Troubleshooting

### Errores Comunes

| Error | Solución | Documento |
|-------|----------|-----------|
| 401 Unauthorized (MS Graph) | Reconectar credencial OAuth2 | [QUICK_START](./QUICK_START_N8N.md#troubleshooting) |
| Invalid JSON (OpenAI) | Revisar prompt, aumentar temp | [AI_PROMPTS](./AI_PROMPTS_GUIDE.md) |
| API key invalida (Webhook) | Verificar variables n8n y .env | [MIGRATION](./N8N_MIGRATION_README.md#troubleshooting) |
| Timeout (Webhook) | Aumentar timeout, verificar URL | [WORKFLOW_GUIDE](./n8n-workflow-guide.md#troubleshooting) |

### Logs y Monitoreo

**En n8n**:
- Ver ejecuciones: Executions tab
- Click en una ejecución para detalles
- Revisar cada nodo

**En la aplicación**:
```bash
# Logs en consola Next.js
Email processed via n8n webhook: cm5x1y2z3...
  Subject: Error en la aplicación
  Category: bug
  Sentiment: negative
  Priority: high
```

---

## 📞 Contacto y Contribuciones

### Issues
Reporta problemas en el repositorio

### Mejoras
Pull requests bienvenidos para:
- Optimizaciones del workflow
- Mejoras en prompts IA
- Nuevas variaciones de prompts por industria
- Correcciones de documentación

---

## 🔗 Links Útiles

### Recursos Externos
- [Microsoft Graph API Docs](https://learn.microsoft.com/en-us/graph/api/user-list-messages)
- [n8n Official Documentation](https://docs.n8n.io)
- [OpenAI API Reference](https://platform.openai.com/docs)
- [Azure Portal](https://portal.azure.com)

### Código Fuente
- Webhook: `src/app/api/n8n/webhook/route.ts`
- Helpers: `src/lib/n8n/webhook-helpers.ts`
- Auth: `src/auth.ts`
- Schema: `prisma/schema.prisma`

---

## 📈 Roadmap

### v1.0.0 (Actual)
- ✅ Migración OAuth → n8n
- ✅ Webhook endpoint
- ✅ Documentación completa

### v1.1.0 (Próximo)
- [ ] Rate limiting en webhook
- [ ] Caché de análisis IA
- [ ] Notificaciones de errores
- [ ] Dashboard de métricas n8n

### v1.2.0 (Futuro)
- [ ] Webhooks bidireccionales (app → n8n)
- [ ] Soporte multi-idioma en IA
- [ ] Detección avanzada de spam
- [ ] Extracción de datos estructurados

---

**Fecha de última actualización**: 21 de Enero de 2025
**Versión de la documentación**: 1.0.0
**Autor**: Claude Code Assistant
