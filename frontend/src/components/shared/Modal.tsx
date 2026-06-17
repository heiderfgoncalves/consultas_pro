import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: LucideIcon;
  iconClassName?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | 'full';
  showClose?: boolean;
  headerSuffix?: React.ReactNode;
  noPadding?: boolean;
  bodyClassName?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  icon: Icon,
  iconClassName,
  children,
  footer,
  className,
  size = 'md',
  showClose = true,
  headerSuffix,
  noPadding = false,
  bodyClassName,
}: ModalProps) {
  // Mapeamento dos tamanhos do modal para Tailwind classes
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    full: 'max-w-[95vw] w-full',
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent 
        showClose={showClose}
        className={cn(
          sizeClasses[size],
          "w-full overflow-hidden bg-card border border-border rounded-xl shadow-2xl p-0 flex flex-col max-h-[90vh]",
          className
        )}
      >
        <DialogHeader className="px-6 py-4 border-b border-border/60 shrink-0">
          <div className="flex items-center gap-2">
            {Icon && <Icon className={cn("w-5 h-5 text-primary shrink-0", iconClassName)} />}
            <DialogTitle className="text-base font-bold text-foreground">
              {title}
            </DialogTitle>
          </div>
          {description && (
            <DialogDescription className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>

        {headerSuffix && (
          <div className="shrink-0 border-b border-border/60 bg-card">
            {headerSuffix}
          </div>
        )}

        <div className={cn("flex-1 overflow-y-auto min-h-0 scrollbar-thin", noPadding ? "p-0" : "p-6", bodyClassName)}>
          {children}
        </div>

        {footer && (
          <DialogFooter className="px-6 py-4 border-t border-border/60 bg-muted/20 rounded-b-xl shrink-0 flex items-center justify-between gap-2">
            {footer}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
