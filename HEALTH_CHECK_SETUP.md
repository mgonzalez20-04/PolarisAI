# Sistema de Monitoreo de Base de Datos

Este sistema proporciona monitoreo automático de la conectividad de la base de datos con alertas por email.

## Características

- ✅ Health checks automáticos periódicos
- ✅ Alertas por email cuando se detectan fallos
- ✅ Notificación de recuperación cuando el sistema vuelve a funcionar
- ✅ Indicador visual en el dashboard
- ✅ Registro histórico de todos los health checks
- ✅ Configuración flexible de horarios y frecuencia

## Configuración

### 1. Variables de Entorno

Agrega las siguientes variables a tu archivo `.env.local`:

```bash
# Token secreto para autenticar health checks externos
HEALTH_CHECK_TOKEN=tu-token-secreto-aqui

# URL de la aplicación (para el cron job)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. Configuración de Email (SMTP)

Desde la interfaz web, los administradores pueden configurar:

1. Navega a la página de configuración del sistema
2. Configura los ajustes SMTP:
   - **Host SMTP**: servidor de correo (ej: smtp.gmail.com)
   - **Puerto**: puerto SMTP (465 para SSL, 587 para TLS)
   - **Usuario**: tu email
   - **Contraseña**: contraseña o app password
   - **Email remitente**: email que aparecerá como remitente
   - **Destinatarios**: lista de emails que recibirán las alertas

### 3. Programación de Health Checks

#### Opción A: Ejecutar Cron Job Localmente (Self-Hosted)

Para entornos self-hosted, usa el script de cron job incluido:

```bash
# Configurar la programación (expresión cron)
export HEALTH_CHECK_SCHEDULE="*/5 * * * *"  # Cada 5 minutos

# Ejecutar el cron job
npm run health-check-cron
```

**Ejemplos de expresiones cron:**

```bash
"*/5 * * * *"   # Cada 5 minutos
"0 * * * *"     # Cada hora
"0 */2 * * *"   # Cada 2 horas
"0 9 * * *"     # Todos los días a las 9:00 AM
"0 9 * * 1-5"   # Lunes a Viernes a las 9:00 AM
"0 0,12 * * *"  # Dos veces al día (medianoche y mediodía)
```

#### Opción B: Servicio Externo de Cron

Usa un servicio de monitoreo externo como:

- **UptimeRobot**: https://uptimerobot.com
- **Cronitor**: https://cronitor.io
- **GitHub Actions**: para proyectos en GitHub

Configura el servicio para hacer peticiones GET a:

```
https://tu-dominio.com/api/health/check?token=TU_HEALTH_CHECK_TOKEN
```

#### Opción C: Vercel Cron (si está desplegado en Vercel)

Crea `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/health/check?token=TU_HEALTH_CHECK_TOKEN",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

## Uso

### Health Check Manual

Los administradores pueden ejecutar un health check manual desde:

```bash
POST /api/health/check
Authorization: Bearer [session-token]
```

### Ver Estado de Salud

```bash
GET /api/health/status
Authorization: Bearer [session-token]
```

### Indicador Visual

Cuando el sistema detecta un fallo, aparece automáticamente una alerta roja en la parte superior del dashboard con:
- Mensaje de error
- Número de fallos consecutivos
- Opción para cerrar temporalmente

## Notificaciones por Email

### Primera Falla

Cuando se detecta un fallo por primera vez, se envía un email a todos los destinatarios configurados con:
- Descripción del error
- Número de fallos consecutivos
- Fecha y hora
- Acciones recomendadas

### Recuperación

Cuando el sistema se recupera después de un fallo, se envía un email de confirmación indicando que todo vuelve a funcionar correctamente.

## Ejecución en Producción

### Como Servicio de Sistema (Linux)

Crea un archivo de servicio systemd: `/etc/systemd/system/inbox-copilot-healthcheck.service`

```ini
[Unit]
Description=Inbox Copilot Health Check Cron
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/inbox-copilot
Environment="NODE_ENV=production"
Environment="HEALTH_CHECK_TOKEN=tu-token"
Environment="NEXT_PUBLIC_APP_URL=https://tu-dominio.com"
Environment="HEALTH_CHECK_SCHEDULE=*/5 * * * *"
ExecStart=/usr/bin/node scripts/health-check-cron.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Luego:

```bash
sudo systemctl enable inbox-copilot-healthcheck
sudo systemctl start inbox-copilot-healthcheck
sudo systemctl status inbox-copilot-healthcheck
```

### Como Proceso PM2

```bash
pm2 start scripts/health-check-cron.js --name health-check-cron
pm2 save
pm2 startup
```

## Logs e Historial

El sistema guarda dos tipos de registros en la base de datos:

1. **SystemHealth**: Estado actual del sistema (última verificación, errores recientes)
2. **HealthCheckLog**: Historial completo de todos los health checks ejecutados

Puedes consultar estos registros desde Prisma Studio:

```bash
npx prisma studio
```

## Solución de Problemas

### El cron job no se ejecuta

1. Verifica que `HEALTH_CHECK_TOKEN` esté configurado correctamente en `.env.local`
2. Asegúrate de que la expresión cron sea válida
3. Verifica los logs del cron job

### No llegan emails

1. Verifica la configuración SMTP en la base de datos (tabla AppSettings)
2. Revisa los logs de la consola para errores de SMTP
3. Si usas Gmail, asegúrate de usar una "App Password" en lugar de tu contraseña normal
4. Verifica que los destinatarios estén correctamente configurados

### Falsas alarmas

1. Ajusta el timeout de la consulta de base de datos si tu servidor es lento
2. Considera aumentar el intervalo entre health checks
3. Revisa la configuración de red entre el servidor y la base de datos

## Configuración Recomendada

Para producción, se recomienda:

- **Frecuencia**: Cada 5-15 minutos (no más frecuente para evitar overhead)
- **Horario**: 24/7 para sistemas críticos, o solo horario laboral para otros
- **Destinatarios**: Lista de admins/devops que puedan actuar rápidamente
- **SMTP**: Usa un servicio dedicado (SendGrid, Mailgun, etc.) en lugar de Gmail

## Seguridad

- ✅ El endpoint GET requiere un token secreto
- ✅ El endpoint POST requiere autenticación de admin
- ✅ Las contraseñas SMTP se almacenan en la base de datos (considera encriptarlas)
- ✅ Los logs no exponen información sensible

## Próximas Mejoras Posibles

- [ ] Encriptar credenciales SMTP en la base de datos
- [ ] Múltiples tipos de health checks (API externa, servicios de terceros, etc.)
- [ ] Dashboard de métricas históricas
- [ ] Integración con Slack/Discord/Teams
- [ ] Configuración de umbrales personalizados para alertas
