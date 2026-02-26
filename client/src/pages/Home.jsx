import { Link } from 'react-router-dom'

export default function Home() {
  const categories = [
    { icon: '⚡', name: 'Electricitate', description: 'Prize, tablouri electrice, instalații' },
    { icon: '🚿', name: 'Instalații sanitare', description: 'Robinete, țevi, canalizare' },
    { icon: '🎨', name: 'Zugrăvit', description: 'Vopsit pereți, tavane, decorativ' },
    { icon: '🪵', name: 'Parchet', description: 'Montaj, reparații, șlefuire' },
    { icon: '🧱', name: 'Tapet', description: 'Aplicare, îndepărtare, decorativ' },
    { icon: '🔧', name: 'Reparații generale', description: 'Mobilă, uși, ferestre' },
  ]

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 to-blue-800 text-white">
        <div className="max-w-6xl mx-auto px-4 py-20 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Găsește cel mai bun handyman
            <br />pentru orice lucrare
          </h1>
          <p className="text-blue-100 text-lg md:text-xl mb-10 max-w-2xl mx-auto">
            Conectăm clienții cu profesioniști verificați pentru lucrări de
            întreținere, reparații și amenajări. Rapid, sigur și la prețuri corecte.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              to="/register"
              className="bg-white text-blue-600 px-8 py-3 rounded-lg font-bold text-lg hover:bg-blue-50 transition"
            >
              Postează un task
            </Link>
            <Link
              to="/register"
              className="border-2 border-white text-white px-8 py-3 rounded-lg font-bold text-lg hover:bg-white hover:text-blue-600 transition"
            >
              Devino Handyman
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-12">
          Cum funcționează?
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { step: '1', icon: '📝', title: 'Postează un task', desc: 'Descrie ce lucrare ai nevoie și adaugă poze. AI-ul nostru te ajută cu descrierea și etichetele.' },
            { step: '2', icon: '🤝', title: 'Primește oferte', desc: 'Handymanii din zona ta trimit propuneri cu preț și timp estimat. Tu alegi cel mai potrivit.' },
            { step: '3', icon: '✅', title: 'Lucrare finalizată', desc: 'După finalizare, confirmi lucrarea și lași un review. Simplu și transparent.' },
          ].map((item) => (
            <div key={item.step} className="text-center p-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
                {item.icon}
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">{item.title}</h3>
              <p className="text-gray-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-12">
            Categorii de servicii
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {categories.map((cat) => (
              <div
                key={cat.name}
                className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition cursor-pointer border border-gray-100"
              >
                <span className="text-3xl mb-3 block">{cat.icon}</span>
                <h3 className="font-bold text-gray-800 mb-1">{cat.name}</h3>
                <p className="text-sm text-gray-500">{cat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-gray-400 py-8">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-lg font-bold text-white mb-2">🔧 HandyConnect</p>
          <p className="text-sm">© 2026 HandyConnect. Proiect de licență — Gărnăuțan Oleg, UPT</p>
        </div>
      </footer>
    </div>
  )
}