import * as React from "react";
import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";

import { cn } from "@/lib/utils";

const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Popup> & { sideOffset?: number; side?: "top" | "bottom" | "left" | "right" }
>(({ className, children, sideOffset = 8, side = "top", ...props }, ref) => {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner sideOffset={sideOffset} side={side} className="z-50">
        <TooltipPrimitive.Popup
          ref={ref}
          className={cn(
            "rounded-xl border border-white/15 bg-[#1E0E15]/95 px-3 py-2 text-xs font-medium text-white shadow-[0_18px_45px_rgba(31,14,21,0.25)] backdrop-blur-xl",
            className,
          )}
          {...props}
        >
          {children}
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  );
});
TooltipContent.displayName = "TooltipContent";

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
