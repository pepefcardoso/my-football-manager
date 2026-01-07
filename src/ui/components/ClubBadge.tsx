import React from "react";
import { getBadgePath } from "../assets/assetRegistry";
import { clsx } from "clsx";

interface ClubBadgeProps {
    badgeId?: string;
    clubName: string;
    size?: "sm" | "md" | "lg" | "xl" | "2xl";
    className?: string;
    showPlaceholder?: boolean;
}

const SIZE_CLASSES = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-12 h-12",
    xl: "w-16 h-16",
    "2xl": "w-24 h-24"
};

export const ClubBadge: React.FC<ClubBadgeProps> = ({
    badgeId,
    clubName,
    size = "md",
    className,
    showPlaceholder = true
}) => {
    const src = getBadgePath(badgeId);
    const [error, setError] = React.useState(false);

    if (!badgeId || error || !src) {
        if (!showPlaceholder) return null;

        return (
            <div className={clsx(
                "bg-background-tertiary rounded-full flex items-center justify-center border border-white/10 text-text-muted select-none",
                SIZE_CLASSES[size],
                className
            )} title={clubName}>
                <span className="font-bold text-[0.6em] leading-none">
                    {clubName.substring(0, 2).toUpperCase()}
                </span>
            </div>
        );
    }

    return (
        <img
            src={src}
            alt={clubName}
            className={clsx("object-contain select-none", SIZE_CLASSES[size], className)}
            onError={() => setError(true)}
            loading="lazy"
        />
    );
};