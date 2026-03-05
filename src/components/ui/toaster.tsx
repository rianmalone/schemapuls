import { useToast } from "@/hooks/use-toast";
import { Toast, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider swipeDirection="up" duration={3000}>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && <ToastDescription>{description}</ToastDescription>}
            </div>
            {action}
            <ToastProgressBar duration={3000} />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}

function ToastProgressBar({ duration }: { duration: number }) {
  return (
    <div className="absolute -left-6 -right-6 -bottom-0 z-10 h-1 pointer-events-none">
      <div 
        className="h-full w-full bg-primary origin-left"
        style={{ 
          animation: `shrink-width ${duration}ms linear forwards`,
        }}
      />
    </div>
  );
}
