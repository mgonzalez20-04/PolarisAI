"use client";

import { useState, useRef, useEffect } from "react";
import { SessionProvider } from "next-auth/react";
import { Sidebar } from "@/components/sidebar";
import { EmailViewer } from "@/components/email-viewer";
import { HealthAlert } from "@/components/health-alert";
import { ViewerProvider, useViewer } from "@/contexts/viewer-context";
import { ThemeProvider, useTheme } from "@/contexts/theme-context";
import { AlertProvider } from "@/contexts/alert-context";
import { CacheProvider } from "@/contexts/cache-context";

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { viewerOpen } = useViewer();
  const { theme } = useTheme();
  const [leftWidth, setLeftWidth] = useState(50); // Percentage
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;

      // Limit between 30% and 70%
      if (newLeftWidth >= 30 && newLeftWidth <= 70) {
        setLeftWidth(newLeftWidth);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  // Theme-based classes
  const getThemeClasses = () => {
    switch (theme) {
      case "light":
        return {
          background: "bg-gradient-to-br from-slate-50 via-blue-50/80 to-indigo-50/60",
          blob1: "bg-gradient-to-br from-blue-300/40 to-purple-400/40",
          blob2: "bg-gradient-to-tr from-cyan-300/40 to-blue-400/40",
          blob3: "bg-gradient-to-bl from-indigo-300/35 to-purple-400/35",
          grid: "bg-[linear-gradient(to_right,#00000010_1px,transparent_1px),linear-gradient(to_bottom,#00000010_1px,transparent_1px)]",
          particle1: "bg-blue-500/70",
          particle2: "bg-purple-500/70",
          particle3: "bg-cyan-500/70",
          particle4: "bg-indigo-500/70",
        };
      case "dark":
        return {
          background: "bg-gradient-to-br from-slate-950 via-gray-900 to-slate-900",
          blob1: "bg-gradient-to-br from-slate-700/25 to-gray-800/25",
          blob2: "bg-gradient-to-tr from-slate-600/25 to-gray-700/25",
          blob3: "bg-gradient-to-bl from-gray-700/20 to-slate-800/20",
          grid: "bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)]",
          particle1: "bg-slate-400/50",
          particle2: "bg-gray-400/50",
          particle3: "bg-slate-500/50",
          particle4: "bg-gray-500/50",
        };
      default: // starry
        return {
          background: "bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950",
          blob1: "bg-gradient-to-br from-blue-600/25 to-purple-700/25",
          blob2: "bg-gradient-to-tr from-cyan-600/25 to-blue-700/25",
          blob3: "bg-gradient-to-bl from-indigo-600/20 to-purple-600/20",
          grid: "bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)]",
          particle1: "bg-blue-400/60",
          particle2: "bg-purple-400/60",
          particle3: "bg-cyan-400/60",
          particle4: "bg-indigo-400/60",
        };
    }
  };

  const themeClasses = getThemeClasses();

  // Apply theme class to html and body
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    // Remove all theme classes
    html.classList.remove('light', 'dark', 'starry');
    body.classList.remove('light', 'dark', 'starry');

    // Add current theme class
    html.classList.add(theme);
    body.classList.add(theme);

    return () => {
      html.classList.remove(theme);
      body.classList.remove(theme);
    };
  }, [theme]);

  return (
    <div className={`flex h-screen relative overflow-hidden ${themeClasses.background}`}>
      {/* Animated gradient mesh background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className={`absolute -top-1/2 -right-1/2 w-[900px] h-[900px] ${themeClasses.blob1} rounded-full blur-[100px] animate-blob`}></div>
        <div className={`absolute -bottom-1/2 -left-1/2 w-[900px] h-[900px] ${themeClasses.blob2} rounded-full blur-[100px] animate-blob animation-delay-2000`}></div>
        <div className={`absolute top-1/3 left-1/3 w-[700px] h-[700px] ${themeClasses.blob3} rounded-full blur-[100px] animate-blob animation-delay-4000`}></div>

        {/* Grid overlay with subtle animation */}
        <div className={`absolute inset-0 ${themeClasses.grid} bg-[size:4rem_4rem] opacity-50`}></div>

        {/* Floating particles with enhanced glow */}
        <div className={`absolute top-1/4 left-1/4 w-2.5 h-2.5 ${themeClasses.particle1} rounded-full animate-float shadow-lg`}></div>
        <div className={`absolute top-3/4 left-2/3 w-2 h-2 ${themeClasses.particle2} rounded-full animate-float animation-delay-2000 shadow-lg`}></div>
        <div className={`absolute top-1/2 left-3/4 w-1.5 h-1.5 ${themeClasses.particle3} rounded-full animate-float animation-delay-4000 shadow-lg`}></div>
        <div className={`absolute top-1/3 right-1/4 w-3 h-3 ${themeClasses.particle4} rounded-full animate-float animation-delay-3000 shadow-lg`}></div>
        {/* Additional particles for more depth */}
        <div className={`absolute top-2/3 right-1/3 w-1.5 h-1.5 ${themeClasses.particle1} rounded-full animate-float animation-delay-2000 shadow-md`}></div>
        <div className={`absolute top-1/5 left-1/2 w-2 h-2 ${themeClasses.particle2} rounded-full animate-float animation-delay-3000 shadow-md`}></div>
      </div>

      {/* Content */}
      <div className="flex h-screen w-full relative z-10">
        {!viewerOpen && <Sidebar />}
        <div ref={containerRef} className="flex flex-1 overflow-hidden">
          <main
            className="overflow-auto"
            style={{ width: viewerOpen ? `${leftWidth}%` : "100%" }}
          >
            <HealthAlert />
            {children}
          </main>

          {viewerOpen && (
            <>
              {/* Resizer */}
              <div
                className="w-1 cursor-col-resize bg-white/10 hover:bg-blue-400 transition-colors"
                onMouseDown={() => setIsDragging(true)}
              />

              {/* Email Viewer */}
              <div
                className="overflow-hidden"
                style={{ width: `${100 - leftWidth}%` }}
              >
                <EmailViewer />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function DashboardLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <AlertProvider>
          <CacheProvider>
            <ViewerProvider>
              <DashboardContent>{children}</DashboardContent>
            </ViewerProvider>
          </CacheProvider>
        </AlertProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
