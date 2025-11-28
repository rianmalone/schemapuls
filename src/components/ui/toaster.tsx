import { useToast } from "@/hooks/use-toast";
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && <ToastDescription>{description}</ToastDescription>}
            </div>
            {action}
            <ToastClose />
            <ToastProgressBar duration={4000} />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}

function ToastProgressBar({ duration }: { duration: number }) {
  return (
    <div className="absolute bottom-0 left-0 right-0 h-1 bg-transparent overflow-hidden -mx-6">
      <div 
        className="h-full bg-primary origin-left animate-shrink-width"
        style={{ 
          animationDuration: `${duration}ms`,
          animationTimingFunction: 'linear',
          animationFillMode: 'forwards'
        }}
      />
    </div>
  );
}
