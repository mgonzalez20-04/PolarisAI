# Guía de Migración a Base de Datos del Agente

Esta guía te ayudará a migrar de SQLite (base de datos local) a la base de datos del agente configurada (SQL Server, MySQL o PostgreSQL).

## 📋 Requisitos Previos

1. ✅ Tener configurada la **Base de Datos del Agente** desde la página de ajustes
2. ✅ La base de datos debe estar **accesible** desde tu máquina
3. ✅ El usuario configurado debe tener permisos para **crear tablas**
4. ✅ (Recomendado) Hacer un **backup** de `dev.db` antes de empezar

## 🚀 Proceso de Migración

### Opción A: Migración con Copia de Datos (Recomendado)

Usa esta opción si quieres **conservar** tus usuarios, emails y casos existentes.

```bash
# Paso 1: Configurar la nueva base de datos
npm run db:migrate-to-agent

# Paso 2: Crear las tablas en la base de datos del agente
npx prisma db push

# Paso 3: Regenerar el cliente de Prisma
npx prisma generate

# Paso 4: Copiar todos los datos de SQLite a la nueva BD
npm run db:copy-data

# Paso 5: Reiniciar la aplicación
npm run dev
```

### Opción B: Migración sin Datos (Base de Datos Limpia)

Usa esta opción si quieres empezar **desde cero** con una base de datos vacía.

```bash
# Paso 1: Configurar la nueva base de datos
npm run db:migrate-to-agent

# Paso 2: Crear las tablas en la base de datos del agente
npx prisma db push

# Paso 3: Regenerar el cliente de Prisma
npx prisma generate

# Paso 4: Crear un usuario inicial (opcional)
npm run db:seed

# Paso 5: Reiniciar la aplicación
npm run dev
```

## 📝 Detalles de Cada Paso

### 1. `npm run db:migrate-to-agent`

Este script:
- ✅ Lee la configuración de la Base de Datos del Agente guardada en ajustes
- ✅ Genera el `DATABASE_URL` apropiado para tu tipo de BD
- ✅ Actualiza `.env.local` con el nuevo `DATABASE_URL`
- ✅ Actualiza `prisma/schema.prisma` con el provider correcto
- ✅ Crea backups de `.env.local.backup` y `schema.prisma.backup`

**Salida esperada:**
```
🔍 Leyendo configuración de la base de datos del agente...
✅ Configuración encontrada: mssql - localhost:1433 - agente_db
📝 DATABASE_URL generado para sqlserver
💾 Backup creado: .env.local.backup
✅ .env.local actualizado con nueva DATABASE_URL
💾 Backup creado: prisma/schema.prisma.backup
✅ schema.prisma actualizado con provider: sqlserver

🎉 MIGRACIÓN CONFIGURADA CORRECTAMENTE
```

### 2. `npx prisma db push`

Este comando de Prisma:
- ✅ Se conecta a la base de datos del agente
- ✅ Crea todas las tablas necesarias (User, Email, Case, etc.)
- ✅ Crea los índices y relaciones

**Nota:** Si ves errores aquí, verifica:
- La base de datos del agente está accesible
- Las credenciales son correctas
- El usuario tiene permisos para crear tablas

### 3. `npx prisma generate`

Este comando:
- ✅ Regenera el cliente de Prisma para el nuevo provider
- ✅ Actualiza los tipos de TypeScript

### 4. `npm run db:copy-data` (Solo Opción A)

Este script:
- ✅ Se conecta a ambas bases de datos (SQLite y nueva BD)
- ✅ Copia todos los registros en el orden correcto
- ✅ Mantiene las relaciones intactas

**Importante:** Este paso solo funciona si la base de datos del agente está **vacía**. Si hay datos existentes, habrá errores por claves duplicadas.

### 5. `npm run dev`

Reinicia la aplicación para que use la nueva base de datos.

## ⚠️ Problemas Comunes

### Error: "No hay configuración de base de datos del agente guardada"

**Causa:** No has configurado la Base de Datos del Agente en la página de ajustes.

**Solución:**
1. Ve a http://localhost:3000/dashboard/settings
2. Pestaña "Base de Datos del Agente"
3. Configura y prueba la conexión
4. Guarda la configuración

