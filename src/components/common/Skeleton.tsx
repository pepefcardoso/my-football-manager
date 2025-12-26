interface SkeletonProps {
    className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
    return (
        <div
            className={`animate-pulse bg-slate-800/50 rounded ${className}`}
        />
    );
}

export function SkeletonCard() {
    return (
        <div className="bg-slate-900 rounded-lg p-6 border border-slate-800 shadow-sm">
            <div className="flex justify-between items-start mb-4">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-6 w-6 rounded-full" />
            </div>
            <Skeleton className="h-8 w-1/2 mb-2" />
            <Skeleton className="h-3 w-3/4" />
        </div>
    );
}

export function SkeletonRow({ cols = 4 }: { cols?: number }) {
    return (
        <div className="flex items-center gap-4 py-4 px-4 border-b border-slate-800/50">
            <Skeleton className="h-10 w-10 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/4" />
            </div>
            {Array.from({ length: cols - 1 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-16 hidden md:block" />
            ))}
        </div>
    );
}

export function SkeletonList({ count = 5 }: { count?: number }) {
    return (
        <div className="space-y-3 w-full">
            {Array.from({ length: count }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
        </div>
    );
}