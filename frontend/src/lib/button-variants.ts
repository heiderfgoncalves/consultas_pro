import { cva } from 'class-variance-authority';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background select-none transition-[color,background-color,border-color,box-shadow,transform,filter] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.98] active:duration-75 disabled:pointer-events-none disabled:opacity-50 disabled:active:scale-100 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:shadow-md active:shadow-inner',
        destructive:
          'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 hover:shadow-md active:shadow-inner active:bg-destructive/88',
        outline:
          'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground hover:shadow active:bg-accent/90 active:shadow-inner',
        secondary:
          'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 hover:shadow active:bg-secondary/70 active:shadow-inner',
        ghost: 'hover:bg-accent hover:text-accent-foreground active:bg-accent/80',
        link: 'text-primary underline-offset-4 hover:underline active:scale-100 active:opacity-80 shadow-none',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);
