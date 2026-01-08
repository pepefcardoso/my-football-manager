import { useEffect, useState } from "react";
import { eventBus } from "../../core/events/EventBus";
import { Notification } from "../../core/models/events";
import { GameState } from "../../core/models/gameState";

export interface ToastMessage {
  id: string;
  title: string;
  type: "CRITICAL" | "IMPORTANT" | "INFO";
}

export const useNotificationListener = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const handleNotification = (
      _state: GameState,
      payload: { notification: Notification }
    ) => {
      const { notification } = payload;

      const newToast: ToastMessage = {
        id: notification.id,
        title: notification.title,
        type: notification.type,
      };

      setToasts((prev) => [...prev, newToast]);

      const timer = setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
      }, 5000);

      return () => clearTimeout(timer);
    };

    const unsubscribe = eventBus.on("NOTIFICATION_CREATED", handleNotification);

    return () => {
      unsubscribe();
    };
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return { toasts, removeToast };
};
