"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface ViewerContextType {
  viewerOpen: boolean;
  setViewerOpen: (open: boolean) => void;
  selectedEmailId: string | null;
  setSelectedEmailId: (id: string | null) => void;
}

const ViewerContext = createContext<ViewerContextType | undefined>(undefined);

export function ViewerProvider({ children }: { children: ReactNode }) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);

  return (
    <ViewerContext.Provider
      value={{ viewerOpen, setViewerOpen, selectedEmailId, setSelectedEmailId }}
    >
      {children}
    </ViewerContext.Provider>
  );
}

export function useViewer() {
  const context = useContext(ViewerContext);
  if (!context) {
    throw new Error("useViewer must be used within ViewerProvider");
  }
  return context;
}
