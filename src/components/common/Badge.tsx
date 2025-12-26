import * as React from "react";
import { type VariantProps } from "class-variance-authority";
import { cn } from "../../utils/cn";
import { badgeVariants } from "./badgeVariants";

export interface BadgeProps
    extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, size, ...props }: BadgeProps) {
    return (
        <span
            className={cn(badgeVariants({ variant, size, className }))}
            {...props}
        />
    );
}

export default Badge;