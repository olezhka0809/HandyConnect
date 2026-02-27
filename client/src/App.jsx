import { BrowserRouter, Routes, Route } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import ClientDashboard from './pages/ClientDashboard'
import AboutUs from './pages/AboutUs'
import Contact from './pages/Contact'
import Onboarding from './pages/Onboarding'
import FindServices from './pages/FindServices'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Pagini CU navbar + footer */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/about" element={<AboutUs />} />
          <Route path="/contact" element={<Contact />} />
        </Route>

        {/* Pagini FĂRĂ navbar + footer */}
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/dashboard" element={<ClientDashboard />} />
        <Route path="/find-services" element={<FindServices />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App