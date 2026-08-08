import type { ReactNode } from "react";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

type BottomSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  hideHeader?: boolean;
};

/**
 * Native-style bottom sheet. Prefer this over navigating to a new page for
 * short-lived interactions (filters, create menu, quick actions).
 */
export function BottomSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
  hideHeader,
}: BottomSheetProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        className={cn(
          "max-h-[92dvh] rounded-t-[28px] border-0 bg-surface-1 px-0 pb-[max(1rem,var(--safe-area-bottom))] shadow-app-lg",
          className,
        )}
      >
        <div className="mx-auto w-full max-w-2xl">
          {title ? (
            <div className={cn("px-5 pb-3", hideHeader && "sr-only")}>
              <DrawerTitle className="text-lg font-semibold tracking-tight">{title}</DrawerTitle>
              {description ? (
                <DrawerDescription className="text-sm text-muted-foreground">
                  {description}
                </DrawerDescription>
              ) : null}
            </div>
          ) : null}
          <div className="app-scroll max-h-[78dvh] overflow-y-auto px-5">{children}</div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}