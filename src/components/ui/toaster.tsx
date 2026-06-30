"use client";

import { Toaster as SonnerToaster, toast } from "sonner";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info as InfoIcon,
} from "lucide-react";

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      theme="light"
      richColors
      closeButton
      duration={4000}
      toastOptions={{
        classNames: {
          toast:
            "font-sans rounded-2xl border border-primary/20 bg-white/95 text-foreground shadow-[0_24px_48px_rgba(63,39,50,0.18)] backdrop-blur-xl",
          description: "text-muted-foreground",
          actionButton:
            "bg-primary text-white hover:bg-primary-700",
          cancelButton:
            "bg-muted text-muted-foreground hover:bg-muted/80",
          success:
            "!bg-success-50 !text-foreground !border-success-50",
          error:
            "!bg-danger-50 !text-foreground !border-danger-50",
          warning:
            "!bg-secondary/10 !text-foreground !border-secondary/20",
          info:
            "!bg-primary/5 !text-foreground !border-primary/20",
        },
        style: {
          fontSize: "0.875rem",
        },
      }}
      icons={{
        success: <CheckCircle2 className="h-5 w-5 text-success-600" />,
        error: <XCircle className="h-5 w-5 text-danger-600" />,
        warning: <AlertTriangle className="h-5 w-5 text-secondary" />,
        info: <InfoIcon className="h-5 w-5 text-primary" />,
      }}
    />
  );
}

// Re-export the `toast` helper so callers don't need to import from "sonner" directly.
export { toast };
