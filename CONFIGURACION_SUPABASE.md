# Guía de Configuración de Supabase

Esta guía te ayudará a configurar Supabase como base de datos para el agente.

## 📋 ¿Qué es Supabase?

Supabase es una alternativa open-source a Firebase que utiliza PostgreSQL como base de datos. Ofrece:
- ✅ Base de datos PostgreSQL totalmente gestionada
- ✅ API REST automática
- ✅ Autenticación integrada
- ✅ Almacenamiento de archivos
- ✅ Funciones en tiempo real

## 🚀 Paso 1: Crear un Proyecto en Supabase

1. Ve a [https://supabase.com](https://supabase.com)
2. Crea una cuenta o inicia sesión
3. Haz clic en "New Project"
4. Completa la información:
   - **Project Name**: `polarisai` (o el nombre que prefieras)
   - **Database Password**: Crea una contraseña segura (guárdala bien)
   - **Region**: Selecciona la región más cercana
5. Haz clic en "Create new project"
6. Espera 2-3 minutos mientras Supabase crea tu proyecto

## 🔑 Paso 2: Obtener las Credenciales de Conexión

1. En tu proyecto de Supabase, ve a **Settings** (⚙️ en el sidebar)
2. Haz clic en **Database**
3. Desplázate hasta la sección **Connection string**
4. Selecciona **"URI"** en el dropdown
5. Verás algo como:

```
postgresql://postgres.abcdefghij:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres
```

Desglosa esta información:
- **Servidor**: `aws-0-us-east-1.pooler.supabase.com`
- **Puerto**: `5432` (por defecto)
- **Base de datos**: `postgres`
- **Usuario**: `postgres.abcdefghij` (o similar)
- **Contraseña**: La que creaste en el paso 1

## ⚙️ Paso 3: Configurar en la Aplicación

1. Inicia la aplicación: `npm run dev`
2. Ve a: http://localhost:3000/dashboard/settings
3. Ve a la pestaña **"Base de Datos del Agente"**
4. Selecciona **"Supabase (PostgreSQL)"** en el dropdown
5. Completa los campos:

### Campos de Configuración

| Campo | Valor | Ejemplo |
|-------|-------|---------|
| **Tipo de Base de Datos** | Supabase (PostgreSQL) | - |
| **Servidor** | Tu host de Supabase | `aws-0-us-east-1.pooler.supabase.com` |
| **Puerto** | 5432 | `5432` |
| **Base de datos** | postgres | `postgres` |
| **Usuario** | Tu usuario de Supabase | `postgres.abcdefghij` |
| **Contraseña** | La contraseña que creaste | `tu-contraseña-segura` |
| **Encriptar Conexión** | ✅ Activado (obligatorio) | ✅ |
| **Confiar en Certificado del Servidor** | ✅ Activado | ✅ |

### ⚠️ Importante para Supabase

- **SSL es obligatorio**: Supabase siempre requiere conexiones SSL
- **Connection Pooler**: Usa el endpoint con `.pooler.supabase.com` (mejor rendimiento)
- **Puerto 5432**: Este es el puerto estándar de PostgreSQL

## ✅ Paso 4: Probar la Conexión

1. Haz clic en **"Probar Conexión"**
2. Debes ver: ✅ **"Conexión exitosa a la base de datos del agente"**
3. Si ves un error, verifica:
   - Las credenciales son correctas
   - Has seleccionado "Supabase (PostgreSQL)" en el tipo
   - El checkbox "Encriptar Conexión" está activado
   - El servidor termina en `.pooler.supabase.com`

## 💾 Paso 5: Guardar y Migrar

1. Haz clic en **"Guardar"**
2. Ahora puedes ejecutar la migración siguiendo la guía principal

## 🔍 Verificar las Tablas en Supabase

Después de completar la migración, puedes ver las tablas creadas:

1. Ve al **Table Editor** en Supabase (icono de tabla en el sidebar)
2. Deberías ver las tablas:
   - `User`
   - `Account`
   - `Session`
   - `VerificationToken`
   - `Email`
   - `Case`
   - `AppSettings`

## 📊 Ventajas de Usar Supabase

✅ **Gratis hasta cierto límite**:
- 500 MB de almacenamiento en base de datos
- 2 GB de transferencia de datos
- 1 GB de almacenamiento de archivos

✅ **Backups automáticos** (en planes de pago)

✅ **Escalabilidad**: Puedes upgradear cuando necesites más recursos

✅ **Dashboard web**: Gestiona tus datos desde el navegador

✅ **API REST**: Acceso directo a tus datos vía API

✅ **Sin servidor**: No necesitas administrar infraestructura

## 🆘 Solución de Problemas

### Error: "Connection timeout"

**Causa**: La IP de tu máquina no está permitida

**Solución**:
1. Ve a **Settings → Database** en Supabase
2. Desplázate a **"Connection Pooling"**
3. Verifica que no hay restricciones de IP
4. O añade tu IP a la lista de IPs permitidas

### Error: "password authentication failed"

**Causa**: Contraseña incorrecta

**Solución**:
1. Puedes resetear la contraseña en **Settings → Database**
2. Haz clic en "Reset database password"
3. Actualiza la contraseña en la configuración de la app

### Error: "SSL required"

**Causa**: No tienes activado el checkbox "Encriptar Conexión"

**Solución**:
- Activa el checkbox "Encriptar Conexión" en la configuración
- Supabase **siempre** requiere SSL

### Error: "role does not exist"

**Causa**: Usuario incorrecto

**Solución**:
- Verifica que estás usando el usuario completo (ej: `postgres.abcdefghij`)
- No uses solo `postgres`, usa el usuario completo que aparece en la connection string

## 💡 Tips y Recomendaciones

1. **Usa el Connection Pooler**: Mejor rendimiento para apps con muchas conexiones
2. **Activa RLS (Row Level Security)**: Para mayor seguridad (configurable en Supabase)
3. **Monitorea el uso**: Revisa el dashboard de Supabase regularmente
4. **Haz backups**: Aunque Supabase hace backups automáticos, es bueno tener los propios
5. **Actualiza el plan si creces**: El plan gratuito es genial para empezar, pero considera upgradear si tu app crece

## 📚 Recursos Adicionales

- [Documentación de Supabase](https://supabase.com/docs)
- [Connection Strings en Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [Límites del Plan Gratuito](https://supabase.com/pricing)

## 🔄 Diferencias vs PostgreSQL Normal

| Característica | PostgreSQL | Supabase |
|----------------|------------|----------|
| Gestión | Manual | Automática |
| Backups | Manual | Automáticos |
| Monitoreo | Configuración manual | Dashboard incluido |
| SSL | Opcional | Obligatorio |
| API REST | No incluida | Incluida |
| Escalado | Manual | Automático |

---

**¡Listo para usar Supabase! 🚀**

Supabase es una excelente opción para producción sin preocuparte por la infraestructura de base de datos.
