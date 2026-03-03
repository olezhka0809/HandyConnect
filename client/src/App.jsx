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
import HandymanProfile from './pages/HandymanProfile'
import BookService from './pages/BookService'
import Issues from './pages/Issues'
import PostTask from './pages/PostTask'
import HandymanDashboard from './pages/HandymanDashboard'
import HandymanOnboarding from './pages/HandymanOnboarding'
import HandymanJobs from './pages/HandymanJobs'
import HandymanReviews from './pages/HandymanReviews'
import HandymanServices from './pages/HandymanServices'


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
        <Route path="/handyman/:slug" element={<HandymanProfile />} />
        <Route path="/book/:slug" element={<BookService />} />
        <Route path="/issues" element={<Issues />} />
        <Route path="/post-task" element={<PostTask />} />
        <Route path="/handyman/dashboard" element={<HandymanDashboard />} />
        <Route path="/handyman-onboarding" element={<HandymanOnboarding />} />
        <Route path="/handyman/jobs" element={<HandymanJobs />} />
        <Route path="/handyman/reviews" element={<HandymanReviews />} />
        <Route path="/handyman/services" element={<HandymanServices />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App