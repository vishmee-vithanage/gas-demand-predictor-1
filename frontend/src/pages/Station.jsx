// frontend/src/pages/Station.jsx
import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts'
import API from '../api'
import toast from 'react-hot-toast'

const URGENCY_STYLE = {
  critical: { bg: '#fef2f2', border: '#fecaca', color: '#991b1b', label: '🚨 TODAY/TOMORROW' },
  urgent:   { bg: '#fffbeb', border: '#fde68a', color: '#92400e', label: '⚠️ Within 3 days'  },
  warning:  { bg: '#eff6ff', border: '#bfdbfe', color: '#1e40af', label: '📅 Within 7 days'  },
  ok:       { bg: '#f0fdf4', border: '#bbf7d0', color: '#166534', label: '✅ OK'              },
}

export default function Station() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [tab,     setTab]     = useState('forecast')  // 'forecast' | 'users'

  useEffect(() => { loadDashboard() }, [])

  async function loadDashboard() {
    setLoading(true)
    try {
      const res = await API.get('/station/dashboard')
      setData(res.data)
    } catch {
      toast.error('Failed to load station dashboard')
    } finally {
      setLoading(false)
    }
  }

  async function sendReport() {
    setSending(true)
    try {
      await API.post('/station/send-report')
      toast.success('📧 Report sent to station email!')
    } catch {
      toast.error('Failed to send report')
    } finally {
      setSending(false)
    }
  }

  function speakSummary() {
    if (!data) return
    const msg = new SpeechSynthesisUtterance(
      `Station summary: ${data.total_registered_users} registered users. ` +
      `Tomorrow's demand is ${data.tomorrow_demand} cylinders. ` +
      `${data.critical_count} customers are critical. ` +
      data.alert_message.replace(/[🚨⚠️✅ℹ️📅]/g, '')
    )
    window.speechSynthesis.speak(msg)
    toast.success('🔊 Voice summary playing')
  }

  if (loading) return (
    <div className="page">
      <div className="container">
        <div className="spinner" />
        <p style={{textAlign:'center', color:'#64748b'}}>
          Loading station data...
        </p>
      </div>
    </div>
  )

  return (
    <div className="page">
      <div className="container">

        {/* Header */}
        <div style={{
          display:'flex', justifyContent:'space-between',
          alignItems:'flex-start', marginBottom:24, flexWrap:'wrap', gap:12
        }}>
          <div>
            <h1 className="page-title">⛽ Station Dashboard</h1>
            <p className="page-subtitle">
              Real-time demand forecast based on {data?.total_registered_users || 0} registered customers
            </p>
          </div>
          <div style={{display:'flex', gap:10}}>
            <button className="btn btn-outline" onClick={speakSummary}
              style={{padding:'8px 18px', fontSize:'0.88rem'}}>
              🔊 Voice Summary
            </button>
            <button className="btn btn-outline" onClick={sendReport}
              disabled={sending} style={{padding:'8px 18px', fontSize:'0.88rem'}}>
              {sending ? 'Sending...' : '📧 Email Report'}
            </button>
            <button className="btn btn-primary" onClick={loadDashboard}
              style={{padding:'8px 18px', fontSize:'0.88rem', width:'auto'}}>
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* Alert banner */}
        <div className={`alert ${
          data?.critical_count > 0 ? 'alert-danger' :
          data?.urgent_count   > 0 ? 'alert-warning' :
          data?.total_registered_users === 0 ? 'alert-info' : 'alert-success'
        }`} style={{marginBottom:20, fontSize:'1rem'}}>
          {data?.alert_message}
        </div>

        {/* Stat cards */}
        <div className="grid-3" style={{marginBottom:24}}>
          <div className="stat-card">
            <div className="stat-value">{data?.total_registered_users}</div>
            <div className="stat-label">Registered Customers</div>
          </div>
          <div className="stat-card">
            <div className="stat-value"
              style={{color: data?.tomorrow_demand > 0 ? '#dc2626' : '#16a34a'}}>
              {data?.tomorrow_demand}
            </div>
            <div className="stat-label">Cylinders Needed Tomorrow</div>
          </div>
          <div className="stat-card">
            <div style={{display:'flex', justifyContent:'center', gap:12, flexWrap:'wrap'}}>
              <div style={{textAlign:'center'}}>
                <div style={{fontSize:'1.5rem', fontWeight:800, color:'#dc2626'}}>
                  {data?.critical_count}
                </div>
                <div style={{fontSize:'0.75rem', color:'#64748b'}}>Critical</div>
              </div>
              <div style={{textAlign:'center'}}>
                <div style={{fontSize:'1.5rem', fontWeight:800, color:'#d97706'}}>
                  {data?.urgent_count}
                </div>
                <div style={{fontSize:'0.75rem', color:'#64748b'}}>Urgent</div>
              </div>
              <div style={{textAlign:'center'}}>
                <div style={{fontSize:'1.5rem', fontWeight:800, color:'#2563eb'}}>
                  {data?.warning_count}
                </div>
                <div style={{fontSize:'0.75rem', color:'#64748b'}}>Warning</div>
              </div>
            </div>
            <div className="stat-label" style={{marginTop:8}}>Customer Status</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{display:'flex', gap:0, marginBottom:20,
          border:'1px solid #e2e8f0', borderRadius:10, overflow:'hidden',
          width:'fit-content'}}>
          {[
            {key:'forecast', label:'📈 7-Day Forecast'},
            {key:'users',    label:'👥 Customer List'},
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{
                padding:'10px 24px', border:'none', cursor:'pointer',
                fontWeight:600, fontSize:'0.88rem',
                background: tab === t.key ? '#1e3a5f' : 'white',
                color:      tab === t.key ? 'white'   : '#64748b',
                transition: 'all 0.2s',
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── TAB: Forecast ── */}
        {tab === 'forecast' && (
          <>
            {/* Bar chart */}
            <div className="card" style={{marginBottom:20}}>
              <div className="card-title">
                📊 Cylinders Needed Per Day
                <span style={{fontSize:'0.8rem', fontWeight:400,
                  color:'#64748b', marginLeft:8}}>
                  (based on real customer depletion dates)
                </span>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data?.forecast}
                  margin={{top:5, right:20, left:0, bottom:5}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="day_label" tick={{fontSize:12}} />
                  <YAxis
                    tick={{fontSize:12}}
                    allowDecimals={false}
                    label={{
                      value:'Cylinders', angle:-90,
                      position:'insideLeft', fontSize:11, fill:'#94a3b8'
                    }}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null
                      const d = payload[0]?.payload
                      return (
                        <div style={{
                          background:'white', border:'1px solid #e2e8f0',
                          borderRadius:8, padding:'12px 16px', fontSize:'0.85rem'
                        }}>
                          <div style={{fontWeight:700, marginBottom:6}}>{label} — {d?.date}</div>
                          <div style={{color:'#1e3a5f'}}>
                            <b>{d?.cylinders_needed}</b> cylinder(s) needed
                          </div>
                          {d?.users_depleting?.length > 0 && (
                            <div style={{marginTop:6, color:'#64748b'}}>
                              Customers: {d.users_depleting.join(', ')}
                            </div>
                          )}
                        </div>
                      )
                    }}
                  />
                  <Bar dataKey="cylinders_needed" fill="#2563eb"
                    radius={[6,6,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Daily breakdown table */}
            <div className="card">
              <div className="card-title">📅 Daily Breakdown</div>
              <table style={{width:'100%', borderCollapse:'collapse', fontSize:'0.88rem'}}>
                <thead>
                  <tr style={{background:'#f8fafc'}}>
                    {['Day','Date','Cylinders Needed','Customers'].map(h => (
                      <th key={h} style={{
                        padding:'10px 14px', textAlign:'left',
                        borderBottom:'2px solid #e2e8f0', color:'#374151',
                        fontSize:'0.82rem'
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data?.forecast.map((row, i) => (
                    <tr key={i} style={{borderBottom:'1px solid #f1f5f9'}}>
                      <td style={{padding:'10px 14px', fontWeight:600}}>
                        {row.day_label}
                      </td>
                      <td style={{padding:'10px 14px', color:'#64748b'}}>
                        {row.date}
                      </td>
                      <td style={{padding:'10px 14px'}}>
                        {row.cylinders_needed > 0 ? (
                          <span style={{
                            fontWeight:700,
                            color: row.cylinders_needed >= 3 ? '#dc2626' :
                                   row.cylinders_needed >= 1 ? '#d97706' : '#16a34a'
                          }}>
                            {row.cylinders_needed} cylinder(s)
                          </span>
                        ) : (
                          <span style={{color:'#94a3b8'}}>None expected</span>
                        )}
                      </td>
                      <td style={{padding:'10px 14px', color:'#64748b', fontSize:'0.82rem'}}>
                        {row.users_depleting.length > 0
                          ? row.users_depleting.join(', ')
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ── TAB: Customer List ── */}
        {tab === 'users' && (
          <div className="card">
            <div className="card-title">
              👥 All Registered Customers
              <span style={{fontSize:'0.82rem', fontWeight:400,
                color:'#64748b', marginLeft:8}}>
                sorted by urgency
              </span>
            </div>

            {data?.user_list?.length === 0 ? (
              <div style={{textAlign:'center', padding:'40px', color:'#94a3b8'}}>
                <div style={{fontSize:'3rem', marginBottom:12}}>👥</div>
                No registered customers yet. They will appear here once they sign up and predict.
              </div>
            ) : (
              <table style={{width:'100%', borderCollapse:'collapse', fontSize:'0.88rem'}}>
                <thead>
                  <tr style={{background:'#f8fafc'}}>
                    {['Customer','Cylinder Size','Days Left','Runs Out On','Status'].map(h => (
                      <th key={h} style={{
                        padding:'10px 14px', textAlign:'left',
                        borderBottom:'2px solid #e2e8f0',
                        color:'#374151', fontSize:'0.82rem'
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data?.user_list.map((user, i) => {
                    const s = URGENCY_STYLE[user.urgency]
                    return (
                      <tr key={i} style={{borderBottom:'1px solid #f1f5f9'}}>
                        <td style={{padding:'10px 14px', fontWeight:600}}>
                          {user.user_name}
                        </td>
                        <td style={{padding:'10px 14px', color:'#64748b'}}>
                          {user.cylinder_size} kg
                        </td>
                        <td style={{padding:'10px 14px'}}>
                          <span style={{
                            fontWeight:700,
                            color: user.days_left <= 1 ? '#dc2626' :
                                   user.days_left <= 3 ? '#d97706' :
                                   user.days_left <= 7 ? '#2563eb' : '#16a34a'
                          }}>
                            {user.days_left <= 0
                              ? 'TODAY'
                              : `${user.days_left} day${user.days_left !== 1 ? 's' : ''}`}
                          </span>
                        </td>
                        <td style={{padding:'10px 14px', color:'#64748b'}}>
                          {user.depletion_date}
                        </td>
                        <td style={{padding:'10px 14px'}}>
                          <span style={{
                            display:'inline-block',
                            padding:'3px 10px', borderRadius:20,
                            fontSize:'0.75rem', fontWeight:600,
                            background: s.bg,
                            border: `1px solid ${s.border}`,
                            color: s.color,
                          }}>
                            {s.label}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

      </div>
    </div>
  )
}