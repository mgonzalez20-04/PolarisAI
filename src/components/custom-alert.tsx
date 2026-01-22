"use client";

import { useTheme } from "@/contexts/theme-context";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, XCircle, Info, X } from "lucide-react";
import { useEffect } from "react";

export type AlertType = "info" | "success" | "warning" | "error";
export type AlertButtons = "ok" | "confirm" | "yes-no";

interface CustomAlertProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  message: string;
  type?: AlertType;
  buttons?: AlertButtons;
}

export function CustomAlert({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = "info",
  buttons = "ok",
}: CustomAlertProps) {
  const { theme } = useTheme();

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      // Prevent body scroll
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Theme-based colors
  const getThemeClasses = () => {
    switch (theme) {
      case "light":
        return {
          overlay: "bg-black/50",
          modal: "bg-white border-gray-200",
          title: "text-gray-900",
          message: "text-gray-700",
        };
      case "dark":
        return {
          overlay: "bg-black/70",
          modal: "bg-gray-900 border-gray-700",
          title: "text-gray-100",
          message: "text-gray-300",
        };
      default: // starry
        return {
          overlay: "bg-black/60 backdrop-blur-sm",
          modal: "bg-slate-900/95 backdrop-blur-xl border-white/10",
          title: "text-white",
          message: "text-blue-100/90",
        };
    }
  };

  // Alert type configurations
  const getAlertConfig = () => {
    switch (type) {
      case "success":
        return {
          icon: <CheckCircle2 className="h-12 w-12 text-green-500" />,
          color: "text-green-600",
          bgAccent: "bg-green-500/10",
          borderAccent: "border-green-500/20",
        };
      case "warning":
        return {
          icon: <AlertCircle className="h-12 w-12 text-yellow-500" />,
          color: "text-yellow-600",
          bgAccent: "bg-yellow-500/10",
          borderAccent: "border-yellow-500/20",
        };
      case "error":
        return {
          icon: <XCircle className="h-12 w-12 text-red-500" />,
          color: "text-red-600",
          bgAccent: "bg-red-500/10",
          borderAccent: "border-red-500/20",
        };
      default: // info
        return {
          icon: <Info className="h-12 w-12 text-blue-500" />,
          color: "text-blue-600",
          bgAccent: "bg-blue-500/10",
          borderAccent: "border-blue-500/20",
        };
    }
  };

  const themeClasses = getThemeClasses();
  const alertConfig = getAlertConfig();

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  const renderButtons = () => {
    switch (buttons) {
      case "confirm":
        return (
          <div className="flex gap-3 w-full">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              Confirmar
            </Button>
          </div>
        );
      case "yes-no":
        return (
          <div className="flex gap-3 w-full">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1"
            >
              No
            </Button>
            <Button
              onClick={handleConfirm}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              Sí
            </Button>
          </div>
        );
      default: // ok
        return (
          <Button
            onClick={onClose}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            OK
          </Button>
        );
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${themeClasses.overlay}`}
      onClick={onClose}
    >
      <div
        className={`relative w-full max-w-md rounded-xl border shadow-2xl ${themeClasses.modal} animate-in fade-in-0 zoom-in-95 duration-200`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 hover:bg-white/10 transition-colors"
        >
          <X className={`h-4 w-4 ${themeClasses.title}`} />
        </button>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Icon */}
          <div className={`flex justify-center p-3 rounded-full ${alertConfig.bgAccent} border ${alertConfig.borderAccent} w-fit mx-auto`}>
            {alertConfig.icon}
          </div>

          {/* Title */}
          <h2 className={`text-xl font-bold text-center ${themeClasses.title}`}>
            {title}
          </h2>

          {/* Message */}
          <div className={`text-sm text-center ${themeClasses.message} whitespace-pre-line max-h-96 overflow-y-auto`}>
            {message}
          </div>

          {/* Buttons */}
          <div className="pt-2">
            {renderButtons()}
          </div>
        </div>
      </div>
    </div>
  );
}
