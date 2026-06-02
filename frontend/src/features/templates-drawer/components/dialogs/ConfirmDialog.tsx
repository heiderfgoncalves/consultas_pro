import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Payload = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
};

export function ConfirmDialog() {
  const [payload, setPayload] = useState<Payload | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<Payload>).detail;
      if (detail) setPayload(detail);
    };
    window.addEventListener("rd:confirm", handler as EventListener);
    return () => window.removeEventListener("rd:confirm", handler as EventListener);
  }, []);

  return (
    <AlertDialog open={!!payload} onOpenChange={(o) => !o && setPayload(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{payload?.title}</AlertDialogTitle>
          {payload?.description && (
            <AlertDialogDescription>{payload.description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{payload?.cancelLabel ?? "Cancelar"}</AlertDialogCancel>
          <AlertDialogAction
            className={payload?.destructive ? "bg-red-600 hover:bg-red-700" : ""}
            onClick={() => {
              payload?.onConfirm();
              setPayload(null);
            }}
          >
            {payload?.confirmLabel ?? "Confirmar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function confirmDialog(payload: Payload) {
  window.dispatchEvent(new CustomEvent("rd:confirm", { detail: payload }));
}