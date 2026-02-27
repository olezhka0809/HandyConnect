const columns = [
  {
    title: 'În așteptare',
    color: 'bg-yellow-500',
    bookings: [
      { title: 'Reparație instalație sanitară', handyman: 'Ion Marin', price: '250 RON' },
      { title: 'Montaj prize electrice', handyman: 'Vasile Popa', price: '180 RON' },
    ]
  },
  {
    title: 'Confirmate',
    color: 'bg-blue-500',
    bookings: [
      { title: 'Zugrăvit dormitor', handyman: 'Mihai Stancu', price: '450 RON' },
    ]
  },
  {
    title: 'În progres',
    color: 'bg-purple-500',
    bookings: [
      { title: 'Montaj parchet', handyman: 'Andrei Lungu', price: '800 RON' },
      { title: 'Reparație ușă', handyman: 'Dan Nistor', price: '150 RON' },
    ]
  },
  {
    title: 'Finalizate',
    color: 'bg-green-500',
    bookings: [
      { title: 'Curățenie generală', handyman: 'Ana Dragomir', price: '300 RON' },
      { title: 'Montaj mobilă', handyman: 'Radu Ionescu', price: '500 RON' },
      { title: 'Reparații electrice', handyman: 'Ion Marin', price: '200 RON' },
    ]
  },
]

export default function BookingsBoard() {
  return (
    <div>
      <h3 className="font-bold text-gray-800 text-lg mb-4">Toate rezervările</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {columns.map((col) => (
          <div key={col.title} className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 ${col.color} rounded-full`} />
                <span className="font-medium text-gray-800 text-sm">{col.title}</span>
              </div>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {col.bookings.length}
              </span>
            </div>
            <div className="p-3 space-y-2">
              {col.bookings.map((booking, i) => (
                <div key={i} className="bg-gray-50 rounded-lg p-3 hover:bg-blue-50 transition cursor-pointer">
                  <p className="font-medium text-gray-800 text-sm">{booking.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{booking.handyman}</p>
                  <p className="text-xs font-semibold text-blue-600 mt-1">{booking.price}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}