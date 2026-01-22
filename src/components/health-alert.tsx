"use client";

import { useEffect, useState } from "react";
import { AlertCircle, X } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface HealthStatus {
  isHealthy: boolean;
  lastCheckAt: string | null;
  lastErrorAt: string | null;
  lastErrorMessage: string | null;
  consecutiveFailures: number;
}

export function HealthAlert() {
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHealthStatus();

    // Actualizar cada 60 segundos
    const interval = setInterval(fetchHealthStatus, 60000);

    return () => clearInterval(interval);
  }, []);

  const fetchHealthStatus = async () => {
    try {
      const res = await fetch("/api/health/status");
      if (res.ok) {
        const data = await res.json();
        setHealthStatus(data);

        // Si el sistema vuelve a estar saludable, resetear el dismiss
        if (data.isHealthy) {
          setDismissed(false);
        }
      }
    } catch (error) {
      console.error("Error fetching health status:", error);
    } finally {
      setLoading(false);
    }
  };

  // No mostrar nada si está cargando, es saludable, o fue descartado
  if (loading || !healthStatus || healthStatus.isHealthy || dismissed) {
    return null;
  }

  return (
    <Alert variant="destructive" className="relative m-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Sistema con problemas</AlertTitle>
      <AlertDescription>
        {healthStatus.lastErrorMessage ? (
          <>
            Se detectaron problemas de conectividad con la base de datos.
            <br />
            <span className="text-xs opacity-80">
              Último error: {healthStatus.lastErrorMessage}
            </span>
            {healthStatus.consecutiveFailures > 1 && (
              <>
                <br />
                <span className="text-xs opacity-80">
                  Fallos consecutivos: {healthStatus.consecutiveFailures}
                </span>
              </>
            )}
          </>
        ) : (
          "Se detectaron problemas de conectividad con el sistema. Por favor, contacta al administrador."
        )}
      </AlertDescription>
      <Button
        variant="ghost"
        size="sm"
        className="absolute right-2 top-2 h-6 w-6 p-0"
        onClick={() => setDismissed(true)}
      >
        <X className="h-4 w-4" />
      </Button>
    </Alert>
  );
}
