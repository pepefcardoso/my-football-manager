function PlaceholderPage({ title }: { title: string }) {
    return (
        <div className="p-8">
            <header className="mb-8">
                <h2 className="text-3xl font-light mb-2">{title}</h2>
                <p className="text-slate-400">Em desenvolvimento</p>
            </header>
            <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
                <p className="text-slate-400">Esta funcionalidade será implementada em breve.</p>
            </div>
        </div>
    );
}

export default PlaceholderPage;