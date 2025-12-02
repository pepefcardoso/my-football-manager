import { useState } from 'react';

type Team = {
  id: number;
  name: string;
  primaryColor: string | null;
};

function App() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);

  const loadTeams = async () => {
    setLoading(true);
    try {
      const data = await window.electronAPI.getTeams();
      setTeams(data);
    } catch (error) {
      console.error("Erro ao carregar:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full flex flex-row bg-slate-950 text-white overflow-hidden">

      <aside className="w-64 bg-slate-900 border-r border-slate-800 p-6 flex flex-col gap-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-500 bg-clip-text text-transparent">
          FM 2025
        </h1>

        <nav className="flex flex-col gap-2">
          <button
            onClick={loadTeams}
            className="text-left px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 transition-colors font-medium"
          >
            Carregar Equipas
          </button>
          <button className="text-left px-4 py-2 rounded hover:bg-slate-800 transition-colors text-slate-400">
            Sair
          </button>
        </nav>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">
        <header className="mb-8">
          <h2 className="text-3xl font-light">Bem-vindo, Treinador</h2>
          <p className="text-slate-400">Selecione uma ação no menu.</p>
        </header>

        {loading && <p className="text-emerald-400 animate-pulse">A carregar dados do disco...</p>}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((team) => (
            <div
              key={team.id}
              className="p-4 rounded-lg bg-slate-900 border border-slate-800 hover:border-emerald-500/50 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shadow-lg"
                  style={{ backgroundColor: team.primaryColor || '#333' }}
                >
                  {team.name.substring(0, 1)}
                </div>
                <div>
                  <h3 className="font-semibold text-lg group-hover:text-emerald-400 transition-colors">
                    {team.name}
                  </h3>
                  <p className="text-xs text-slate-500">ID: {team.id}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

export default App