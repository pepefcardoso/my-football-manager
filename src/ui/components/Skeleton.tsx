import React from "react";
import { clsx } from "clsx";

interface SkeletonProps {
    className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className }) => {
    return (
        <div
            className={clsx(
                "animate-pulse bg-background-tertiary/50 rounded",
                className
            )}
        />
    );
};