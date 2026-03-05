// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Navbar    from './components/Navbar'
import Home      from './pages/Home'
import Login     from './pages/Login'
import Register  from './pages/Register'
import Household from './pages/Household'
import Station   from './pages/Station'

function Protected({ children, role }) {
  const user = JSON.parse(localStorage.getItem('user') || 'null')
  if (!user) return <Navigate to="/login" />
  if (role && user.role !== role) return <Navigate to="/" />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Navbar />
      <Routes>
        <Route path="/"          element={<Home />} />
        <Route path="/login"     element={<Login />} />
        <Route path="/register"  element={<Register />} />
        <Route path="/household" element={
          <Protected><Household /></Protected>
        } />
        <Route path="/station" element={
          <Protected role="operator"><Station /></Protected>
        } />
      </Routes>
    </BrowserRouter>
  )
}