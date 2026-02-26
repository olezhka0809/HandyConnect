import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'

function App() {
  return (
    <BrowserRouter>
      <nav className="bg-white shadow p-4 flex gap-4">
        <Link to="/" className="text-blue-600 font-bold">🔧 HandyConnect</Link>
        <Link to="/login" className="text-gray-600 hover:text-blue-600">Login</Link>
        <Link to="/register" className="text-gray-600 hover:text-blue-600">Register</Link>
      </nav>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App