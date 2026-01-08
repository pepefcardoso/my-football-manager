import React, { useState, useMemo, useRef, useEffect } from "react";
import { useGameStore } from "../../state/useGameStore";
import { useUIStore } from "../../state/useUIStore";
import { NotificationType, Notification } from "../../core/models/events";
import { formatDate } from "../../core/utils/formatters";
import {
    Bell,
    Check,
    Trash2,
    AlertCircle,
    Info,
    AlertTriangle
} from "lucide-react";

export const NotificationCenter: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [filter, setFilter] = useState<NotificationType | "ALL">("ALL");
    const dropdownRef = useRef<HTMLDivElement>(null);

    const {
        markNotificationAsRead,
        deleteNotification,
        setState
    } = useGameStore();
    const {
        notifications
    } = useGameStore(s => s.system);

    const { setView } = useUIStore();

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const processedNotifications = useMemo(() => {
        return Object.values(notifications)
            .sort((a, b) => b.date - a.date)
            .filter(n => filter === "ALL" || n.type === filter);
    }, [notifications, filter]);

    const unreadCount = useMemo(() => {
        return Object.values(notifications).filter(n => !n.isRead).length;
    }, [notifications]);

    const handleMarkAllAsRead = () => {
        setState((state) => {
            Object.values(state.system.notifications).forEach(n => {
                n.isRead = true;
            });
        });
    };

    const handleNotificationClick = (notification: Notification) => {
        if (!notification.isRead) {
            markNotificationAsRead(notification.id);
        }

        if (notification.relatedEntity) {
            switch (notification.relatedEntity.type) {
                case "PLAYER":
                    setView("SQUAD");
                    break;
                case "MATCH":
                    setView("CALENDAR");
                    break;
                case "TRANSFER_OFFER":
                    setView("MARKET");
                    break;
                default:
                    break;
            }
        }
        setIsOpen(false);
    };

    const getIcon = (type: NotificationType) => {
        switch (type) {
            case "CRITICAL": return <AlertCircle size={16} className="text-status-danger" />;
            case "IMPORTANT": return <AlertTriangle size={16} className="text-status-warning" />;
            case "INFO": return <Info size={16} className="text-blue-400" />;
        }
    };

    const getBorderColor = (type: NotificationType) => {
        switch (type) {
            case "CRITICAL": return "border-l-status-danger";
            case "IMPORTANT": return "border-l-status-warning";
            case "INFO": return "border-l-blue-400";
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 text-text-secondary hover:text-text-primary hover:bg-background-tertiary rounded-full transition-colors relative"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-status-danger rounded-full border-2 border-background-secondary">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 md:w-96 bg-background-secondary border border-background-tertiary rounded-lg shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">

                    <div className="p-3 border-b border-background-tertiary flex justify-between items-center bg-background/50 backdrop-blur-sm">
                        <h3 className="font-bold text-text-primary text-sm">Notificações</h3>
                        <div className="flex items-center space-x-1">
                            {unreadCount > 0 && (
                                <button
                                    onClick={handleMarkAllAsRead}
                                    className="text-xs text-primary hover:text-primary-hover px-2 py-1 rounded hover:bg-primary/10 transition-colors flex items-center"
                                    title="Marcar todas como lidas"
                                >
                                    <Check size={12} className="mr-1" /> Lidas
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="p-2 border-b border-background-tertiary flex space-x-1 overflow-x-auto scrollbar-hide">
                        {(["ALL", "CRITICAL", "IMPORTANT", "INFO"] as const).map((type) => (
                            <button
                                key={type}
                                onClick={() => setFilter(type)}
                                className={`
                  px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-colors
                  ${filter === type
                                        ? 'bg-primary text-white'
                                        : 'bg-background-tertiary text-text-secondary hover:text-text-primary'}
                `}
                            >
                                {type === "ALL" ? "Todas" : type}
                            </button>
                        ))}
                    </div>

                    <div className="max-h-96 overflow-y-auto custom-scrollbar">
                        {processedNotifications.length === 0 ? (
                            <div className="p-8 text-center text-text-muted flex flex-col items-center">
                                <Bell size={32} className="mb-2 opacity-20" />
                                <span className="text-sm">Nenhuma notificação {filter !== 'ALL' ? 'nesta categoria' : ''}.</span>
                            </div>
                        ) : (
                            <div className="divide-y divide-background-tertiary/50">
                                {processedNotifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        className={`
                      relative group p-3 hover:bg-background-tertiary/30 transition-colors cursor-pointer border-l-4
                      ${getBorderColor(notification.type)}
                      ${notification.isRead ? 'opacity-70 hover:opacity-100' : 'bg-background-tertiary/10'}
                    `}
                                        onClick={() => handleNotificationClick(notification)}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <div className="flex items-center space-x-2">
                                                {getIcon(notification.type)}
                                                <span className={`text-sm font-bold ${notification.isRead ? 'text-text-secondary' : 'text-text-primary'}`}>
                                                    {notification.title}
                                                </span>
                                            </div>
                                            <span className="text-[10px] text-text-muted whitespace-nowrap ml-2">
                                                {formatDate(notification.date)}
                                            </span>
                                        </div>

                                        <p className="text-xs text-text-secondary leading-relaxed pr-6">
                                            {notification.message}
                                        </p>

                                        {!notification.isRead && (
                                            <div className="absolute top-4 right-3 w-2 h-2 bg-primary rounded-full animate-pulse" />
                                        )}

                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                deleteNotification(notification.id);
                                            }}
                                            className="absolute bottom-2 right-2 p-1.5 text-text-muted hover:text-status-danger hover:bg-status-danger/10 rounded transition-all opacity-0 group-hover:opacity-100"
                                            title="Remover"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};