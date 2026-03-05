// src/pages/Register.jsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import API from '../api'
import toast from 'react-hot-toast'

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm]     = useState({ name:'', email:'', password:'', role:'user' })
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await API.post('/auth/register', form)
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('user',  JSON.stringify(res.data.user))
      toast.success('Account created!')
      if (res.data.user.role === 'operator') navigate('/station')
      else navigate('/household')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Registration failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="page">
      <div className="container" style={{maxWidth: 460, margin: '0 auto'}}>
        <div style={{textAlign:'center', marginBottom: 28}}>
          <div style={{fontSize: '3rem'}}>⛽</div>
          <h1 className="page-title" style={{textAlign:'center'}}>Create Account</h1>
          <p className="page-subtitle" style={{textAlign:'center'}}>
            Start predicting your gas usage today
          </p>
        </div>
        <div className="card">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Full Name</label>
              <input className="form-control" placeholder="Your name"
                value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
            </div>
            <div className="form-group">
              <label>Email Address</label>
              <input className="form-control" type="email" placeholder="you@example.com"
                value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input className="form-control" type="password" placeholder="Min 6 characters"
                value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
            </div>
            <div className="form-group">
              <label>I am a...</label>
              <select className="form-control" value={form.role}
                onChange={e => setForm({...form, role: e.target.value})}>
                <option value="user">Household User</option>
                <option value="operator">Gas Station Operator</option>
              </select>
            </div>
            <button className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
          <p style={{textAlign:'center', marginTop:16, fontSize:'0.9rem', color:'#64748b'}}>
            Already have an account? <Link to="/login" style={{color:'#2563eb'}}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}