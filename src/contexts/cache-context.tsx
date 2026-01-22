"use client";

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface Folder {
  id: string;
  folderId: string;
  displayName: string;
  folderPath: string;
  totalCount: number;
  unreadCount: number;
  isVisible: boolean;
}

interface CacheContextType {
  tags: Tag[];
  folders: Folder[];
  isLoading: boolean;
  refreshTags: () => Promise<void>;
  refreshFolders: () => Promise<void>;
  refreshAll: () => Promise<void>;
}

const CacheContext = createContext<CacheContextType | undefined>(undefined);

interface CacheProviderProps {
  children: ReactNode;
}

/**
 * Provider que cachea tags y folders para evitar fetches repetidos
 * Los datos se cargan una vez al montar y se pueden refrescar manualmente
 */
export function CacheProvider({ children }: CacheProviderProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshTags = useCallback(async () => {
    try {
      const res = await fetch('/api/tags');
      if (res.ok) {
        const data = await res.json();
        setTags(data);
      }
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  }, []);

  const refreshFolders = useCallback(async () => {
    try {
      const res = await fetch('/api/folders');
      if (res.ok) {
        const data = await res.json();
        setFolders(data.folders || []);
      }
    } catch (error) {
      console.error('Error fetching folders:', error);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setIsLoading(true);
    try {
      await Promise.all([refreshTags(), refreshFolders()]);
    } finally {
      setIsLoading(false);
    }
  }, [refreshTags, refreshFolders]);

  // Load on mount
  useEffect(() => {
    refreshAll();
  }, []);

  return (
    <CacheContext.Provider value={{ tags, folders, isLoading, refreshTags, refreshFolders, refreshAll }}>
      {children}
    </CacheContext.Provider>
  );
}

/**
 * Hook para acceder al cache de tags y folders
 * Evita fetches repetidos al usar datos compartidos
 */
export const useCache = () => {
  const context = useContext(CacheContext);
  if (!context) {
    throw new Error('useCache must be used within CacheProvider');
  }
  return context;
};
