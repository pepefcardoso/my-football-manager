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

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
      }, 5000);
    };

    eventBus.on("NOTIFICATION_CREATED", handleNotification);

    return () => {
      eventBus.off("NOTIFICATION_CREATED", handleNotification);
    };
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return { toasts, removeToast };
};
