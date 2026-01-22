"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";

interface CaseDetail {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority?: string;
  resolution?: string;
  response?: string;
  notes?: string;
  createdAt: string;
  resolvedAt?: string;
  email: {
    id: string;
    subject: string;
    from: string;
    fromEmail: string;
    receivedAt: string;
    bodyPreview: string;
  };
}

export default function CaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [case_, setCase] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    status: "",
    resolution: "",
    response: "",
    notes: "",
  });

  useEffect(() => {
    if (params.id) {
      fetchCase();
    }
  }, [params.id]);

  const fetchCase = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/cases/${params.id}`);
      const data = await res.json();
      setCase(data);
      setFormData({
        status: data.status,
        resolution: data.resolution || "",
        response: data.response || "",
        notes: data.notes || "",
      });
    } catch (error) {
      console.error("Error fetching case:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await fetch(`/api/cases/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      setEditing(false);
      fetchCase();
    } catch (error) {
      console.error("Error updating case:", error);
    }
  };

  const handleMarkResolved = async () => {
    try {
      await fetch(`/api/cases/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "resolved" }),
      });
      fetchCase();
    } catch (error) {
      console.error("Error resolving case:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  if (!case_) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h2 className="mb-2 text-xl font-semibold">Caso no encontrado</h2>
          <Link href="/dashboard/cases">
            <Button variant="outline">Volver a casos</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-8">
      <Link href="/dashboard/cases">
        <Button variant="ghost" size="sm" className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a casos
        </Button>
      </Link>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{case_.title}</h1>
          <p className="text-muted-foreground">
            Creado el {format(new Date(case_.createdAt), "d 'de' MMMM 'de' yyyy", { locale: es })}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant={case_.status === "resolved" ? "secondary" : "destructive"}>
            {case_.status}
          </Badge>
          {case_.priority && <Badge>{case_.priority}</Badge>}
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Correo Relacionado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p>
              <strong>Asunto:</strong> {case_.email.subject}
            </p>
            <p>
              <strong>De:</strong> {case_.email.from} &lt;{case_.email.fromEmail}&gt;
            </p>
            <p>
              <strong>Recibido:</strong>{" "}
              {format(new Date(case_.email.receivedAt), "d 'de' MMMM 'de' yyyy, HH:mm'h'", { locale: es })}
            </p>
            <p className="text-sm text-muted-foreground">{case_.email.bodyPreview}</p>
            <Link href={`/dashboard/email/${case_.email.id}`}>
              <Button variant="outline" size="sm">
                Ver Correo
              </Button>
            </Link>
          </CardContent>
        </Card>

        {editing ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Editar Caso</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Estado</Label>
                  <select
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value })
                    }
                  >
                    <option value="open">Abierto</option>
                    <option value="resolved">Resuelto</option>
                    <option value="closed">Cerrado</option>
                  </select>
                </div>
                <div>
                  <Label>Resolución</Label>
                  <textarea
                    className="mt-1 min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2"
                    value={formData.resolution}
                    onChange={(e) =>
                      setFormData({ ...formData, resolution: e.target.value })
                    }
                    placeholder="Describe cómo se resolvió este caso..."
                  />
                </div>
                <div>
                  <Label>Respuesta Enviada</Label>
                  <textarea
                    className="mt-1 min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2"
                    value={formData.response}
                    onChange={(e) =>
                      setFormData({ ...formData, response: e.target.value })
                    }
                    placeholder="Pega la respuesta que enviaste al cliente..."
                  />
                </div>
                <div>
                  <Label>Notas Internas</Label>
                  <textarea
                    className="mt-1 min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    placeholder="Agrega notas internas..."
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSave}>Guardar Cambios</Button>
                  <Button variant="outline" onClick={() => setEditing(false)}>
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            {case_.resolution && (
              <Card>
                <CardHeader>
                  <CardTitle>Resolución</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap">{case_.resolution}</p>
                </CardContent>
              </Card>
            )}

            {case_.response && (
              <Card>
                <CardHeader>
                  <CardTitle>Respuesta Enviada</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="whitespace-pre-wrap font-sans">{case_.response}</pre>
                </CardContent>
              </Card>
            )}

            {case_.notes && (
              <Card>
                <CardHeader>
                  <CardTitle>Notas Internas</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap">{case_.notes}</p>
                </CardContent>
              </Card>
            )}

            <div className="flex gap-2">
              <Button onClick={() => setEditing(true)}>Editar Caso</Button>
              {case_.status !== "resolved" && (
                <Button variant="outline" onClick={handleMarkResolved}>
                  Marcar como Resuelto
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
