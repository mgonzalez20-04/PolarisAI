"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Database, Server, CheckCircle2, XCircle, AlertCircle, RefreshCw, Copy, Check, Code2, Play, Loader2 } from "lucide-react";
import { useTheme } from "@/contexts/theme-context";
import { useAlert } from "@/contexts/alert-context";

interface SchemaIssue {
  type: "missing_table" | "missing_column" | "missing_relation" | "type_mismatch";
  severity: "error" | "warning";
  message: string;
  table?: string;
  column?: string;
  sqlFix?: string;
}

interface DatabaseStatus {
  connected: boolean;
  error?: string;
  schemaIssues?: SchemaIssue[];
}

interface HealthCheckResult {
  externalDb: DatabaseStatus;
  agentDb: DatabaseStatus;
  timestamp: string;
}

export function HealthCheckSettings() {
  const { theme } = useTheme();
  const { showAlert, showConfirm } = useAlert();
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<HealthCheckResult | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedGeneral, setCopiedGeneral] = useState(false);
  const [expandedSql, setExpandedSql] = useState<number | null>(null);
  const [executingIndex, setExecutingIndex] = useState<number | null>(null);
  const [executingGeneral, setExecutingGeneral] = useState(false);
  const [successIndex, setSuccessIndex] = useState<number | null>(null);
  const [successGeneral, setSuccessGeneral] = useState(false);

  // Theme-based text colors
  const getTextColors = () => {
    switch (theme) {
      case "light":
        return {
          title: "text-gray-900",
          subtitle: "text-gray-600",
          label: "text-gray-700",
          text: "text-gray-700",
          muted: "text-gray-500",
        };
      case "dark":
        return {
          title: "text-gray-100",
          subtitle: "text-gray-400",
          label: "text-gray-300",
          text: "text-gray-300",
          muted: "text-gray-500",
        };
      default: // starry
        return {
          title: "text-white",
          subtitle: "text-blue-200/70",
          label: "text-blue-100/90",
          text: "text-blue-100/90",
          muted: "text-blue-200/60",
        };
    }
  };

  const getThemeBackgrounds = () => {
    switch (theme) {
      case "light":
        return {
          statusBox: "bg-gray-50 border-gray-200",
          issueBox: "bg-yellow-50 border-yellow-200",
          successBox: "bg-green-50 border-green-200",
          errorBox: "bg-red-50 border-red-200",
          codeBox: "bg-gray-900 border-gray-700",
          codeText: "text-green-400",
        };
      case "dark":
        return {
          statusBox: "bg-gray-800 border-gray-700",
          issueBox: "bg-yellow-900/20 border-yellow-700",
          successBox: "bg-green-900/20 border-green-700",
          errorBox: "bg-red-900/20 border-red-700",
          codeBox: "bg-gray-950 border-gray-800",
          codeText: "text-green-400",
        };
      default: // starry
        return {
          statusBox: "bg-white/5 border-white/10",
          issueBox: "bg-yellow-500/10 border-yellow-500/30",
          successBox: "bg-green-500/10 border-green-500/30",
          errorBox: "bg-red-500/10 border-red-500/30",
          codeBox: "bg-black/40 border-blue-500/30",
          codeText: "text-cyan-300",
        };
    }
  };

  const textColors = getTextColors();
  const themeBg = getThemeBackgrounds();

  const copyToClipboard = async (text: string, index?: number) => {
    try {
      await navigator.clipboard.writeText(text);
      if (index !== undefined) {
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
      } else {
        setCopiedGeneral(true);
        setTimeout(() => setCopiedGeneral(false), 2000);
      }
    } catch (error) {
      console.error("Error copying to clipboard:", error);
    }
  };

  const generateGeneralSQL = () => {
    if (!result?.agentDb.schemaIssues) return "";

    const errorIssues = result.agentDb.schemaIssues.filter(
      (issue) => issue.severity === "error" && issue.sqlFix
    );

    const warningIssues = result.agentDb.schemaIssues.filter(
      (issue) => issue.severity === "warning" && issue.sqlFix
    );

    if (errorIssues.length === 0 && warningIssues.length === 0) return "";

    let sql = "";

    // Add errors section
    if (errorIssues.length > 0) {
      sql += "-- ========================================\n";
      sql += "-- ERRORES (Críticos)\n";
      sql += "-- ========================================\n\n";
      sql += errorIssues.map((issue) => issue.sqlFix).join("\n\n");
    }

    // Add warnings section
    if (warningIssues.length > 0) {
      if (sql) sql += "\n\n\n";
      sql += "-- ========================================\n";
      sql += "-- ADVERTENCIAS (Opcionales)\n";
      sql += "-- ========================================\n\n";
      sql += warningIssues.map((issue) => issue.sqlFix).join("\n\n");
    }

    return sql;
  };

  const executeSQL = async (sql: string, index?: number) => {
    const isDestructive = sql.includes("DROP");
    const confirmation = await showConfirm(
      isDestructive ? "⚠️ Acción Destructiva" : "Ejecutar SQL",
      "¿Estás seguro de que quieres ejecutar este SQL en la base de datos?\n\n" +
        "Esta acción modificará la estructura de la base de datos y no se puede deshacer.\n" +
        (isDestructive ? "\n🔥 Esta acción eliminará datos permanentemente.\n" : "") +
        "\nAsegúrate de tener un respaldo antes de continuar.",
      isDestructive ? "error" : "warning"
    );

    if (!confirmation) {
      return;
    }

    if (index !== undefined) {
      setExecutingIndex(index);
      setSuccessIndex(null);
    } else {
      setExecutingGeneral(true);
      setSuccessGeneral(false);
    }

    try {
      const res = await fetch("/api/health/execute-sql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // Show success state on button
        if (index !== undefined) {
          setSuccessIndex(index);
          setTimeout(() => setSuccessIndex(null), 3000);
        } else {
          setSuccessGeneral(true);
          setTimeout(() => setSuccessGeneral(false), 3000);
        }

        await showAlert(
          "✅ Ejecución Exitosa",
          `${data.message}\n\nSe ha actualizado el esquema de la base de datos correctamente.\n\nVuelve a ejecutar la verificación para ver los cambios.`,
          "success"
        );
        // Refresh health check
        await runHealthCheck();
      } else {
        // Show detailed error with results if available
        let errorMessage = data.error || "Error desconocido";
        if (data.results && data.results.length > 0) {
          const failedResults = data.results.filter((r: any) => !r.success);
          if (failedResults.length > 0) {
            errorMessage = "Errores al ejecutar SQL:\n\n" +
              failedResults.map((r: any) => `• ${r.statement}\n  Error: ${r.error}`).join("\n\n");
          }
        }
        await showAlert(
          "❌ Error al Ejecutar",
          errorMessage,
          "error"
        );
      }
    } catch (error: any) {
      console.error("Error executing SQL:", error);
      await showAlert(
        "❌ Error",
        `Error al ejecutar SQL:\n\n${error.message}`,
        "error"
      );
    } finally {
      if (index !== undefined) {
        setExecutingIndex(null);
      } else {
        setExecutingGeneral(false);
      }
    }
  };

  const runHealthCheck = async () => {
    setTesting(true);
    try {
      const res = await fetch("/api/health/database-check", {
        method: "POST",
      });

      if (res.ok) {
        const data = await res.json();
        setResult(data);

        // Show success/info feedback
        const externalDbOk = data.externalDb.connected;
        const agentDbOk = data.agentDb.connected;
        const schemaIssues = data.agentDb.schemaIssues?.length || 0;

        if (externalDbOk && agentDbOk && schemaIssues === 0) {
          await showAlert(
            "✅ Verificación Completada",
            "Todas las conexiones están funcionando correctamente y el esquema está completo.",
            "success"
          );
        } else if (externalDbOk && agentDbOk && schemaIssues > 0) {
          await showAlert(
            "⚠️ Verificación Completada",
            `Conexiones establecidas correctamente.\n\nSe detectaron ${schemaIssues} problema(s) en el esquema de la base de datos del agente.`,
            "warning"
          );
        } else {
          await showAlert(
            "❌ Problemas Detectados",
            `No se pudieron establecer todas las conexiones:\n\n` +
            `${!externalDbOk ? "❌ Base de datos externa: Error de conexión\n" : ""}` +
            `${!agentDbOk ? "❌ Base de datos del agente: Error de conexión\n" : ""}`,
            "error"
          );
        }
      } else {
        const error = await res.json();
        await showAlert(
          "❌ Error",
          `Error al ejecutar health check: ${error.error || "Error desconocido"}`,
          "error"
        );
      }
    } catch (error) {
      console.error("Error running health check:", error);
      await showAlert(
        "❌ Error",
        "Error al ejecutar health check",
        "error"
      );
    } finally {
      setTesting(false);
    }
  };

  const getSeverityBadge = (severity: "error" | "warning") => {
    if (severity === "error") {
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" />
          Error
        </Badge>
      );
    }
    return (
      <Badge className="gap-1 bg-yellow-600">
        <AlertCircle className="h-3 w-3" />
        Advertencia
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {/* Botón para ejecutar health check */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className={`text-sm font-semibold ${textColors.label}`}>
            Verificación de Bases de Datos
          </h3>
          <p className={`text-xs ${textColors.muted} mt-1`}>
            Prueba la conexión y valida el esquema de las bases de datos configuradas
          </p>
        </div>
        <Button onClick={runHealthCheck} disabled={testing} variant="outline" size="sm">
          <RefreshCw className={`mr-2 h-4 w-4 ${testing ? "animate-spin" : ""}`} />
          {testing ? "Verificando..." : "Ejecutar Verificación"}
        </Button>
      </div>

      {result && (
        <>
          <Separator />

          {/* Base de Datos Externa */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4 text-primary" />
              <h4 className={`text-sm font-semibold ${textColors.label}`}>
                Base de Datos Externa
              </h4>
            </div>

            <div className={`flex items-center justify-between p-3 rounded-lg border ${themeBg.statusBox}`}>
              <div>
                <p className={`font-semibold text-sm ${textColors.text}`}>Estado de Conexión</p>
                <p className={`text-xs ${textColors.muted} mt-1`}>
                  {result.externalDb.connected
                    ? "Conectado correctamente"
                    : result.externalDb.error || "Error al conectar"}
                </p>
              </div>
              {result.externalDb.connected ? (
                <Badge className="gap-1 bg-green-600">
                  <CheckCircle2 className="h-3 w-3" />
                  Conectado
                </Badge>
              ) : (
                <Badge variant="destructive" className="gap-1">
                  <XCircle className="h-3 w-3" />
                  Error
                </Badge>
              )}
            </div>
          </div>

          <Separator />

          {/* Base de Datos del Agente */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" />
              <h4 className={`text-sm font-semibold ${textColors.label}`}>
                Base de Datos del Agente (Supabase)
              </h4>
            </div>

            <div className={`flex items-center justify-between p-3 rounded-lg border ${themeBg.statusBox}`}>
              <div>
                <p className={`font-semibold text-sm ${textColors.text}`}>Estado de Conexión</p>
                <p className={`text-xs ${textColors.muted} mt-1`}>
                  {result.agentDb.connected
                    ? "Conectado correctamente"
                    : result.agentDb.error || "Error al conectar"}
                </p>
              </div>
              {result.agentDb.connected ? (
                <Badge className="gap-1 bg-green-600">
                  <CheckCircle2 className="h-3 w-3" />
                  Conectado
                </Badge>
              ) : (
                <Badge variant="destructive" className="gap-1">
                  <XCircle className="h-3 w-3" />
                  Error
                </Badge>
              )}
            </div>

            {/* Validación de Esquema */}
            {result.agentDb.connected && result.agentDb.schemaIssues && (
              <div className="space-y-2 mt-3">
                <h5 className={`text-sm font-semibold ${textColors.label}`}>
                  Validación de Esquema
                </h5>

                {result.agentDb.schemaIssues.length === 0 ? (
                  <div className={`p-3 rounded-lg border ${themeBg.successBox}`}>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <p className={`text-sm ${textColors.text}`}>
                        ✅ El esquema está completo y correcto
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className={`p-3 rounded-lg border ${themeBg.issueBox}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                        <p className={`text-sm font-semibold ${textColors.text}`}>
                          Se encontraron {result.agentDb.schemaIssues.length} problema(s)
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {result.agentDb.schemaIssues.map((issue, index) => (
                        <div
                          key={index}
                          className={`rounded-lg border ${
                            issue.severity === "error" ? themeBg.errorBox : themeBg.issueBox
                          }`}
                        >
                          <div className="p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <p className={`text-sm font-medium ${textColors.text}`}>{issue.message}</p>
                                {issue.table && (
                                  <p className={`text-xs ${textColors.muted} mt-1`}>
                                    Tabla: <code className="font-mono">{issue.table}</code>
                                    {issue.column && (
                                      <>
                                        {" "}
                                        - Columna: <code className="font-mono">{issue.column}</code>
                                      </>
                                    )}
                                  </p>
                                )}
                              </div>
                              {getSeverityBadge(issue.severity)}
                            </div>

                            {/* SQL Fix Section */}
                            {issue.sqlFix && (
                              <div className="mt-3 space-y-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Button
                                    onClick={() => setExpandedSql(expandedSql === index ? null : index)}
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs"
                                  >
                                    <Code2 className="h-3 w-3 mr-1" />
                                    {expandedSql === index ? "Ocultar SQL" : "Ver SQL"}
                                  </Button>
                                  <Button
                                    onClick={() => copyToClipboard(issue.sqlFix!, index)}
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs"
                                  >
                                    {copiedIndex === index ? (
                                      <>
                                        <Check className="h-3 w-3 mr-1" />
                                        Copiado
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="h-3 w-3 mr-1" />
                                        Copiar SQL
                                      </>
                                    )}
                                  </Button>
                                  <Button
                                    onClick={() => executeSQL(issue.sqlFix!, index)}
                                    variant="default"
                                    size="sm"
                                    className={`h-7 text-xs ${
                                      successIndex === index
                                        ? "bg-green-600 hover:bg-green-700"
                                        : issue.severity === "error"
                                        ? "bg-green-600 hover:bg-green-700"
                                        : "bg-yellow-600 hover:bg-yellow-700"
                                    }`}
                                    disabled={executingIndex === index}
                                  >
                                    {executingIndex === index ? (
                                      <>
                                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                        Ejecutando...
                                      </>
                                    ) : successIndex === index ? (
                                      <>
                                        <CheckCircle2 className="h-3 w-3 mr-1" />
                                        ¡Ejecutado!
                                      </>
                                    ) : (
                                      <>
                                        <Play className="h-3 w-3 mr-1" />
                                        Ejecutar SQL
                                      </>
                                    )}
                                  </Button>
                                </div>

                                {expandedSql === index && (
                                  <div className={`rounded-lg border ${themeBg.codeBox} p-3 overflow-x-auto`}>
                                    <pre className={`text-xs font-mono ${themeBg.codeText}`}>
                                      {issue.sqlFix}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SQL General Fix */}
          {result.agentDb.connected && result.agentDb.schemaIssues && result.agentDb.schemaIssues.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className={`text-sm font-semibold ${textColors.label}`}>
                      Script SQL Completo
                    </h5>
                    <p className={`text-xs ${textColors.muted} mt-1`}>
                      Soluciona todos los errores detectados con un solo script
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => copyToClipboard(generateGeneralSQL())}
                      variant="outline"
                      size="sm"
                      disabled={!generateGeneralSQL()}
                    >
                      {copiedGeneral ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-2" />
                          Copiar Todo
                        </>
                      )}
                    </Button>
                    {generateGeneralSQL() && (
                      <Button
                        onClick={() => executeSQL(generateGeneralSQL())}
                        variant="default"
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        disabled={executingGeneral}
                      >
                        {executingGeneral ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Ejecutando...
                          </>
                        ) : successGeneral ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            ¡Ejecutado!
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-2" />
                            Ejecutar Todo
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>

                {generateGeneralSQL() && (
                  <div className={`rounded-lg border ${themeBg.codeBox} p-4 overflow-x-auto`}>
                    <pre className={`text-sm font-mono ${themeBg.codeText} leading-relaxed`}>
                      {generateGeneralSQL()}
                    </pre>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Timestamp */}
          <div className="pt-2">
            <p className={`text-xs ${textColors.muted}`}>
              Última verificación: {new Date(result.timestamp).toLocaleString("es-ES")}
            </p>
          </div>
        </>
      )}

      {!result && (
        <div className={`p-4 rounded-lg border ${themeBg.statusBox} text-center`}>
          <p className={`text-sm ${textColors.muted}`}>
            Haz clic en "Ejecutar Verificación" para revisar el estado de las bases de datos
          </p>
        </div>
      )}
    </div>
  );
}
