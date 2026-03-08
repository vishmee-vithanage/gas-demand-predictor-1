// frontend/src/components/Navbar.jsx
import { Link, useNavigate } from 'react-router-dom'

export default function Navbar() {
  const navigate = useNavigate()
  const user     = JSON.parse(localStorage.getItem('user') || 'null')
  const isAdmin  = user?.role === 'admin'

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
              {/* Admin sees station dashboard */}
              {isAdmin && (
                <Link to="/station">📊 Station Dashboard</Link>
              )}

              {/* Regular users see their gas page */}
              {!isAdmin && (
                <Link to="/household">🏠 My Gas</Link>
              )}

              <span style={{
                color:'#94a3b8', fontSize:'0.85rem',
                display:'flex', alignItems:'center', gap:6
              }}>
                {isAdmin ? '🔑' : '👤'} {user.name}
                {isAdmin && (
                  <span style={{
                    background:'#2563eb', color:'white',
                    fontSize:'0.7rem', padding:'1px 7px',
                    borderRadius:20, fontWeight:700
                  }}>
                    ADMIN
                  </span>
                )}
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