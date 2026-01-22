"use client";

import { useState, useEffect } from "react";
import { ChevronRight, ChevronDown, Folder, FolderOpen, Inbox, Mail, Settings as SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTheme } from "@/contexts/theme-context";

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

interface FolderNavigationProps {
  onFolderSelect: (folderId: string | null, folderPath: string) => void;
  selectedFolderId: string | null;
}

export function FolderNavigation({ onFolderSelect, selectedFolderId }: FolderNavigationProps) {
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(["inbox"]));
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();

  // Theme-based text colors
  const getTextColors = () => {
    switch (theme) {
      case "light":
        return {
          text: "text-gray-700",
          textHover: "hover:text-gray-900",
          textActive: "text-blue-700",
          bg: "bg-gray-50",
          bgHover: "hover:bg-gray-100",
          bgActive: "bg-blue-50",
          border: "border-gray-200",
        };
      case "dark":
        return {
          text: "text-gray-300",
          textHover: "hover:text-white",
          textActive: "text-white",
          bg: "bg-gray-800",
          bgHover: "hover:bg-gray-700",
          bgActive: "bg-blue-950",
          border: "border-gray-700",
        };
      default: // starry
        return {
          text: "text-blue-100/90",
          textHover: "hover:text-white",
          textActive: "text-white",
          bg: "bg-white/5",
          bgHover: "hover:bg-white/10",
          bgActive: "bg-gradient-to-r from-blue-500/30 to-purple-500/30",
          border: "border-white/10",
        };
    }
  };

  const textColors = getTextColors();

  useEffect(() => {
    loadFolders();
  }, []);

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

  const renderFolder = (folder: FolderItem, level: number = 0) => {
    const isExpanded = expandedFolders.has(folder.folderId);
    const isSelected = selectedFolderId === folder.folderId;
    const hasChildren = folder.children && folder.children.length > 0;

    const getFolderIcon = () => {
      const iconClass = `h-4 w-4 ${isSelected ? textColors.textActive : textColors.text}`;

      if (folder.displayName === "Inbox" || folder.displayName === "Bandeja de entrada") {
        return <Inbox className={iconClass} />;
      }

      return isExpanded ? <FolderOpen className={iconClass} /> : <Folder className={iconClass} />;
    };

    return (
      <div key={folder.folderId}>
        <Button
          variant="ghost"
          className={cn(
            `w-full justify-start ${textColors.text} ${textColors.bgHover} transition-all duration-200`,
            isSelected && `${textColors.bgActive} ${textColors.textActive} border ${textColors.border} shadow-lg`
          )}
          style={{ paddingLeft: `${level * 16 + 12}px` }}
          onClick={() => onFolderSelect(folder.folderId, folder.folderPath)}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFolder(folder.folderId);
              }}
              className="mr-1 p-0.5 rounded hover:bg-white/10"
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </button>
          )}
          {!hasChildren && <span className="w-4 mr-1" />}
          {getFolderIcon()}
          <span className="ml-2 flex-1 text-left truncate text-sm">{folder.displayName}</span>
          {folder.unreadCount > 0 && (
            <Badge variant="secondary" className="ml-auto text-xs">
              {folder.unreadCount}
            </Badge>
          )}
        </Button>
        {isExpanded && hasChildren && (
          <div>
            {folder.children?.map((child) => renderFolder(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-4 space-y-2">
        <div className="animate-pulse">
          <div className={`h-8 ${textColors.bg} rounded mb-2`}></div>
          <div className={`h-8 ${textColors.bg} rounded mb-2`}></div>
          <div className={`h-8 ${textColors.bg} rounded`}></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1 p-2">
      {/* "All" folders button */}
      <Button
        variant="ghost"
        className={cn(
          `w-full justify-start ${textColors.text} ${textColors.bgHover} transition-all duration-200`,
          !selectedFolderId && `${textColors.bgActive} ${textColors.textActive} border ${textColors.border} shadow-lg`
        )}
        onClick={() => onFolderSelect(null, "Todas las carpetas")}
      >
        <Mail className={`h-4 w-4 ${!selectedFolderId ? textColors.textActive : textColors.text}`} />
        <span className="ml-2 text-sm">Todas las carpetas</span>
      </Button>

      {/* Render folder tree */}
      {folders.map((folder) => renderFolder(folder))}
    </div>
  );
}
