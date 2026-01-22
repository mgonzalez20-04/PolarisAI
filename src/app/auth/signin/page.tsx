"use client";

import { redirect } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useEffect, useState } from "react";
import packageJson from "../../../../package.json";

const features = [
  {
    icon: "⚡",
    title: "Respuestas inteligentes",
    desc: "IA genera sugerencias precisas en segundos"
  },
  {
    icon: "🎯",
    title: "Priorización automática",
    desc: "Identifica correos urgentes al instante"
  },
  {
    icon: "📊",
    title: "Analytics en tiempo real",
    desc: "Métricas de rendimiento del equipo"
  }
];

export default function SignInPage() {
  const [currentFeature, setCurrentFeature] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailCount, setEmailCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const version = packageJson.version;

  useEffect(() => {
    setMounted(true);

    // Carousel rotation
    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % features.length);
    }, 3500);

    // Animated counter for emails
    let current = 0;
    const target = 324;
    const increment = target / 50;
    const counterTimer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setEmailCount(target);
        clearInterval(counterTimer);
      } else {
        setEmailCount(Math.floor(current));
      }
    }, 20);

    return () => {
      clearInterval(interval);
      clearInterval(counterTimer);
    };
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Animated gradient mesh background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -right-1/2 w-[800px] h-[800px] bg-gradient-to-br from-blue-500/30 to-purple-600/30 rounded-full blur-3xl animate-blob"></div>
        <div className="absolute -bottom-1/2 -left-1/2 w-[800px] h-[800px] bg-gradient-to-tr from-cyan-500/30 to-blue-600/30 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/3 left-1/3 w-[600px] h-[600px] bg-gradient-to-bl from-indigo-500/20 to-purple-500/20 rounded-full blur-3xl animate-blob animation-delay-4000"></div>

        {/* Grid overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>

        {/* Floating particles */}
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-blue-400 rounded-full animate-float"></div>
        <div className="absolute top-3/4 left-2/3 w-1.5 h-1.5 bg-purple-400 rounded-full animate-float animation-delay-2000"></div>
        <div className="absolute top-1/2 left-3/4 w-1 h-1 bg-cyan-400 rounded-full animate-float animation-delay-4000"></div>
        <div className="absolute top-1/3 right-1/4 w-2.5 h-2.5 bg-indigo-400 rounded-full animate-float animation-delay-3000"></div>
      </div>

      {/* Main card with glassmorphism */}
      <Card className="group relative w-full max-w-md border border-white/10 shadow-2xl backdrop-blur-xl bg-white/5 animate-fade-in-up">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500 rounded-xl blur opacity-20 group-hover:opacity-30 transition duration-1000"></div>

        {/* BMW Logo Watermark */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-[0.02] group-hover:opacity-[0.04] transition-opacity duration-500 select-none">
          <svg className="w-96 h-96" viewBox="0 0 100 100" fill="currentColor">
            <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="2"/>
            <path d="M50 2 A 48 48 0 0 1 98 50 L 50 50 Z" fill="currentColor" fillOpacity="0.3"/>
            <path d="M50 2 A 48 48 0 0 0 2 50 L 50 50 Z" fill="currentColor" fillOpacity="0.1"/>
            <path d="M2 50 A 48 48 0 0 0 50 98 L 50 50 Z" fill="currentColor" fillOpacity="0.3"/>
            <path d="M98 50 A 48 48 0 0 0 50 98 L 50 50 Z" fill="currentColor" fillOpacity="0.1"/>
            <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
        </div>

        {/* Status badge - top right */}
        <div className="absolute -top-3 -right-3 z-10">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-green-500 shadow-lg shadow-emerald-500/50 border border-emerald-400/20">
            <div className="relative">
              <div className="w-2 h-2 rounded-full bg-white animate-ping absolute"></div>
              <div className="w-2 h-2 rounded-full bg-white"></div>
            </div>
            <span className="text-xs font-semibold text-white">Sistema Activo</span>
          </div>
        </div>

        {/* AI Badge - top left */}
        <div className="absolute -top-3 -left-3 z-10">
          <div className="relative group/badge">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-md opacity-75 group-hover/badge:opacity-100 transition-opacity"></div>
            <div className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 shadow-lg border border-purple-400/20">
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="text-xs font-semibold text-white bg-clip-text">Powered by AI</span>
            </div>
          </div>
        </div>

        <div className="relative">
          <CardHeader className="text-center space-y-4 pb-6 pt-10">
            {/* Animated logo container */}
            <div className="relative mx-auto w-20 h-20 group">
              <div className="relative w-full h-full flex items-center justify-center transform group-hover:scale-105 transition-transform duration-300">
                <img
                  src="/PolarisAI.png"
                  alt="Polaris AI Logo"
                  className="w-full h-full object-contain filter drop-shadow-2xl"
                />
              </div>
            </div>

            {/* Title with gradient */}
            <div className="space-y-2">
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent drop-shadow-lg">
                PolarisAI
              </CardTitle>
              <CardDescription className="text-sm text-blue-100/80 font-light px-4">
                Gestiona correos de soporte con inteligencia artificial
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="pb-8 px-8">
            {/* Login Form */}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setIsLoading(true);
                setError(null);

                const formData = new FormData(e.currentTarget);
                const username = formData.get("username") as string;
                const password = formData.get("password") as string;

                try {
                  const result = await signIn("credentials", {
                    username,
                    password,
                    redirect: false,
                  });

                  if (result?.error) {
                    setError("Usuario o contraseña incorrectos");
                    setIsLoading(false);
                  } else if (result?.ok) {
                    window.location.href = "/dashboard";
                  }
                } catch (err) {
                  setError("Error al iniciar sesión");
                  setIsLoading(false);
                }
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="username" className="text-blue-100/90 text-sm">
                  Usuario
                </Label>
                <Input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="admin"
                  required
                  disabled={isLoading}
                  autoComplete="username"
                  className="bg-white/10 border-white/20 text-white placeholder:text-blue-200/40 focus:border-blue-400 focus:ring-blue-400/50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-blue-100/90 text-sm">
                  Contraseña
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  disabled={isLoading}
                  className="bg-white/10 border-white/20 text-white placeholder:text-blue-200/40 focus:border-blue-400 focus:ring-blue-400/50"
                />
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 backdrop-blur-sm">
                  <p className="text-red-200 text-sm flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {error}
                  </p>
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold shadow-lg shadow-blue-500/50 border-0"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Iniciando sesión...
                  </span>
                ) : (
                  "Iniciar sesión"
                )}
              </Button>
            </form>

            {/* Info Message */}
            <div className="mt-6 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 backdrop-blur-sm">
              <div className="flex items-start gap-3 text-blue-200 text-sm">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="font-semibold mb-1">Acceso Simple</p>
                  <p className="text-xs text-blue-200/70">Usuario: <span className="font-mono font-semibold">admin</span> • Contraseña: <span className="font-mono font-semibold">admin</span></p>
                  <p className="text-xs text-blue-200/50 mt-1">Los correos se sincronizan automáticamente desde n8n.</p>
                </div>
              </div>
            </div>

            {/* Features Carousel - Compact with Crossfade */}
            <div className="mt-6 relative h-16 overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center">
                {features.map((feature, index) => (
                  <div
                    key={index}
                    className={`absolute inset-0 flex items-center justify-center gap-3 transition-all duration-700 ${
                      index === currentFeature
                        ? "opacity-100 scale-100"
                        : "opacity-0 scale-95"
                    }`}
                  >
                    <div className="text-3xl animate-bounce-subtle">{feature.icon}</div>
                    <div className="text-left">
                      <h3 className="text-sm font-semibold text-white">{feature.title}</h3>
                      <p className="text-xs text-blue-200/60">{feature.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              {/* Indicators with Tooltips */}
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1.5">
                {features.map((feature, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentFeature(index)}
                    title={feature.title}
                    className={`h-1 rounded-full transition-all duration-300 ${
                      index === currentFeature
                        ? "w-6 bg-blue-400"
                        : "w-1 bg-blue-400/30 hover:bg-blue-400/50"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Stats section - Compact */}
            <div className="mt-8 pt-4 border-t border-white/5">
              <div className="flex items-center justify-center gap-6">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="text-xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent inline-block min-w-[3ch] text-right tabular-nums">{emailCount}</span>
                  <span className="text-xs text-blue-200/50">correos hoy</span>
                </div>
                <div className="w-px h-6 bg-white/10"></div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                  <span className="text-xs text-emerald-300 font-medium">IA en línea</span>
                </div>
              </div>
            </div>

            {/* Footer text */}
            <div className="mt-6 text-center space-y-2">
              <div className="flex items-center justify-center gap-2 text-xs text-blue-200/40">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>Sincronización automática con n8n</span>
              </div>
            </div>
          </CardContent>

          {/* Bottom footer */}
          <div className="relative px-8 pb-5 pt-3 border-t border-white/5">
            <div className="flex items-center justify-between text-xs text-blue-200/30">
              <div className="flex items-center gap-1.5">
                <div className="w-1 h-1 rounded-full bg-blue-400/50"></div>
                <span>v{version}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span>© 2025 BMW Soporte</span>
              </div>
              <div className="flex items-center gap-1.5">
                <svg className="w-3 h-3 text-emerald-400/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>~2min respuesta</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Bottom info card */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 w-full max-w-md px-4">
        <div className="flex items-center justify-center gap-4 px-4 py-2 rounded-xl bg-white/5 backdrop-blur-md border border-white/10">
          <div className="flex items-center gap-1.5 text-blue-200/60 text-xs">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>n8n Workflows</span>
          </div>
          <div className="w-px h-3 bg-white/10"></div>
          <div className="flex items-center gap-1.5 text-blue-200/60 text-xs">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>Sync Automático</span>
          </div>
          <div className="w-px h-3 bg-white/10"></div>
          <div className="flex items-center gap-1.5 text-blue-200/60 text-xs">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>IA Generativa</span>
          </div>
        </div>
      </div>
    </div>
  );
}
