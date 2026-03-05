// src/components/Navbar.jsx
import { Link, useNavigate } from 'react-router-dom'

export default function Navbar() {
  const navigate  = useNavigate()
  const user      = JSON.parse(localStorage.getItem('user') || 'null')
  const isOperator = user?.role === 'operator'

  function logout() {
    localStorage.clear()
    navigate('/login')
  }

  return (
    <nav className="navbar">
      <div className="container">
        <Link to="/" className="navbar-brand">
          ⛽ Gas<span>Predictor</span>
        </Link>
        <div className="navbar-links">
          {user ? (
            <>
              {!isOperator && <Link to="/household">My Gas</Link>}
              {isOperator  && <Link to="/station">Station Dashboard</Link>}
              <span style={{color:'#94a3b8', fontSize:'0.85rem'}}>
                👤 {user.name}
              </span>
              <button onClick={logout}>Logout</button>
            </>
          ) : (
            <>
              <Link to="/login">Login</Link>
              <Link to="/register" className="btn-nav-active">Register</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}