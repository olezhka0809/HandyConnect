import { X, Send, DollarSign } from 'lucide-react'
import TaskPhoto from '../../components/TaskPhoto'

export default function TaskRequestModal({
  isOpen,
  task,
  mode,
  onClose,
  onSubmit,
  form,
  setForm,
  sending,
}) {
  if (!isOpen || !task) return null

  const isMessageMode = mode === 'message'

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-gray-800">{isMessageMode ? 'Mesaj pentru client' : 'Negociază oferta'}</h3>
            <p className="text-sm text-gray-500">{task.title}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <TaskPhoto photos={task.photos} category={task.category_name} className="w-10 h-10 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-800 text-sm">{task.title}</p>
                <p className="text-xs text-gray-500">{task.client_name} • {task.city}</p>
              </div>
            </div>
            {task.budget && (
              <p className="text-sm text-gray-600">Buget client: <strong>{Number(task.budget).toLocaleString('ro-RO')} RON</strong></p>
            )}
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-800 mb-2">Prețul tău (RON) *</label>
            <div className="relative">
              <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="number"
                value={form.proposed_price}
                onChange={(e) => setForm(prev => ({ ...prev, proposed_price: e.target.value }))}
                placeholder="Ex: 250"
                className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-800 mb-2">Durată estimată</label>
            <input
              type="text"
              value={form.estimated_duration}
              onChange={(e) => setForm(prev => ({ ...prev, estimated_duration: e.target.value }))}
              placeholder="Ex: 2-3 ore, 1 zi"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-2">Disponibil pe</label>
              <input
                type="date"
                value={form.available_date}
                onChange={(e) => setForm(prev => ({ ...prev, available_date: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-2">Ora</label>
              <select
                value={form.available_time}
                onChange={(e) => setForm(prev => ({ ...prev, available_time: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selectează</option>
                {['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-800 mb-2">{isMessageMode ? 'Mesaj către client' : 'Mesaj de negociere'}</label>
            <textarea
              value={form.message}
              onChange={(e) => setForm(prev => ({ ...prev, message: e.target.value }))}
              placeholder={isMessageMode ? 'Scrie un mesaj pentru client...' : 'Prezintă-te și argumentează oferta ta...'}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
          >
            Anulează
          </button>
          <button
            onClick={onSubmit}
            disabled={!form.proposed_price || sending}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {sending ? 'Se trimite...' : isMessageMode ? 'Trimite mesaj' : 'Trimite negocierea'}
          </button>
        </div>
      </div>
    </div>
  )
}
