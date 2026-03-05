// src/pages/Station.jsx
import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import API from '../api'
import toast from 'react-hot-toast'

export default function Station() {
  const [stations,  setStations]  = useState([])
  const [selected,  setSelected]  = useState('STN_001')
  const [forecast,  setForecast]  = useState(null)
  const [loading,   setLoading]   = useState(false)

  useEffect(() => {
    API.get('/station/list').then(r => setStations(r.data.stations))
  }, [])

  useEffect(() => { loadForecast(selected) }, [selected])

  async function loadForecast(stationId) {
    setLoading(true)
    try {
      const res = await API.get(`/station/forecast/${stationId}`)
      setForecast(res.data)
    } catch {
      toast.error('Failed to load forecast')
    } finally { setLoading(false) }
  }

  function speakAlert() {
    if (!forecast) return
    if ('speechSynthesis' in window) {
      const msg = new SpeechSynthesisUtterance(
        `Station ${selected} forecast: Expected average of ${Math.round(forecast.avg_daily)} cylinders per day over the next 7 days. Total expected demand is ${forecast.total_7_day} cylinders.`
      )
      window.speechSynthesis.speak(msg)
      toast.success('Voice alert triggered!')
    }
  }

  function getAlertClass(msg) {
    if (msg?.includes('URGENT') || msg?.includes('HIGH')) return 'alert alert-danger'
    if (msg?.includes('WARNING') || msg?.includes('MODERATE')) return 'alert alert-warning'
    return 'alert alert-success'
  }

  const typeBadge = { Urban: 'badge-blue', 'Semi-urban': 'badge-orange', Rural: 'badge-green' }

  return (
    <div className="page">
      <div className="container">
        <h1 className="page-title">📊 Station Operator Dashboard</h1>
        <p className="page-subtitle">7-day demand forecast for your gas station</p>

        {/* Station selector */}
        <div className="card" style={{marginBottom: 20}}>
          <div className="card-title">Select Station</div>
          <div style={{display:'flex', flexWrap:'wrap', gap:10}}>
            {stations.map(s => (
              <button key={s.station_id} onClick={() => setSelected(s.station_id)}
                className="btn" style={{
                  background: selected === s.station_id ? '#1e3a5f' : 'white',
                  color:      selected === s.station_id ? 'white'   : '#1e3a5f',
                  border:     '1px solid #e2e8f0',
                  padding:    '8px 16px',
                  fontSize:   '0.85rem',
                }}>
                {s.station_id}
                <span className={`badge ${typeBadge[s.type] || 'badge-blue'}`}
                  style={{marginLeft:6}}>{s.type}</span>
              </button>
            ))}
          </div>
        </div>

        {loading && <div className="spinner" />}

        {forecast && !loading && (
          <>
            {/* Alert */}
            <div className={getAlertClass(forecast.alert_message)}>
              {forecast.alert_message}
            </div>

            {/* Stats row */}
            <div className="grid-3" style={{marginBottom:20}}>
              <div className="stat-card">
                <div className="stat-value">{Math.round(forecast.avg_daily)}</div>
                <div className="stat-label">Avg Cylinders/Day</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{forecast.total_7_day}</div>
                <div className="stat-label">Total 7-Day Demand</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">
                  <span className={`badge ${typeBadge[forecast.station_type]||'badge-blue'}`}
                    style={{fontSize:'1rem', padding:'6px 14px'}}>
                    {forecast.station_type}
                  </span>
                </div>
                <div className="stat-label">Station Type</div>
              </div>
            </div>

            {/* Bar chart */}
            <div className="card" style={{marginBottom:20}}>
              <div className="card-title">📈 7-Day Demand Forecast</div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={forecast.forecast} margin={{top:5,right:20,left:0,bottom:5}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="day_label" tick={{fontSize:12}} />
                  <YAxis tick={{fontSize:12}} />
                  <Tooltip
                    formatter={(val) => [`${val} cylinders`, 'Predicted Sales']}
                    contentStyle={{borderRadius:8, border:'1px solid #e2e8f0'}}
                  />
                  <Bar dataKey="predicted_sales" fill="#2563eb" radius={[6,6,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Line chart */}
            <div className="card" style={{marginBottom:20}}>
              <div className="card-title">📉 Sales Trend</div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={forecast.forecast}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="day_label" tick={{fontSize:12}} />
                  <YAxis tick={{fontSize:12}} />
                  <Tooltip contentStyle={{borderRadius:8}} />
                  <Line type="monotone" dataKey="predicted_sales"
                    stroke="#16a34a" strokeWidth={2} dot={{r:5}} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Daily breakdown table */}
            <div className="card" style={{marginBottom:20}}>
              <div className="card-title">📅 Daily Breakdown</div>
              <table style={{width:'100%', borderCollapse:'collapse', fontSize:'0.9rem'}}>
                <thead>
                  <tr style={{background:'#f8fafc'}}>
                    {['Day','Date','Predicted Sales','Stock Needed'].map(h => (
                      <th key={h} style={{padding:'10px 14px', textAlign:'left',
                        borderBottom:'1px solid #e2e8f0', color:'#374151'}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {forecast.forecast.map((row, i) => (
                    <tr key={i} style={{borderBottom:'1px solid #f1f5f9'}}>
                      <td style={{padding:'10px 14px', fontWeight:600}}>{row.day_label}</td>
                      <td style={{padding:'10px 14px', color:'#64748b'}}>{row.date}</td>
                      <td style={{padding:'10px 14px'}}>
                        <span style={{fontWeight:700, color:'#1e3a5f'}}>{row.predicted_sales}</span>
                        <span style={{color:'#94a3b8', marginLeft:4}}>cylinders</span>
                      </td>
                      <td style={{padding:'10px 14px', color:'#16a34a', fontWeight:600}}>
                        {Math.ceil(row.predicted_sales * 1.1)} (with 10% buffer)
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Voice alert button */}
            <div className="card" style={{textAlign:'center'}}>
              <div className="card-title">🔊 Voice Alert</div>
              <p style={{color:'#64748b', marginBottom:16, fontSize:'0.9rem'}}>
                Click to hear the forecast summary read aloud
              </p>
              <button className="btn btn-outline" onClick={speakAlert}
                style={{padding:'12px 32px', fontSize:'1rem'}}>
                🔊 Play Voice Summary
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}