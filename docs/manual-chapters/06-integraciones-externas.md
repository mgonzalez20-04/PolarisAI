# Manual Portal BGB - INTEGRACIONES EXTERNAS

_Capítulo 6 del Manual Técnico Portal BGB (MoveIT)_

---

## 6. INTEGRACIONES EXTERNAS

El Portal BGB se integra con múltiples sistemas externos para gestionar el ciclo completo de vehículos. Esta sección documenta cada integración en detalle.

### 6.1 Arquitectura de Integraciones

```
┌───────────────────────────────────────────────────────────────┐
│                     PORTAL BGB (Core)                         │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │           Service Agents (Capa de Integración)          │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │ │
│  │  │APIMoveIT │ │  APITMS  │ │  APISLC  │ │  Email   │  │ │
│  │  └─────┬────┘ └─────┬────┘ └─────┬────┘ └─────┬────┘  │ │
│  └────────┼────────────┼────────────┼────────────┼────────┘ │
└───────────┼────────────┼────────────┼────────────┼──────────┘
            │            │            │            │
            │            │            │            │
     ┌──────▼──────┐ ┌──▼──────────┐ │      ┌────▼─────┐
     │   MoveIT    │ │Azure Service│ │      │  SMTP    │
     │   Gateway   │ │     Bus     │ │      │  Server  │
     │             │ │             │ │      └──────────┘
     │ SOAP + REST │ │   Queue     │ │
     └─────────────┘ │    "tms"    │ │
                     │    "slc"    │ │
                     └──────┬──────┘ │
                            │        │
                     ┌──────▼──────┐ │
                     │  TMS System │ │
                     │  (External) │ │
                     └─────────────┘ │
                                     │
                              ┌──────▼──────┐
                              │  SLC System │
                              │  (External) │
                              │   SOAP API  │
                              └─────────────┘
```

### 6.2 Integración con MoveIT Gateway

**Service Agent:** `Acerca-Portal-BMW.ServiceAgent.APIMoveIT`
**Propósito:** Consultar estado de vehículos en tiempo real y gestionar movimientos

#### Configuración (appsettings.json)

```json
{
  "BGBMoveIT": {
    "SoapURLMoveIT": "https://gateway.moveecar.io/bmw/bmwbgm/inbound-soap/{ENV}/BgbService",
    "TMSMoveitApi": "https://gateway.moveecar.io/bmw/bmwbgm/inbound-rest/{ENV}/",
    "MoveitToken": "2e6aecba-6279-4b39-a9b9-2547c6d28353",
    "CustomerExposedApi": "https://gateway.moveecar.io/customer-exposed/{ENV}/",
    "ENV": "TST"
  }
}
```

**Ambientes disponibles:**
- **TST** (Test): Desarrollo y pruebas
- **QAL** (Quality Assurance): Pre-producción
- **PRD** (Producción): Ambiente productivo

**URLs completas por ambiente:**
- TST: `https://gateway.moveecar.io/bmw/bmwbgm/inbound-soap/TST/BgbService`
- QAL: `https://gateway.moveecar.io/bmw/bmwbgm/inbound-soap/QAL/BgbService`
- PRD: `https://gateway.moveecar.io/bmw/bmwbgm/inbound-soap/PRD/BgbService`

---