### Error: "ECONNREFUSED" o "Connection timeout"

**Causa:** La base de datos no está accesible desde tu máquina.

**Solución:**
- Verifica que el servidor de BD esté corriendo
- Verifica el firewall/puerto
- Verifica que las credenciales sean correctas
- Prueba la conexión desde la página de ajustes primero

### Error: "Duplicate key" durante copia de datos

**Causa:** La base de datos del agente no está vacía.

**Solución:**
1. Elimina todos los datos de la base de datos del agente
2. O usa una base de datos completamente nueva
3. Vuelve a ejecutar `npm run db:copy-data`

### Error: "Table already exists" en db:push

**Causa:** Las tablas ya existen en la base de datos.

**Solución:**
- Si quieres empezar de cero: Elimina todas las tablas y vuelve a ejecutar
- Si quieres usar las tablas existentes: Salta el paso `npx prisma db push`

## 🔄 Revertir la Migración

Si algo sale mal y quieres volver a SQLite:

```bash
# 1. Restaurar archivos desde backups
cp .env.local.backup .env.local
cp prisma/schema.prisma.backup prisma/schema.prisma

# 2. Regenerar cliente de Prisma
npx prisma generate

# 3. Reiniciar aplicación
npm run dev
```

## 📊 Verificar la Migración

Después de la migración, verifica:

1. ✅ Puedes iniciar sesión con tu usuario
2. ✅ Los emails se sincronizan correctamente
3. ✅ Los casos se muestran correctamente
4. ✅ Puedes crear nuevos casos

## 🗑️ Limpiar Archivos Antiguos (Opcional)

Una vez que hayas verificado que todo funciona:

```bash
# Hacer backup final de SQLite
cp dev.db dev.db.backup

# Eliminar archivo SQLite (opcional)
# rm dev.db
# rm dev.db-journal

# Eliminar backups de configuración
# rm .env.local.backup
# rm prisma/schema.prisma.backup
```

## 💡 Consejos

- **Siempre haz un backup** antes de empezar
- **Prueba la conexión** desde la página de ajustes antes de migrar
- **Verifica los permisos** del usuario de BD antes de empezar
- **Lee los mensajes de error** cuidadosamente, suelen indicar el problema exacto
- **No te saltes pasos** del proceso de migración

## 🆘 Ayuda

Si tienes problemas:

1. Revisa esta guía completa
2. Verifica los logs en la consola del navegador y del servidor
3. Verifica que la configuración de la BD del agente sea correcta
4. Prueba la conexión desde la página de ajustes
5. Revierte y vuelve a intentar siguiendo los pasos exactamente

## 📦 Diferencias entre Proveedores

### SQL Server
- Provider: `sqlserver`
- Puerto por defecto: `1433`
- Requiere: Instancia de SQL Server 2017 o superior

### MySQL
- Provider: `mysql`
- Puerto por defecto: `3306`
- Requiere: MySQL 5.7+ o MariaDB 10.3+

### PostgreSQL
- Provider: `postgresql`
- Puerto por defecto: `5432`
- Requiere: PostgreSQL 10+

### Supabase
- Provider: `postgresql` (usa PostgreSQL)
- Puerto por defecto: `5432`
- Requiere: Cuenta en Supabase (gratis disponible)
- **SSL obligatorio**: Siempre requiere conexión encriptada
- **Recomendado**: Para producción sin gestionar infraestructura
- **Guía detallada**: Ver `CONFIGURACION_SUPABASE.md`

## ✨ Beneficios de la Migración

Después de migrar a la base de datos del agente:

1. ✅ **Mayor capacidad**: Sin límites de SQLite
2. ✅ **Mejor rendimiento**: Para grandes volúmenes de datos
3. ✅ **Escalabilidad**: Preparado para producción
4. ✅ **Concurrencia**: Múltiples usuarios simultáneos
5. ✅ **Backup profesional**: Herramientas de respaldo empresariales
6. ✅ **Integración**: Fácil integración con otras aplicaciones

---

**¡Éxito en tu migración! 🚀**
