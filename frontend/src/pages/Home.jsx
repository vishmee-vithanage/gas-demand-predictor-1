// src/pages/Home.jsx
import { Link } from 'react-router-dom'

export default function Home() {
  const user = JSON.parse(localStorage.getItem('user') || 'null')

  return (
    <div className="page">
      <div className="container">
        {/* Hero */}
        <div style={{textAlign:'center', padding:'40px 0 48px'}}>
          <div style={{fontSize:'4rem', marginBottom:16}}>⛽</div>
          <h1 style={{fontSize:'2.2rem', fontWeight:800, color:'#1e3a5f', marginBottom:12}}>
            Gas Demand Predictor
          </h1>
          <p style={{fontSize:'1.1rem', color:'#64748b', maxWidth:520, margin:'0 auto 28px'}}>
            AI-powered LPG gas depletion prediction and auto-refill suggestions for households and fuel stations in Sri Lanka.
          </p>
          {user ? (
            <Link to={user.role === 'operator' ? '/station' : '/household'}
              className="btn btn-primary" style={{width:'auto', padding:'12px 36px', fontSize:'1rem'}}>
              Go to Dashboard →
            </Link>
          ) : (
            <div style={{display:'flex', gap:12, justifyContent:'center'}}>
              <Link to="/register" className="btn btn-primary"
                style={{width:'auto', padding:'12px 32px'}}>Get Started Free</Link>
              <Link to="/login" className="btn btn-outline"
                style={{padding:'12px 32px'}}>Sign In</Link>
            </div>
          )}
        </div>

        {/* Feature cards */}
        <div className="grid-3" style={{marginBottom:40}}>
          {[
            { icon:'🏠', title:'Household Prediction',
              desc:'Enter your cylinder size and usage habits. Get an exact date when your gas will run out.' },
            { icon:'📊', title:'Station Forecasting',
              desc:'7-day demand forecast for gas station operators with bar charts and daily breakdowns.' },
            { icon:'🔊', title:'Voice Alerts',
              desc:'Automatic voice notifications tell you when your gas is running low — no app needed.' },
          ].map(f => (
            <div key={f.title} className="card" style={{textAlign:'center'}}>
              <div style={{fontSize:'2.5rem', marginBottom:12}}>{f.icon}</div>
              <div style={{fontWeight:700, color:'#1e3a5f', marginBottom:8}}>{f.title}</div>
              <div style={{color:'#64748b', fontSize:'0.88rem', lineHeight:1.6}}>{f.desc}</div>
            </div>
          ))}
        </div>

        {/* How it works */}
        <div className="card">
          <div className="card-title" style={{textAlign:'center', fontSize:'1.3rem', marginBottom:24}}>
            How It Works
          </div>
          <div className="grid-3">
            {[
              { step:'1', title:'Register', desc:'Create an account as a household user or station operator.' },
              { step:'2', title:'Enter Details', desc:'Input your cylinder size, household info, and usage habits.' },
              { step:'3', title:'Get Prediction', desc:'Receive your depletion date, alerts, and refill recommendations.' },
            ].map(s => (
              <div key={s.step} style={{textAlign:'center', padding:'0 12px'}}>
                <div style={{width:44, height:44, borderRadius:'50%', background:'#2563eb',
                  color:'white', fontWeight:800, fontSize:'1.2rem', display:'flex',
                  alignItems:'center', justifyContent:'center', margin:'0 auto 12px'}}>
                  {s.step}
                </div>
                <div style={{fontWeight:700, marginBottom:6}}>{s.title}</div>
                <div style={{color:'#64748b', fontSize:'0.88rem'}}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}