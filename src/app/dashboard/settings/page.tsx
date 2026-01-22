"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  CheckCircle2,
  XCircle,
  RefreshCw,
  Database,
  Edit,
  Save,
  X,
  Mail,
  Settings as SettingsIcon,
  Key,
  Server,
  Activity,
  User as UserIcon,
  Palette,
  Sun,
  Moon,
  Sparkles
} from "lucide-react";
import { useState, useEffect } from "react";
import { HealthCheckSettings } from "@/components/health-check-settings";
import { useTheme } from "@/contexts/theme-context";
import { useAlert } from "@/contexts/alert-context";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("general");
  const { theme, setTheme } = useTheme();
  const { showAlert } = useAlert();

  // Theme-based text colors
  const getTextColors = () => {
    switch (theme) {
      case "light":
        return {
          title: "text-gray-900",
          subtitle: "text-gray-600",
          cardTitle: "text-gray-900",
          cardDescription: "text-gray-500",
          cardText: "text-gray-700",
          label: "text-gray-700",
          helperText: "text-gray-500",
          muted: "text-gray-500",
          themeSelectorTitle: "text-gray-900",
          themeSelectorDesc: "text-gray-500",
        };
      case "dark":
        return {
          title: "text-gray-100",
          subtitle: "text-gray-400",
          cardTitle: "text-gray-100",
          cardDescription: "text-gray-400",
          cardText: "text-gray-300",
          label: "text-gray-300",
          helperText: "text-gray-400",
          muted: "text-gray-500",
          themeSelectorTitle: "text-white",
          themeSelectorDesc: "text-gray-400",
        };
      default: // starry
        return {
          title: "text-white",
          subtitle: "text-blue-200/70",
          cardTitle: "text-white",
          cardDescription: "text-blue-200/70",
          cardText: "text-blue-100/90",
          label: "text-blue-100/90",
          helperText: "text-blue-200/60",
          muted: "text-blue-200/60",
          themeSelectorTitle: "text-white",
          themeSelectorDesc: "text-gray-400",
        };
    }
  };

  const textColors = getTextColors();

  // Theme-based background colors
  const getThemeBackgrounds = () => {
    switch (theme) {
      case "light":
        return {
          card: "bg-white border-gray-200",
          cardHover: "hover:bg-gray-50",
          buttonSelector: "bg-white border-gray-200 hover:border-blue-300",
          buttonSelectorActive: "border-blue-500 bg-blue-50",
          statusBox: "bg-gray-50 border-gray-200",
          editForm: "bg-gray-50/50 border-gray-200",
          tabsList: "bg-gray-100",
          tabsTrigger: "text-gray-600 data-[state=active]:bg-white data-[state=active]:text-gray-900",
        };
      case "dark":
        return {
          card: "bg-gray-900 border-gray-700",
          cardHover: "hover:bg-gray-800",
          buttonSelector: "bg-gray-900 border-gray-700 hover:border-blue-500",
          buttonSelectorActive: "border-blue-500 bg-blue-950",
          statusBox: "bg-gray-800 border-gray-700",
          editForm: "bg-gray-800/50 border-gray-700",
          tabsList: "bg-gray-800",
          tabsTrigger: "text-gray-400 data-[state=active]:bg-gray-900 data-[state=active]:text-white",
        };
      default: // starry
        return {
          card: "bg-white/5 backdrop-blur-md border-white/10",
          cardHover: "hover:bg-white/10",
          buttonSelector: "bg-white/5 backdrop-blur-sm border-white/10 hover:border-blue-400/50",
          buttonSelectorActive: "border-blue-500 bg-blue-500/20",
          statusBox: "bg-white/5 border-white/10",
          editForm: "bg-white/5 border-white/10",
          tabsList: "bg-white/10 backdrop-blur-sm",
          tabsTrigger: "text-blue-200/70 data-[state=active]:bg-white/10 data-[state=active]:text-white",
        };
    }
  };

  const themeBg = getThemeBackgrounds();

  // Microsoft credentials states
  const [editingCredentials, setEditingCredentials] = useState(false);
  const [savingCredentials, setSavingCredentials] = useState(false);
  const [credentials, setCredentials] = useState({
    clientId: "",
    clientSecret: "",
    tenantId: "common",
  });
  const [originalCredentials, setOriginalCredentials] = useState({
    clientId: "",
    clientSecret: "",
    tenantId: "common",
  });

  // External database connection states
  const [editingDbConfig, setEditingDbConfig] = useState(false);
  const [savingDbConfig, setSavingDbConfig] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null);
  const [dbConfig, setDbConfig] = useState({
    type: "mssql",
    server: "",
    port: "1433",
    database: "",
    username: "",
    password: "",
    trustServerCertificate: true,
    encrypt: true,
  });
  const [originalDbConfig, setOriginalDbConfig] = useState({
    type: "mssql",
    server: "",
    port: "1433",
    database: "",
    username: "",
    password: "",
    trustServerCertificate: true,
    encrypt: true,
  });

  // Agent database connection states
  const [editingAgentDbConfig, setEditingAgentDbConfig] = useState(false);
  const [savingAgentDbConfig, setSavingAgentDbConfig] = useState(false);
  const [testingAgentConnection, setTestingAgentConnection] = useState(false);
  const [agentConnectionStatus, setAgentConnectionStatus] = useState<string | null>(null);
  const [agentDbConfig, setAgentDbConfig] = useState({
    type: "mssql",
    server: "",
    port: "1433",
    database: "",
    username: "",
    password: "",
    trustServerCertificate: true,
    encrypt: true,
  });
  const [originalAgentDbConfig, setOriginalAgentDbConfig] = useState({
    type: "mssql",
    server: "",
    port: "1433",
    database: "",
    username: "",
    password: "",
    trustServerCertificate: true,
    encrypt: true,
  });

  // User preferences
  const [groupThreads, setGroupThreads] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);

  // Load Microsoft credentials
  const loadCredentials = async () => {
    try {
      const res = await fetch("/api/settings/microsoft");
      const data = await res.json();
      if (data.clientId) {
        setCredentials({
          clientId: data.clientId,
          clientSecret: data.clientSecret || "",
          tenantId: data.tenantId || "common",
        });
        setOriginalCredentials({
          clientId: data.clientId,
          clientSecret: data.clientSecret || "",
          tenantId: data.tenantId || "common",
        });
      }
    } catch (error) {
      console.error("Error loading credentials:", error);
    }
  };

  const loadDbConfig = async () => {
    try {
      const res = await fetch("/api/settings/database");
      const data = await res.json();
      if (data.server) {
        setDbConfig(data);
        setOriginalDbConfig(data);
      }
    } catch (error) {
      console.error("Error loading database config:", error);
    }
  };

  const loadAgentDbConfig = async () => {
    try {
      const res = await fetch("/api/settings/agent-database");
      const data = await res.json();
      if (data.server) {
        setAgentDbConfig(data);
        setOriginalAgentDbConfig(data);
      }
    } catch (error) {
      console.error("Error loading agent database config:", error);
    }
  };

  const loadPreferences = async () => {
    try {
      const res = await fetch("/api/user/preferences");
      const data = await res.json();
      if (data.preferences) {
        setGroupThreads(data.preferences.groupThreads || false);
      }
    } catch (error) {
      console.error("Error loading preferences:", error);
    }
  };

  const updatePreference = async (key: string, value: any) => {
    setSavingPreferences(true);
    try {
      const res = await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.preferences) {
          setGroupThreads(data.preferences.groupThreads || false);
        }
      } else {
        await showAlert("Error", "Error al guardar la preferencia", "error");
      }
    } catch (error) {
      console.error("Error updating preference:", error);
      await showAlert("Error", "Error al guardar la preferencia", "error");
    } finally {
      setSavingPreferences(false);
    }
  };

  const saveCredentials = async () => {
    setSavingCredentials(true);
    try {
      const res = await fetch("/api/settings/microsoft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });

      if (res.ok) {
        setOriginalCredentials(credentials);
        setEditingCredentials(false);
        await showAlert("✅ Éxito", "Credenciales guardadas correctamente. Los cambios se aplicarán de inmediato.", "success");
      } else {
        await showAlert("Error", "Error al guardar las credenciales", "error");
      }
    } catch (error) {
      console.error("Error saving credentials:", error);
      await showAlert("Error", "Error al guardar las credenciales", "error");
    } finally {
      setSavingCredentials(false);
    }
  };

  const saveDbConfig = async () => {
    setSavingDbConfig(true);
    try {
      const res = await fetch("/api/settings/database", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dbConfig),
      });

      if (res.ok) {
        setOriginalDbConfig(dbConfig);
        setEditingDbConfig(false);
        setConnectionStatus("success");
        await showAlert("✅ Éxito", "Configuración guardada correctamente", "success");
      } else {
        await showAlert("Error", "Error al guardar la configuración", "error");
      }
    } catch (error) {
      console.error("Error saving database config:", error);
      await showAlert("Error", "Error al guardar la configuración", "error");
    } finally {
      setSavingDbConfig(false);
    }
  };

  const testDbConnection = async () => {
    setTestingConnection(true);
    setConnectionStatus(null);
    try {
      const res = await fetch("/api/settings/database/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dbConfig),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setConnectionStatus("success");
        await showAlert("✅ Éxito", "Conexión exitosa", "success");
      } else {
        setConnectionStatus("error");
        await showAlert("❌ Error", `Error: ${data.error || "No se pudo conectar"}`, "error");
      }
    } catch (error) {
      console.error("Error testing connection:", error);
      setConnectionStatus("error");
      await showAlert("❌ Error", "Error al probar la conexión", "error");
    } finally {
      setTestingConnection(false);
    }
  };

  const saveAgentDbConfig = async () => {
    setSavingAgentDbConfig(true);
    try {
      const res = await fetch("/api/settings/agent-database", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(agentDbConfig),
      });

      if (res.ok) {
        setOriginalAgentDbConfig(agentDbConfig);
        setEditingAgentDbConfig(false);
        setAgentConnectionStatus("success");
        await showAlert("✅ Éxito", "Configuración guardada correctamente", "success");
      } else {
        await showAlert("Error", "Error al guardar la configuración", "error");
      }
    } catch (error) {
      console.error("Error saving agent database config:", error);
      await showAlert("Error", "Error al guardar la configuración", "error");
    } finally {
      setSavingAgentDbConfig(false);
    }
  };

  const testAgentDbConnection = async () => {
    setTestingAgentConnection(true);
    setAgentConnectionStatus(null);
    try {
      const res = await fetch("/api/settings/agent-database/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(agentDbConfig),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setAgentConnectionStatus("success");
        await showAlert("✅ Éxito", "Conexión exitosa", "success");
      } else {
        setAgentConnectionStatus("error");
        await showAlert("❌ Error", `Error: ${data.error || "No se pudo conectar"}`, "error");
      }
    } catch (error) {
      console.error("Error testing agent connection:", error);
      setAgentConnectionStatus("error");
      await showAlert("❌ Error", "Error al probar la conexión", "error");
    } finally {
      setTestingAgentConnection(false);
    }
  };

  useEffect(() => {
    loadCredentials();
    loadDbConfig();
    loadAgentDbConfig();
    loadPreferences();
  }, []);

  return (
    <div className="h-full overflow-auto p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <SettingsIcon className="h-8 w-8 text-primary" />
          <h1 className={`text-4xl font-bold ${textColors.title}`}>Configuración</h1>
        </div>
        <p className={`${textColors.subtitle} text-lg`}>
          Personaliza tu experiencia y gestiona las integraciones
        </p>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className={`grid w-full grid-cols-4 mb-8 ${themeBg.tabsList}`}>
          <TabsTrigger value="general" className={`gap-2 ${themeBg.tabsTrigger}`}>
            <UserIcon className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="integrations" className={`gap-2 ${themeBg.tabsTrigger}`}>
            <Key className="h-4 w-4" />
            Configuración
          </TabsTrigger>
          <TabsTrigger value="databases" className={`gap-2 ${themeBg.tabsTrigger}`}>
            <Database className="h-4 w-4" />
            Bases de Datos
          </TabsTrigger>
          <TabsTrigger value="system" className={`gap-2 ${themeBg.tabsTrigger}`}>
            <Activity className="h-4 w-4" />
            Sistema
          </TabsTrigger>
        </TabsList>

        {/* TAB: General */}
        <TabsContent value="general" className="space-y-6">
          {/* Theme Selector */}
          <Card className={themeBg.card}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Palette className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className={textColors.cardTitle}>Tema de la Aplicación</CardTitle>
                  <CardDescription className={textColors.cardDescription}>Selecciona el tema visual que prefieras</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Light Theme */}
                <button
                  onClick={() => setTheme("light")}
                  className={`relative p-6 rounded-xl border-2 transition-all duration-200 ${
                    theme === "light"
                      ? themeBg.buttonSelectorActive
                      : themeBg.buttonSelector
                  }`}
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100 border border-gray-200 flex items-center justify-center">
                      <Sun className="h-8 w-8 text-blue-600" />
                    </div>
                    <div className="text-center">
                      <h3 className={`font-semibold ${textColors.themeSelectorTitle}`}>Claro</h3>
                      <p className={`text-sm ${textColors.themeSelectorDesc}`}>Fondo luminoso</p>
                    </div>
                    {theme === "light" && (
                      <Badge className="absolute top-2 right-2 bg-blue-500">
                        <CheckCircle2 className="h-3 w-3" />
                      </Badge>
                    )}
                  </div>
                </button>

                {/* Dark Theme */}
                <button
                  onClick={() => setTheme("dark")}
                  className={`relative p-6 rounded-xl border-2 transition-all duration-200 ${
                    theme === "dark"
                      ? themeBg.buttonSelectorActive
                      : themeBg.buttonSelector
                  }`}
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-slate-950 via-gray-900 to-slate-950 border border-gray-700 flex items-center justify-center">
                      <Moon className="h-8 w-8 text-gray-400" />
                    </div>
                    <div className="text-center">
                      <h3 className={`font-semibold ${textColors.themeSelectorTitle}`}>Oscuro</h3>
                      <p className={`text-sm ${textColors.themeSelectorDesc}`}>Fondo negro</p>
                    </div>
                    {theme === "dark" && (
                      <Badge className="absolute top-2 right-2 bg-blue-500">
                        <CheckCircle2 className="h-3 w-3" />
                      </Badge>
                    )}
                  </div>
                </button>

                {/* Starry Theme */}
                <button
                  onClick={() => setTheme("starry")}
                  className={`relative p-6 rounded-xl border-2 transition-all duration-200 ${
                    theme === "starry"
                      ? themeBg.buttonSelectorActive
                      : themeBg.buttonSelector
                  }`}
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 border border-blue-800 flex items-center justify-center relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-600/10"></div>
                      <Sparkles className="h-8 w-8 text-blue-400 relative z-10" />
                    </div>
                    <div className="text-center">
                      <h3 className={`font-semibold ${textColors.themeSelectorTitle}`}>Estrellitas</h3>
                      <p className={`text-sm ${textColors.themeSelectorDesc}`}>Galaxia animada</p>
                    </div>
                    {theme === "starry" && (
                      <Badge className="absolute top-2 right-2 bg-blue-500">
                        <CheckCircle2 className="h-3 w-3" />
                      </Badge>
                    )}
                  </div>
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Email Preferences */}
          <Card className={themeBg.card}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className={textColors.cardTitle}>Preferencias de Correo</CardTitle>
                  <CardDescription className={textColors.cardDescription}>Personaliza cómo se muestran tus correos</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className={`flex items-center justify-between py-4 px-4 rounded-lg border ${themeBg.statusBox}`}>
                <div className="flex-1">
                  <Label htmlFor="group-threads" className={`text-base font-semibold ${textColors.label}`}>
                    Agrupar conversaciones
                  </Label>
                  <p className={`text-sm ${textColors.helperText} mt-1`}>
                    Agrupa correos del mismo hilo en una sola entrada
                  </p>
                </div>
                <Switch
                  id="group-threads"
                  checked={groupThreads}
                  onCheckedChange={(checked) => {
                    setGroupThreads(checked);
                    updatePreference("groupThreads", checked);
                  }}
                  disabled={savingPreferences}
                  className="ml-4"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: Configuración */}
        <TabsContent value="integrations" className="space-y-6">
          <Card className={themeBg.card}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Key className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle className={textColors.cardTitle}>Microsoft Azure</CardTitle>
                    <CardDescription className={textColors.cardDescription}>Credenciales para Microsoft Graph API (se guardan en la base de datos)</CardDescription>
                  </div>
                </div>
                {!editingCredentials ? (
                  <Button onClick={() => setEditingCredentials(true)} variant="outline" size="sm">
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                  </Button>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Status Badge */}
              <div className={`flex items-center justify-between p-4 rounded-lg border ${themeBg.statusBox}`}>
                <div>
                  <p className={`font-semibold text-sm ${textColors.cardText}`}>Estado de Conexión</p>
                  <p className={`text-sm ${textColors.muted} mt-1`}>
                    {credentials.clientId ? "Microsoft Graph API" : "No configurado"}
                  </p>
                </div>
                {credentials.clientId ? (
                  <Badge className="gap-1 bg-green-600">
                    <CheckCircle2 className="h-3 w-3" />
                    Conectado
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1">
                    <XCircle className="h-3 w-3" />
                    No configurado
                  </Badge>
                )}
              </div>

              {/* Edit Form */}
              {editingCredentials && (
                <div className={`space-y-4 p-4 border rounded-lg ${themeBg.editForm}`}>
                  <div className="space-y-2">
                    <Label htmlFor="clientId" className={textColors.label}>Client ID</Label>
                    <Input
                      id="clientId"
                      value={credentials.clientId}
                      onChange={(e) => setCredentials({ ...credentials, clientId: e.target.value })}
                      placeholder="00000000-0000-0000-0000-000000000000"
                      className="font-mono text-xs"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="clientSecret" className={textColors.label}>Client Secret</Label>
                    <Input
                      id="clientSecret"
                      type="password"
                      value={credentials.clientSecret}
                      onChange={(e) => setCredentials({ ...credentials, clientSecret: e.target.value })}
                      placeholder="••••••••••••••••••••"
                      className="font-mono text-xs"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tenantId" className={textColors.label}>Tenant ID</Label>
                    <Input
                      id="tenantId"
                      value={credentials.tenantId}
                      onChange={(e) => setCredentials({ ...credentials, tenantId: e.target.value })}
                      placeholder="common"
                      className="font-mono text-xs"
                    />
                    <p className={`text-xs ${textColors.helperText}`}>
                      Usa &quot;common&quot; para cuentas personales o tu Tenant ID específico
                    </p>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button onClick={saveCredentials} disabled={savingCredentials || !credentials.clientId || !credentials.clientSecret}>
                      <Save className="mr-2 h-4 w-4" />
                      {savingCredentials ? "Guardando..." : "Guardar"}
                    </Button>
                    <Button
                      onClick={() => {
                        setCredentials(originalCredentials);
                        setEditingCredentials(false);
                      }}
                      variant="outline"
                    >
                      <X className="mr-2 h-4 w-4" />
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: Bases de Datos */}
        <TabsContent value="databases" className="space-y-6">
          {/* External Database */}
          <Card className={themeBg.card}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Server className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle className={textColors.cardTitle}>Base de Datos Externa</CardTitle>
                    <CardDescription className={textColors.cardDescription}>Para que el agente IA aprenda el esquema y ayude con consultas (se guarda en la base de datos)</CardDescription>
                  </div>
                </div>
                {!editingDbConfig && (
                  <Button onClick={() => setEditingDbConfig(true)} variant="outline" size="sm">
                    <Edit className="mr-2 h-4 w-4" />
                    Configurar
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Status */}
              <div className={`flex items-center justify-between p-4 rounded-lg border ${themeBg.statusBox}`}>
                <div>
                  <p className={`font-semibold text-sm ${textColors.label}`}>Estado</p>
                  <p className={`text-sm ${textColors.helperText} mt-1`}>
                    {dbConfig.server ? `${dbConfig.server}:${dbConfig.port} - ${dbConfig.database}` : "No configurado"}
                  </p>
                </div>
                {dbConfig.server ? (
                  <Badge className="gap-1 bg-green-600">
                    <CheckCircle2 className="h-3 w-3" />
                    Configurado
                  </Badge>
                ) : (
                  <Badge variant="outline">Sin configurar</Badge>
                )}
              </div>

              {/* Edit Form */}
              {editingDbConfig && (
                <div className={`space-y-4 p-4 border rounded-lg ${themeBg.editForm}`}>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="db-server" className={textColors.label}>Servidor</Label>
                      <Input
                        id="db-server"
                        value={dbConfig.server}
                        onChange={(e) => setDbConfig({ ...dbConfig, server: e.target.value })}
                        placeholder="localhost"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="db-port" className={textColors.label}>Puerto</Label>
                      <Input
                        id="db-port"
                        value={dbConfig.port}
                        onChange={(e) => setDbConfig({ ...dbConfig, port: e.target.value })}
                        placeholder="1433"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="db-database" className={textColors.label}>Base de Datos</Label>
                    <Input
                      id="db-database"
                      value={dbConfig.database}
                      onChange={(e) => setDbConfig({ ...dbConfig, database: e.target.value })}
                      placeholder="nombre_db"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="db-username" className={textColors.label}>Usuario</Label>
                      <Input
                        id="db-username"
                        value={dbConfig.username}
                        onChange={(e) => setDbConfig({ ...dbConfig, username: e.target.value })}
                        placeholder="usuario"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="db-password" className={textColors.label}>Contraseña</Label>
                      <Input
                        id="db-password"
                        type="password"
                        value={dbConfig.password}
                        onChange={(e) => setDbConfig({ ...dbConfig, password: e.target.value })}
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button onClick={testDbConnection} disabled={testingConnection} variant="outline">
                      <RefreshCw className={`mr-2 h-4 w-4 ${testingConnection ? "animate-spin" : ""}`} />
                      {testingConnection ? "Probando..." : "Probar Conexión"}
                    </Button>
                    <Button onClick={saveDbConfig} disabled={savingDbConfig}>
                      <Save className="mr-2 h-4 w-4" />
                      {savingDbConfig ? "Guardando..." : "Guardar"}
                    </Button>
                    <Button
                      onClick={() => {
                        setDbConfig(originalDbConfig);
                        setEditingDbConfig(false);
                        setConnectionStatus(null);
                      }}
                      variant="outline"
                    >
                      <X className="mr-2 h-4 w-4" />
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Agent Database */}
          <Card className={themeBg.card}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Database className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle className={textColors.cardTitle}>Base de Datos del Agente</CardTitle>
                    <CardDescription className={textColors.cardDescription}>Base de datos que el agente IA utilizará para responder consultas (se guarda en la base de datos)</CardDescription>
                  </div>
                </div>
                {!editingAgentDbConfig && (
                  <Button onClick={() => setEditingAgentDbConfig(true)} variant="outline" size="sm">
                    <Edit className="mr-2 h-4 w-4" />
                    Configurar
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Status */}
              <div className={`flex items-center justify-between p-4 rounded-lg border ${themeBg.statusBox}`}>
                <div>
                  <p className={`font-semibold text-sm ${textColors.label}`}>Estado</p>
                  <p className={`text-sm ${textColors.helperText} mt-1`}>
                    {agentDbConfig.server ? `${agentDbConfig.server}:${agentDbConfig.port} - ${agentDbConfig.database}` : "No configurado"}
                  </p>
                </div>
                {agentDbConfig.server ? (
                  <Badge className="gap-1 bg-green-600">
                    <CheckCircle2 className="h-3 w-3" />
                    Configurado
                  </Badge>
                ) : (
                  <Badge variant="outline">Sin configurar</Badge>
                )}
              </div>

              {/* Edit Form */}
              {editingAgentDbConfig && (
                <div className={`space-y-4 p-4 border rounded-lg ${themeBg.editForm}`}>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="agent-db-server" className={textColors.label}>Servidor</Label>
                      <Input
                        id="agent-db-server"
                        value={agentDbConfig.server}
                        onChange={(e) => setAgentDbConfig({ ...agentDbConfig, server: e.target.value })}
                        placeholder="localhost"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="agent-db-port" className={textColors.label}>Puerto</Label>
                      <Input
                        id="agent-db-port"
                        value={agentDbConfig.port}
                        onChange={(e) => setAgentDbConfig({ ...agentDbConfig, port: e.target.value })}
                        placeholder="1433"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="agent-db-database" className={textColors.label}>Base de Datos</Label>
                    <Input
                      id="agent-db-database"
                      value={agentDbConfig.database}
                      onChange={(e) => setAgentDbConfig({ ...agentDbConfig, database: e.target.value })}
                      placeholder="nombre_db"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="agent-db-username" className={textColors.label}>Usuario</Label>
                      <Input
                        id="agent-db-username"
                        value={agentDbConfig.username}
                        onChange={(e) => setAgentDbConfig({ ...agentDbConfig, username: e.target.value })}
                        placeholder="usuario"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="agent-db-password" className={textColors.label}>Contraseña</Label>
                      <Input
                        id="agent-db-password"
                        type="password"
                        value={agentDbConfig.password}
                        onChange={(e) => setAgentDbConfig({ ...agentDbConfig, password: e.target.value })}
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button onClick={testAgentDbConnection} disabled={testingAgentConnection} variant="outline">
                      <RefreshCw className={`mr-2 h-4 w-4 ${testingAgentConnection ? "animate-spin" : ""}`} />
                      {testingAgentConnection ? "Probando..." : "Probar Conexión"}
                    </Button>
                    <Button onClick={saveAgentDbConfig} disabled={savingAgentDbConfig}>
                      <Save className="mr-2 h-4 w-4" />
                      {savingAgentDbConfig ? "Guardando..." : "Guardar"}
                    </Button>
                    <Button
                      onClick={() => {
                        setAgentDbConfig(originalAgentDbConfig);
                        setEditingAgentDbConfig(false);
                        setAgentConnectionStatus(null);
                      }}
                      variant="outline"
                    >
                      <X className="mr-2 h-4 w-4" />
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: Sistema */}
        <TabsContent value="system" className="space-y-6">
          <Card className={themeBg.card}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Activity className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className={textColors.cardTitle}>Monitoreo de Sistema</CardTitle>
                  <CardDescription className={textColors.cardDescription}>Health checks y estado del sistema</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <HealthCheckSettings />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
