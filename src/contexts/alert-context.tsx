"use client";

import { createContext, useContext, useState, useCallback, ReactNode, useRef } from "react";
import { CustomAlert, AlertType, AlertButtons } from "@/components/custom-alert";

interface AlertState {
  isOpen: boolean;
  title: string;
  message: string;
  type: AlertType;
  buttons: AlertButtons;
  onConfirm?: () => void;
}

interface AlertContextType {
  showAlert: (
    title: string,
    message: string,
    type?: AlertType,
    buttons?: AlertButtons
  ) => Promise<boolean>;
  showConfirm: (
    title: string,
    message: string,
    type?: AlertType
  ) => Promise<boolean>;
  closeAlert: () => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export function AlertProvider({ children }: { children: ReactNode }) {
  const [alertState, setAlertState] = useState<AlertState>({
    isOpen: false,
    title: "",
    message: "",
    type: "info",
    buttons: "ok",
  });

  const confirmResolveRef = useRef<((value: boolean) => void) | null>(null);

  const closeAlert = useCallback(() => {
    // If there's a pending confirm resolution, resolve it as false
    if (confirmResolveRef.current) {
      confirmResolveRef.current(false);
      confirmResolveRef.current = null;
    }
    setAlertState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const showAlert = useCallback(
    (
      title: string,
      message: string,
      type: AlertType = "info",
      buttons: AlertButtons = "ok"
    ) => {
      return new Promise<boolean>((resolve) => {
        setAlertState({
          isOpen: true,
          title,
          message,
          type,
          buttons,
          onConfirm: () => {
            resolve(true);
            closeAlert();
          },
        });

        // If it's just an "ok" button, resolve immediately when closed
        if (buttons === "ok") {
          resolve(true);
        }
      });
    },
    [closeAlert]
  );

  const showConfirm = useCallback(
    (title: string, message: string, type: AlertType = "warning") => {
      return new Promise<boolean>((resolve) => {
        // Store the resolve function
        confirmResolveRef.current = resolve;

        const originalOnConfirm = () => {
          if (confirmResolveRef.current) {
            confirmResolveRef.current(true);
            confirmResolveRef.current = null;
          }
          setAlertState((prev) => ({ ...prev, isOpen: false }));
        };

        setAlertState({
          isOpen: true,
          title,
          message,
          type,
          buttons: "confirm",
          onConfirm: originalOnConfirm,
        });
      });
    },
    []
  );

  const handleClose = useCallback(() => {
    closeAlert();
  }, [closeAlert]);

  return (
    <AlertContext.Provider value={{ showAlert, showConfirm, closeAlert }}>
      {children}
      <CustomAlert
        isOpen={alertState.isOpen}
        onClose={handleClose}
        onConfirm={alertState.onConfirm}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        buttons={alertState.buttons}
      />
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const context = useContext(AlertContext);
  if (context === undefined) {
    throw new Error("useAlert must be used within an AlertProvider");
  }
  return context;
}
