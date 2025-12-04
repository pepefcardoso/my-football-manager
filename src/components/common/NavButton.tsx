function NavButton({
    active,
    onClick,
    icon,
    children,
}: {
    active: boolean;
    onClick: () => void;
    icon: string;
    children: React.ReactNode;
}) {
    return (
        <button
            onClick={onClick}
            className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 transition-all ${active
                ? "bg-emerald-600 text-white shadow-lg"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
        >
            <span className="text-lg">{icon}</span>
            <span className="text-sm font-medium">{children}</span>
        </button>
    );
}

export default NavButton;