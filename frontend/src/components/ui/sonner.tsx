import { useEffect, useState } from "react";
import { useTheme } from "@/hooks/use-theme";
import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [activeTheme, setActiveTheme] = useState<ToasterProps["theme"]>("system");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setActiveTheme(theme as ToasterProps["theme"]);
  }, [theme]);

  if (!mounted) {
    return null;
  }

  return (
    <Sonner
      theme={activeTheme}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
