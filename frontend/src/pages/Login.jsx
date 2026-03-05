// src/pages/Login.jsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import API from '../api'
import toast from 'react-hot-toast'

export default function Login() {
  const navigate = useNavigate()
  const [form, setForm]     = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await API.post('/auth/login', form)
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('user',  JSON.stringify(res.data.user))
      toast.success(`Welcome back, ${res.data.user.name}!`)
      if (res.data.user.role === 'operator') navigate('/station')
      else navigate('/household')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Login failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="page">
      <div className="container" style={{maxWidth: 420, margin: '0 auto'}}>
        <div style={{textAlign:'center', marginBottom: 28}}>
          <div style={{fontSize: '3rem'}}>⛽</div>
          <h1 className="page-title" style={{textAlign:'center'}}>Welcome Back</h1>
          <p className="page-subtitle" style={{textAlign:'center'}}>
            Sign in to view your gas predictions
          </p>
        </div>
        <div className="card">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email Address</label>
              <input className="form-control" type="email" placeholder="you@example.com"
                value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input className="form-control" type="password" placeholder="••••••••"
                value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
            </div>
            <button className="btn btn-primary" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          <p style={{textAlign:'center', marginTop:16, fontSize:'0.9rem', color:'#64748b'}}>
            No account? <Link to="/register" style={{color:'#2563eb'}}>Register here</Link>
          </p>
        </div>
      </div>
    </div>
  )
}