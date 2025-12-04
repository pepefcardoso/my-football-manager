import type { ReactNode } from "react";

interface MainLayoutProps {
    children: ReactNode;
    sidebar: ReactNode;
}

function MainLayout({ children, sidebar }: MainLayoutProps) {
    return (
        <div className="h-screen w-full flex flex-row bg-slate-950 text-white overflow-hidden">
            {sidebar}

            <main className="flex-1 overflow-y-auto relative">
                {children}
            </main>
        </div>
    );
}

export default MainLayout;