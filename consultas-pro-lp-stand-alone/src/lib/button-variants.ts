import { cva } from 'class-variance-authority';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-xs font-medium tracking-wide select-none transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 active:scale-[0.97] active:duration-75 disabled:pointer-events-none disabled:opacity-50 disabled:active:scale-100 [&_svg]:pointer-events-none [&_svg]:size-3.5 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-sm hover:brightness-[1.05] hover:shadow-[0_4px_12px_rgba(var(--primary),0.2)] compozy-btn-glow',
        destructive:
          'bg-destructive text-destructive-foreground shadow-sm hover:brightness-[1.05] active:brightness-[0.95]',
        outline:
          'border border-border/60 bg-transparent text-foreground/80 hover:bg-muted/50 hover:text-foreground hover:border-border transition-all',
        secondary:
          'bg-secondary/60 text-secondary-foreground shadow-sm hover:bg-secondary/100 active:brightness-[0.95]',
        ghost: 'hover:bg-muted/50 hover:text-foreground active:bg-muted/80',
        link: 'text-primary underline-offset-4 hover:underline active:scale-100 active:opacity-80 shadow-none',
      },
      size: {
        default: 'h-9 px-3.5 py-1.5',
        sm: 'h-8 rounded-md px-2.5 text-[11px]',
        lg: 'h-10 rounded-md px-6 text-sm',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);
