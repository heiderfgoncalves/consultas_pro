import * as Icons from "lucide-react";
import type { LucideProps } from "lucide-react";

export function LucideIcon({ name, ...rest }: { name?: string } & LucideProps) {
  const Icon = name ? (Icons as unknown as Record<string, React.ComponentType<LucideProps>>)[name] : undefined;
  const Fallback = Icons.Circle;
  const Component = Icon ?? Fallback;
  return <Component {...rest} />;
}
