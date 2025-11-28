import { useToast } from "@/hooks/use-toast";
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";
import { useEffect, useState } from "react";

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
            <ToastProgressBar duration={3500} />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}

function ToastProgressBar({ duration }: { duration: number }) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      
      if (remaining === 0) {
        clearInterval(interval);
      }
    }, 16); // ~60fps

    return () => clearInterval(interval);
  }, [duration]);

  return (
    <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary/20 rounded-b-md overflow-hidden">
      <div 
        className="h-full bg-primary transition-all duration-[16ms] ease-linear"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
