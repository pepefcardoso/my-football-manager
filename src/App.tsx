function App() {
  return (
    <div className="h-screen w-full flex flex-col items-center justify-center space-y-8 bg-slate-950 text-white">
      <h1 className="text-6xl font-bold tracking-tighter bg-gradient-to-r from-emerald-400 to-cyan-500 bg-clip-text text-transparent">
        My Football Manager
      </h1>

      <div className="flex flex-col space-y-4 w-64">
        <button className="px-6 py-3 rounded bg-emerald-600 hover:bg-emerald-500 font-semibold transition-all shadow-lg hover:shadow-emerald-500/20">
          Novo Jogo
        </button>
        <button className="px-6 py-3 rounded bg-slate-800 hover:bg-slate-700 font-semibold transition-all">
          Carregar Jogo
        </button>
        <button className="px-6 py-3 rounded bg-slate-800 hover:bg-slate-700 font-semibold transition-all">
          Sair
        </button>
      </div>

      <p className="fixed bottom-4 text-slate-500 text-sm">Versão Dev 0.0.1</p>
    </div>
  )
}

export default App