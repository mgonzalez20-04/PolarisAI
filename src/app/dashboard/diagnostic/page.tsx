"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, AlertTriangle, RefreshCw } from "lucide-react";

interface DiagnosticCheck {
  status: string;
  message?: string;
  data?: any;
}

interface DiagnosticData {
  overall: string;
  timestamp: string;
  checks: Record<string, DiagnosticCheck>;
}

export default function DiagnosticPage() {
  const [diagnostics, setDiagnostics] = useState<DiagnosticData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDiagnostics = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/diagnostic");
      const data = await res.json();
      setDiagnostics(data);
    } catch (error) {
      console.error("Error loading diagnostics:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDiagnostics();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "OK":
        return <CheckCircle2 className="h-6 w-6 text-green-500" />;
      case "WARNING":
        return <AlertTriangle className="h-6 w-6 text-yellow-500" />;
      case "ERROR":
        return <XCircle className="h-6 w-6 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "OK":
        return "bg-green-100 border-green-300 text-green-800";
      case "WARNING":
        return "bg-yellow-100 border-yellow-300 text-yellow-800";
      case "ERROR":
        return "bg-red-100 border-red-300 text-red-800";
      default:
        return "bg-gray-100 border-gray-300 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-lg">Running diagnostics...</p>
        </div>
      </div>
    );
  }

  if (!diagnostics) {
    return (
      <div className="h-full flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Failed to load diagnostics</h2>
          <p className="text-gray-600 mb-4">
            Could not connect to the diagnostic endpoint.
          </p>
          <Button onClick={loadDiagnostics}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2 text-white">
              System Diagnostics
            </h1>
            <p className="text-blue-200/70">
              Overall Status:{" "}
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                  diagnostics.overall
                )}`}
              >
                {diagnostics.overall}
              </span>
            </p>
          </div>
          <Button onClick={loadDiagnostics} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        <div className="space-y-4">
          {Object.entries(diagnostics.checks).map(([key, check]) => (
            <Card
              key={key}
              className="p-6 border-white/10 bg-white/5 backdrop-blur-sm"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  {getStatusIcon(check.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-white capitalize">
                      {key.replace(/([A-Z])/g, " $1").trim()}
                    </h3>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        check.status
                      )}`}
                    >
                      {check.status}
                    </span>
                  </div>
                  {check.message && (
                    <p className="text-blue-200/70 text-sm mb-2">
                      {check.message}
                    </p>
                  )}
                  {check.data && (
                    <pre className="bg-black/30 rounded p-3 text-xs text-blue-200/80 overflow-x-auto">
                      {JSON.stringify(check.data, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Card className="p-6 mt-8 border-white/10 bg-white/5 backdrop-blur-sm">
          <h3 className="text-lg font-semibold text-white mb-3">
            Diagnostic Information
          </h3>
          <p className="text-blue-200/70 text-sm mb-2">
            <strong>Timestamp:</strong>{" "}
            {new Date(diagnostics.timestamp).toLocaleString()}
          </p>
          <p className="text-blue-200/70 text-sm">
            This diagnostic page helps identify issues with authentication,
            database connectivity, and data availability. If you see errors,
            check your environment variables and database configuration.
          </p>
        </Card>

        <div className="mt-8 p-6 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-3">
            Common Issues & Solutions
          </h3>
          <ul className="space-y-2 text-blue-200/70 text-sm">
            <li>
              <strong>Auth Error:</strong> Make sure NEXTAUTH_SECRET and
              NEXTAUTH_URL are set in .env.local
            </li>
            <li>
              <strong>Database Error:</strong> Check DATABASE_URL in .env.local
              and ensure PostgreSQL is running
            </li>
            <li>
              <strong>No Emails:</strong> Run the email sync from Settings or
              wait for automatic sync (every 5 minutes)
            </li>
            <li>
              <strong>No Folders:</strong> Sync folders from Settings &gt;
              Microsoft Graph section
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
