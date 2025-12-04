function StatCard({
    title,
    value,
    subtitle,
    suffix,
}: {
    title: string;
    value: string | number;
    subtitle?: string;
    suffix?: string;
}) {
    return (
        <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
            <h3 className="text-sm font-medium text-slate-400 mb-2">{title}</h3>
            <p className="text-3xl font-bold text-white">
                {value}
                {suffix && <span className="text-lg text-slate-500">{suffix}</span>}
            </p>
            {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
        </div>
    );
}

export default StatCard;