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
        backgroundColor: "bg-status-danger",
        softBackgroundColor: "bg-status-danger/10",
        Icon: AlertCircle,
      };
    case "IMPORTANT":
      return {
        borderColor: "border-status-warning",
        textColor: "text-status-warning",
        iconColor: "text-status-warning",
        backgroundColor: "bg-status-warning",
        softBackgroundColor: "bg-status-warning/10",
        Icon: AlertTriangle,
      };
    case "INFO":
    default:
      return {
        borderColor: "border-primary",
        textColor: "text-text-primary",
        iconColor: "text-primary",
        backgroundColor: "bg-background-secondary",
        softBackgroundColor: "bg-primary/10",
        Icon: Info,
      };
  }
};
