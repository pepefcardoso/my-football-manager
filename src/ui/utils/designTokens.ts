import { NotificationType } from "../../core/models/events";
import { AlertCircle, AlertTriangle, Info, LucideIcon } from "lucide-react";

interface NotificationStyle {
  borderColor: string;
  textColor: string;
  iconColor: string;
  backgroundColor: string;
  softBackgroundColor: string;
  Icon: LucideIcon;
}

export const getNotificationStyle = (
  type: NotificationType
): NotificationStyle => {
  switch (type) {
    case "CRITICAL":
      return {
        borderColor: "border-status-danger",
        textColor: "text-status-danger",
        iconColor: "text-status-danger",
        backgroundColor: "bg-red-950/90",
        softBackgroundColor: "bg-status-danger/10",
        Icon: AlertCircle,
      };
    case "IMPORTANT":
      return {
        borderColor: "border-status-warning",
        textColor: "text-status-warning",
        iconColor: "text-status-warning",
        backgroundColor: "bg-yellow-950/90",
        softBackgroundColor: "bg-status-warning/10",
        Icon: AlertTriangle,
      };
    case "INFO":
    default:
      return {
        borderColor: "border-blue-400",
        textColor: "text-text-primary",
        iconColor: "text-blue-400",
        backgroundColor: "bg-background-secondary",
        softBackgroundColor: "bg-blue-400/10",
        Icon: Info,
      };
  }
};
