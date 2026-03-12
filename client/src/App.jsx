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
import ClientProfile from './pages/ClientProfile'
import HandymanFeed from './pages/HandymanFeed'
import HandymanPersonalProfile from './pages/HandymanPersonalProfile'
import HandymanMyProfile from './pages/HandymanMyProfile'
import ProtectedRoute from './components/ProtectedRoute'

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
        <Route path="/onboarding" element={<ProtectedRoute allowedRoles={['client']} requireOnboarding={false}><Onboarding /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['client']}><ClientDashboard /></ProtectedRoute>} />
        <Route path="/find-services" element={<ProtectedRoute allowedRoles={['client']}><FindServices /></ProtectedRoute>} />
        <Route path="/handymen/:slug" element={<ProtectedRoute allowedRoles={['client']}><HandymanProfile /></ProtectedRoute>} />
        <Route path="/book/:slug" element={<ProtectedRoute allowedRoles={['client']}><BookService /></ProtectedRoute>} />
        <Route path="/issues" element={<ProtectedRoute allowedRoles={['client']}><Issues /></ProtectedRoute>} />
        <Route path="/post-task" element={<ProtectedRoute allowedRoles={['client']}><PostTask /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute allowedRoles={['client']}><ClientProfile /></ProtectedRoute>} />

        <Route path="/handyman-onboarding" element={<ProtectedRoute allowedRoles={['handyman']} requireOnboarding={false}><HandymanOnboarding /></ProtectedRoute>} />
        <Route path="/handyman/dashboard" element={<ProtectedRoute allowedRoles={['handyman']}><HandymanDashboard /></ProtectedRoute>} />
        <Route path="/handyman/jobs" element={<ProtectedRoute allowedRoles={['handyman']}><HandymanJobs /></ProtectedRoute>} />
        <Route path="/handyman/reviews" element={<ProtectedRoute allowedRoles={['handyman']}><HandymanReviews /></ProtectedRoute>} />
        <Route path="/handyman/services" element={<ProtectedRoute allowedRoles={['handyman']}><HandymanServices /></ProtectedRoute>} />
        <Route path="/handyman/feed" element={<ProtectedRoute allowedRoles={['handyman']}><HandymanFeed /></ProtectedRoute>} />
        <Route path="/handyman/my-profile" element={<ProtectedRoute allowedRoles={['handyman']}><HandymanMyProfile /></ProtectedRoute>} />
        <Route path="/handyman/personal-profile" element={<ProtectedRoute allowedRoles={['handyman']}><HandymanPersonalProfile /></ProtectedRoute>} />
        
      </Routes>
    </BrowserRouter>
  )
}

export default App