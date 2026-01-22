# Manual Portal BGB - INTRODUCCIÓN Y PROPÓSITO

_Capítulo 1 del Manual Técnico Portal BGB (MoveIT)_

---

## 1. INTRODUCCIÓN Y PROPÓSITO

### 1.1 ¿Qué es el Portal BGB?

El **Portal BGB (BMW Gateway Barcelona)** es una aplicación web empresarial que gestiona la logística y transporte de vehículos BMW para el grupo BER-CEVA. El portal actúa como hub centralizado para:

- **Solicitudes de transporte** de vehículos entre concesionarios
- **Solicitudes de servicios** (reparaciones, mantenimiento, preparación)
- **Gestión de trasiegos** (cambios de ruta durante transporte)
- **Cesiones de vehículos** (cambios de propietario/concesionario)
- **Seguimiento en tiempo real** del estado de vehículos
- **Integración** con sistemas TMS (Transport Management System) y SLC (Supplier Logistic Client)

### 1.2 Usuarios del Sistema

| Tipo de Usuario | Rol | Permisos Principales |
|-----------------|-----|---------------------|
| **Administrador** | Gestión completa del sistema | Crear usuarios, asignar permisos, configurar sistema |
| **Usuario Red (Concesionario)** | Solicitar servicios y transportes | Ver vehículos de su red, crear solicitudes |
| **Usuario Transportista** | Ver transportes asignados | Consultar estado de transportes, confirmar entregas |
| **Usuario Gestión** | Supervisar operaciones | Ver todas las solicitudes, generar reportes |
| **Soporte Técnico** | Resolver incidencias | Acceso lectura a BD, consultar logs, analizar errores |

### 1.3 Propósito de Este Manual

Este manual está diseñado específicamente para un **agente de IA con acceso de solo lectura a la base de datos** que ayudará en la resolución de tickets de soporte. El agente podrá:

✅ Consultar la base de datos para obtener información sobre solicitudes, usuarios, vehículos, etc.
✅ Entender los flujos de negocio para diagnosticar problemas
✅ Proporcionar consultas SQL útiles para investigar incidencias
✅ Identificar patrones de errores comunes
✅ Sugerir soluciones basadas en el conocimiento del sistema

❌ NO podrá modificar datos en la base de datos
❌ NO podrá ejecutar operaciones de escritura (INSERT, UPDATE, DELETE)

---