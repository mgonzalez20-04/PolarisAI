"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Inbox, Settings, LogOut, User, ChevronRight, ChevronDown, Folder, FolderOpen, Mail, Eye, EyeOff, X, RefreshCw, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/contexts/theme-context";
import { useState, useEffect } from "react";

const navigation = [
  { name: "Centro de Ayuda", href: "/dashboard/help", icon: HelpCircle },
  { name: "Configuración", href: "/dashboard/settings", icon: Settings },
];

interface FolderItem {
  id: string;
  folderId: string;
  displayName: string;
  folderPath: string;
  parentFolderId?: string;
  totalCount: number;
  unreadCount: number;
  isVisible: boolean;
  children?: FolderItem[];
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const { theme } = useTheme();
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(["inbox"]));
  const [loading, setLoading] = useState(true);
  const currentFolderId = searchParams.get("folderId");
  const [showVisibilityPanel, setShowVisibilityPanel] = useState(false);
  const [hiddenFolders, setHiddenFolders] = useState<Set<string>>(new Set());
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [movingEmailId, setMovingEmailId] = useState<string | null>(null);

  // Extraer nombre del email (parte antes del @)
  const userName = session?.user?.email?.split("@")[0] || session?.user?.name || "Usuario";
  const userEmail = session?.user?.email || "";

  // Iniciales para el avatar
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  useEffect(() => {
    loadFolders();
    loadHiddenFolders();
  }, []);

  // Load hidden folders from localStorage
  const loadHiddenFolders = () => {
    try {
      const stored = localStorage.getItem("hiddenFolders");
      if (stored) {
        setHiddenFolders(new Set(JSON.parse(stored)));
      }
    } catch (error) {
      console.error("Error loading hidden folders:", error);
    }
  };

  // Save hidden folders to localStorage
  const saveHiddenFolders = (hidden: Set<string>) => {
    try {
      localStorage.setItem("hiddenFolders", JSON.stringify(Array.from(hidden)));
      setHiddenFolders(hidden);
    } catch (error) {
      console.error("Error saving hidden folders:", error);
    }
  };

  // Toggle folder visibility
  const toggleFolderVisibility = (folderId: string) => {
    const newHidden = new Set(hiddenFolders);
    if (newHidden.has(folderId)) {
      newHidden.delete(folderId);
    } else {
      newHidden.add(folderId);
    }
    saveHiddenFolders(newHidden);
  };

  // Get all folder IDs recursively
  const getAllFolderIds = (folders: FolderItem[]): string[] => {
    let ids: string[] = [];
    folders.forEach(folder => {
      ids.push(folder.folderId);
      if (folder.children && folder.children.length > 0) {
        ids = ids.concat(getAllFolderIds(folder.children));
      }
    });
    return ids;
  };

  // Show all folders
  const showAllFolders = () => {
    saveHiddenFolders(new Set());
  };

  // Hide all folders
  const hideAllFolders = () => {
    const allIds = getAllFolderIds(folders);
    saveHiddenFolders(new Set(allIds));
  };

  const loadFolders = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/folders");
      const data = await res.json();

      if (data.folders) {
        // Build folder hierarchy
        const folderMap = new Map<string, FolderItem>();
        const rootFolders: FolderItem[] = [];

        // First pass: create all folder items
        data.folders.forEach((folder: FolderItem) => {
          folderMap.set(folder.folderId, { ...folder, children: [] });
        });

        // Second pass: build hierarchy
        data.folders.forEach((folder: FolderItem) => {
          const folderItem = folderMap.get(folder.folderId);
          if (!folderItem) return;

          if (folder.parentFolderId) {
            const parent = folderMap.get(folder.parentFolderId);
            if (parent) {
              parent.children = parent.children || [];
              parent.children.push(folderItem);
            } else {
              rootFolders.push(folderItem);
            }
          } else {
            rootFolders.push(folderItem);
          }
        });

        // Sort folders: Bandeja de entrada first, then alphabetically
        const sortFolders = (folders: FolderItem[]) => {
          folders.sort((a, b) => {
            // Bandeja de entrada always goes first
            if (a.displayName === "Bandeja de entrada") return -1;
            if (b.displayName === "Bandeja de entrada") return 1;
            // Then alphabetically
            return a.displayName.localeCompare(b.displayName);
          });
          // Sort children recursively
          folders.forEach(folder => {
            if (folder.children && folder.children.length > 0) {
              sortFolders(folder.children);
            }
          });
        };

        sortFolders(rootFolders);
        setFolders(rootFolders);
      }
    } catch (error) {
      console.error("Error loading folders:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const handleFolderClick = (folderId: string | null) => {
    if (pathname !== "/dashboard") {
      // If not on dashboard, navigate there with folder parameter
      if (folderId) {
        router.push(`/dashboard?folderId=${folderId}`);
      } else {
        router.push("/dashboard");
      }
    } else {
      // If already on dashboard, just update the URL parameter
      if (folderId) {
        router.push(`/dashboard?folderId=${folderId}`);
      } else {
        router.push("/dashboard");
      }
    }
  };

  const handleDragOver = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolderId(folderId);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolderId(null);
  };

  const handleDrop = async (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolderId(null);

    const emailId = e.dataTransfer.getData("emailId");
    if (!emailId) return;

    // Get folder name for notification
    const targetFolder = folders.find(f => f.folderId === folderId) ||
                         folders.flatMap(f => f.children || []).find(f => f.folderId === folderId);

    setMovingEmailId(emailId);

    try {
      const res = await fetch(`/api/emails/${emailId}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetFolderId: folderId }),
      });

      if (res.ok) {
        const data = await res.json();

        // Emit custom event to notify dashboard to remove the email
        window.dispatchEvent(new CustomEvent("emailMoved", {
          detail: { emailId, targetFolderId: folderId, folderName: data.folderName }
        }));

        // Show success notification (non-blocking)
        const notification = document.createElement("div");
        notification.className = "fixed bottom-4 right-4 bg-green-500/90 text-white px-6 py-3 rounded-lg shadow-lg backdrop-blur-sm z-50 animate-in slide-in-from-bottom-5";
        notification.textContent = `✓ Movido a ${data.folderName}`;
        document.body.appendChild(notification);

        setTimeout(() => {
          notification.style.opacity = "0";
          notification.style.transform = "translateY(20px)";
          notification.style.transition = "all 0.3s ease";
          setTimeout(() => notification.remove(), 300);
        }, 2000);
      } else {
        // Show error notification
        const notification = document.createElement("div");
        notification.className = "fixed bottom-4 right-4 bg-red-500/90 text-white px-6 py-3 rounded-lg shadow-lg backdrop-blur-sm z-50 animate-in slide-in-from-bottom-5";
        notification.textContent = "✗ Error al mover el correo";
        document.body.appendChild(notification);

        setTimeout(() => {
          notification.style.opacity = "0";
          notification.style.transform = "translateY(20px)";
          notification.style.transition = "all 0.3s ease";
          setTimeout(() => notification.remove(), 300);
        }, 3000);
      }
    } catch (error) {
      console.error("Error moving email:", error);
    } finally {
      setMovingEmailId(null);
    }
  };

  // Theme-based text colors
  const getTextColors = () => {
    switch (theme) {
      case "light":
        return {
          title: "text-gray-900",
          subtitle: "text-gray-600",
          button: "text-gray-700 hover:text-gray-900",
          buttonActive: "text-blue-700",
          userName: "text-gray-900",
          userEmail: "text-gray-600",
        };
      case "dark":
        return {
          title: "text-gray-100",
          subtitle: "text-gray-400",
          button: "text-gray-300 hover:text-white",
          buttonActive: "text-white",
          userName: "text-gray-100",
          userEmail: "text-gray-400",
        };
      default: // starry
        return {
          title: "text-white",
          subtitle: "text-blue-200/70",
          button: "text-blue-100/90 hover:text-white",
          buttonActive: "text-white",
          userName: "text-white",
          userEmail: "text-blue-200/70",
        };
    }
  };

  const textColors = getTextColors();

  // Render folder in visibility panel with checkbox
  const renderFolderInPanel = (folder: FolderItem, level: number = 0): JSX.Element => {
    const isVisible = !hiddenFolders.has(folder.folderId);
    const hasChildren = folder.children && folder.children.length > 0;

    return (
      <div key={folder.folderId}>
        <label
          className={`flex items-center gap-2 px-3 py-2 rounded cursor-pointer transition-colors ${
            theme === "light"
              ? "text-gray-900 hover:bg-gray-100"
              : theme === "dark"
              ? "text-gray-100 hover:bg-gray-800"
              : "text-white hover:bg-white/10"
          }`}
          style={{ paddingLeft: `${level * 16 + 12}px` }}
        >
          <input
            type="checkbox"
            checked={isVisible}
            onChange={() => toggleFolderVisibility(folder.folderId)}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          {folder.displayName === "Bandeja de entrada" || folder.displayName === "Inbox" ? (
            <Inbox className="h-4 w-4" />
          ) : (
            <Folder className="h-4 w-4" />
          )}
          <span className="text-sm flex-1">{folder.displayName}</span>
          {folder.unreadCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {folder.unreadCount}
            </Badge>
          )}
        </label>
        {hasChildren && (
          <div>
            {folder.children?.map((child) => renderFolderInPanel(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const renderFolder = (folder: FolderItem, level: number = 0): JSX.Element | null => {
    // Filter hidden folders
    if (hiddenFolders.has(folder.folderId)) {
      return null;
    }

    const isExpanded = expandedFolders.has(folder.folderId);
    const isSelected = currentFolderId === folder.folderId;
    const hasChildren = folder.children && folder.children.length > 0;
    const isDragOver = dragOverFolderId === folder.folderId;

    const getFolderIcon = () => {
      const iconClass = `h-4 w-4 ${isSelected ? textColors.buttonActive : textColors.button}`;

      if (folder.displayName === "Inbox" || folder.displayName === "Bandeja de entrada") {
        return <Inbox className={iconClass} />;
      }

      return isExpanded ? <FolderOpen className={iconClass} /> : <Folder className={iconClass} />;
    };

    return (
      <div key={folder.folderId}>
        <div
          className="relative"
          onDragOver={(e) => handleDragOver(e, folder.folderId)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, folder.folderId)}
        >
          <Button
            variant="ghost"
            onClick={() => handleFolderClick(folder.folderId)}
            className={cn(
              `w-full justify-start text-sm ${textColors.button} hover:bg-white/10 transition-all duration-300 rounded-lg`,
              isSelected && `bg-gradient-to-r from-blue-500/30 to-purple-500/30 ${textColors.buttonActive} border border-blue-400/30 shadow-lg hover:shadow-blue-500/30 hover:scale-[1.02]`,
              isDragOver && `bg-gradient-to-r from-green-500/30 to-blue-500/30 border border-green-400/50 shadow-lg scale-105 animate-glow-pulse`
            )}
            style={{ paddingLeft: `${level * 12 + 12}px` }}
          >
            {hasChildren && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFolder(folder.folderId);
                }}
                className="mr-1 p-0.5 rounded hover:bg-white/10 cursor-pointer inline-flex"
              >
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </span>
            )}
            {!hasChildren && <span className="w-4 mr-1" />}
            {getFolderIcon()}
            <span className="ml-2 flex-1 text-left truncate">{folder.displayName}</span>
            {folder.unreadCount > 0 && (
              <Badge variant="secondary" className="ml-auto text-xs">
                {folder.unreadCount}
              </Badge>
            )}
            {movingEmailId && isDragOver && (
              <div className="ml-2 animate-spin">
                <RefreshCw className="h-3 w-3" />
              </div>
            )}
          </Button>
        </div>
        {isExpanded && hasChildren && (
          <div>
            {folder.children?.map((child) => renderFolder(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="flex h-full w-64 flex-col border-r border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl custom-scrollbar">
        <div className="p-6 border-b border-white/10 animate-fade-in">
          <div className="flex items-center gap-3 mb-2">
            {/* Logo */}
            <div className="w-10 h-10 flex items-center justify-center transition-transform hover:scale-110 duration-300">
              <img
                src="/PolarisAI.png"
                alt="Polaris AI Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 className={`text-xl font-bold ${textColors.title} tracking-tight`}>PolarisAI</h1>
              <p className={`text-xs ${textColors.subtitle}`}>Asistente IA</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto space-y-1 p-4 custom-scrollbar">
        {/* Render folders */}
        {loading ? (
          <div className="space-y-2">
            <div className="animate-pulse h-8 bg-white/5 rounded animate-shimmer" />
            <div className="animate-pulse h-8 bg-white/5 rounded animate-shimmer" style={{animationDelay: '0.1s'}} />
            <div className="animate-pulse h-8 bg-white/5 rounded animate-shimmer" style={{animationDelay: '0.2s'}} />
          </div>
        ) : (
          folders.map((folder, idx) => (
            <div key={folder.folderId} className="animate-slide-in-left" style={{animationDelay: `${idx * 0.05}s`}}>
              {renderFolder(folder)}
            </div>
          ))
        )}

        <Separator className="my-2 bg-white/10" />

        {/* Manage visibility button */}
        <Button
          variant="ghost"
          onClick={() => setShowVisibilityPanel(true)}
          className={`w-full justify-start text-sm ${textColors.button} hover:bg-white/10 transition-all duration-200`}
        >
          <Eye className="h-4 w-4" />
          <span className="ml-2">Gestionar carpetas</span>
        </Button>

        {/* Todas las carpetas button - at the bottom */}
        <Button
          variant="ghost"
          onClick={() => handleFolderClick(null)}
          className={cn(
            `w-full justify-start text-sm ${textColors.button} hover:bg-white/10 transition-all duration-200`,
            !currentFolderId && pathname === "/dashboard" && `bg-gradient-to-r from-blue-500/30 to-purple-500/30 ${textColors.buttonActive} border border-blue-400/30 shadow-lg`
          )}
        >
          <Mail className={`h-4 w-4 ${!currentFolderId && pathname === "/dashboard" ? textColors.buttonActive : textColors.button}`} />
          <span className="ml-2">Todas las carpetas</span>
        </Button>

        <Separator className="my-2 bg-white/10" />

        {/* Settings navigation */}
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);

          return (
            <Link key={item.name} href={item.href}>
              <Button
                variant="ghost"
                className={cn(
                  `w-full justify-start text-sm ${textColors.button} hover:bg-white/10 transition-all duration-200`,
                  isActive && `bg-gradient-to-r from-blue-500/30 to-purple-500/30 ${textColors.buttonActive} border border-blue-400/30 shadow-lg`
                )}
              >
                <Icon className="mr-2 h-4 w-4" />
                {item.name}
              </Button>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10"></div>

      {/* User Profile Section */}
      <div className="p-4 animate-fade-in">
        <div className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 p-3 mb-2 hover:bg-white/10 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/20 hover:scale-[1.02] cursor-pointer">
          <Avatar className="h-10 w-10 border-2 border-blue-400/50 transition-transform hover:scale-110 duration-300">
            <AvatarImage src={session?.user?.image || undefined} alt={userName} />
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 overflow-hidden">
            <p className={`text-sm font-semibold truncate ${textColors.userName}`}>{userName}</p>
            <p className={`text-xs truncate ${textColors.userEmail}`}>{userEmail}</p>
          </div>
        </div>

        <Button
          variant="ghost"
          className={`w-full justify-start ${textColors.button} hover:bg-red-500/20 hover:text-red-300 transition-all duration-200`}
          onClick={() => signOut({ callbackUrl: "/auth/signin" })}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Cerrar Sesión
        </Button>
      </div>
    </div>

      {/* Visibility management panel */}
      {showVisibilityPanel && (
        <>
          {/* Overlay */}
          <div
            className={`fixed inset-0 z-40 ${
              theme === "light"
                ? "bg-black/20 backdrop-blur-sm"
                : theme === "dark"
                ? "bg-black/50 backdrop-blur-sm"
                : "bg-black/50 backdrop-blur-sm"
            }`}
            onClick={() => setShowVisibilityPanel(false)}
          />

          {/* Panel */}
          <div className={`fixed right-0 top-0 bottom-0 w-96 shadow-2xl z-50 flex flex-col ${
            theme === "light"
              ? "bg-white border-l border-gray-200"
              : theme === "dark"
              ? "bg-gray-900 border-l border-gray-700"
              : "bg-slate-900/95 backdrop-blur-xl border-l border-white/10"
          }`}>
            {/* Header */}
            <div className={`p-6 ${
              theme === "light"
                ? "border-b border-gray-200"
                : theme === "dark"
                ? "border-b border-gray-700"
                : "border-b border-white/10"
            }`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className={`text-xl font-bold ${textColors.title}`}>
                  Gestionar Carpetas
                </h2>
                <button
                  onClick={() => setShowVisibilityPanel(false)}
                  className={`p-2 rounded-lg transition-colors ${
                    theme === "light"
                      ? "hover:bg-gray-100"
                      : theme === "dark"
                      ? "hover:bg-gray-800"
                      : "hover:bg-white/10"
                  }`}
                >
                  <X className={`h-5 w-5 ${textColors.button}`} />
                </button>
              </div>
              <p className={`text-sm ${textColors.subtitle}`}>
                Selecciona qué carpetas quieres ver en el sidebar
              </p>
            </div>

            {/* Actions */}
            <div className={`px-6 py-3 flex gap-2 ${
              theme === "light"
                ? "border-b border-gray-200"
                : theme === "dark"
                ? "border-b border-gray-700"
                : "border-b border-white/10"
            }`}>
              <Button
                variant="outline"
                size="sm"
                onClick={showAllFolders}
                className={`flex-1 ${
                  theme === "light"
                    ? "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                    : theme === "dark"
                    ? "bg-gray-800 border-gray-600 text-gray-200 hover:bg-gray-700"
                    : "bg-white/5 border-white/10 text-blue-100/90 hover:bg-white/10 hover:text-white backdrop-blur-sm"
                }`}
              >
                <Eye className="h-4 w-4 mr-2" />
                Mostrar todas
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={hideAllFolders}
                className={`flex-1 ${
                  theme === "light"
                    ? "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                    : theme === "dark"
                    ? "bg-gray-800 border-gray-600 text-gray-200 hover:bg-gray-700"
                    : "bg-white/5 border-white/10 text-blue-100/90 hover:bg-white/10 hover:text-white backdrop-blur-sm"
                }`}
              >
                <EyeOff className="h-4 w-4 mr-2" />
                Ocultar todas
              </Button>
            </div>

            {/* Folders list */}
            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="space-y-2">
                  <div className={`animate-pulse h-8 rounded ${
                    theme === "light" ? "bg-gray-100" : theme === "dark" ? "bg-gray-800" : "bg-white/5"
                  }`} />
                  <div className={`animate-pulse h-8 rounded ${
                    theme === "light" ? "bg-gray-100" : theme === "dark" ? "bg-gray-800" : "bg-white/5"
                  }`} />
                  <div className={`animate-pulse h-8 rounded ${
                    theme === "light" ? "bg-gray-100" : theme === "dark" ? "bg-gray-800" : "bg-white/5"
                  }`} />
                </div>
              ) : (
                <div className="space-y-1">
                  {folders.map((folder) => renderFolderInPanel(folder))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className={`p-4 ${
              theme === "light"
                ? "border-t border-gray-200"
                : theme === "dark"
                ? "border-t border-gray-700"
                : "border-t border-white/10"
            }`}>
              <p className={`text-xs ${textColors.subtitle} text-center`}>
                La configuración se guarda en este navegador
              </p>
            </div>
          </div>
        </>
      )}
    </>
  );
}
