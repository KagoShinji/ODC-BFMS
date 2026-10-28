"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;

const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[#1b292e]/35 backdrop-blur-[3px]" />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed inset-y-0 left-0 z-50 w-[280px] max-w-[85vw] bg-[#f2f3f1] shadow-xl outline-none data-[state=closed]:-translate-x-full data-[state=open]:translate-x-0 transition-transform duration-200",
        className,
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-3 top-5 z-10 rounded-xl p-2 text-[#526269] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f56618]">
        <X size={18} />
        <span className="sr-only">Close navigation</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
SheetContent.displayName = "SheetContent";

const SheetTitle = DialogPrimitive.Title;

export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetTitle };
