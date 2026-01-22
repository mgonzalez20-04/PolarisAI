"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Folder } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";

interface Case {
  id: string;
  title: string;
  status: string;
  priority?: string;
  createdAt: string;
  resolvedAt?: string;
  email: {
    subject: string;
    from: string;
    receivedAt: string;
  };
}

export default function CasesPage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchCases();
  }, [filter]);

  const fetchCases = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== "all") params.set("status", filter);

      const res = await fetch(`/api/cases?${params.toString()}`);
      const data = await res.json();
      setCases(data);
    } catch (error) {
      console.error("Error fetching cases:", error);
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh silencioso cada 10 segundos
  const refreshCases = async () => {
    try {
      const params = new URLSearchParams();
      if (filter !== "all") params.set("status", filter);

      const res = await fetch(`/api/cases?${params.toString()}`);
      const data = await res.json();

      // Solo actualizar si hay cambios reales
      const hasChanges = JSON.stringify(data) !== JSON.stringify(cases);

      if (hasChanges) {
        setCases(data);
      }
    } catch (error) {
      console.error("Error refreshing cases:", error);
    }
  };

  // Polling inteligente: se pausa cuando el tab no está visible
  useEffect(() => {
    let interval: NodeJS.Timeout;

    const startPolling = () => {
      interval = setInterval(() => {
        // Solo hacer polling si la página está visible
        if (document.visibilityState === 'visible') {
          refreshCases();
        }
      }, 30000); // Aumentado a 30 segundos
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Fetch inmediato al volver a la página
        refreshCases();
        // Reiniciar polling
        clearInterval(interval);
        startPolling();
      } else {
        // Pausar polling cuando no está visible
        clearInterval(interval);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    startPolling();

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [filter, cases]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "destructive";
      case "resolved":
        return "secondary";
      case "closed":
        return "outline";
      default:
        return "default";
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case "urgent":
        return "destructive";
      case "high":
        return "destructive";
      case "medium":
        return "default";
      case "low":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <div className="h-full p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Casos</h1>
          <p className="text-muted-foreground">
            {cases.length} caso{cases.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <div className="mb-4 flex gap-2">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("all")}
        >
          Todos
        </Button>
        <Button
          variant={filter === "open" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("open")}
        >
          Abiertos
        </Button>
        <Button
          variant={filter === "resolved" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("resolved")}
        >
          Resueltos
        </Button>
        <Button
          variant={filter === "closed" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("closed")}
        >
          Cerrados
        </Button>
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground">Cargando...</div>
      ) : cases.length === 0 ? (
        <Card className="p-12 text-center">
          <Folder className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-semibold">No se encontraron casos</h3>
          <p className="text-muted-foreground">
            Crea casos desde tus correos para rastrear y resolver incidencias
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {cases.map((case_) => (
            <Link key={case_.id} href={`/dashboard/cases/${case_.id}`}>
              <Card className="p-4 transition-colors hover:bg-muted/50">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{case_.title}</h3>
                      <Badge variant={getStatusColor(case_.status)}>
                        {case_.status}
                      </Badge>
                      {case_.priority && (
                        <Badge variant={getPriorityColor(case_.priority)}>
                          {case_.priority}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Correo: {case_.email.subject}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      De: {case_.email.from}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">
                      Creado: {format(new Date(case_.createdAt), "d MMMM yyyy", { locale: es })}
                    </p>
                    {case_.resolvedAt && (
                      <p className="text-sm text-green-600">
                        Resuelto: {format(new Date(case_.resolvedAt), "d MMMM yyyy", { locale: es })}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
