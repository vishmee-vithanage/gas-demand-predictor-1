// src/pages/Household.jsx
import { useState } from 'react'
import API from '../api'
import toast from 'react-hot-toast'

const LABELS = {
  area_type:          ['Urban', 'Semi-urban', 'Rural'],
  residence_type:     ['Single House', 'Apartment', 'Shared Housing'],
  cooking_frequency:  ['Once a day', 'Twice a day', 'Three times', 'More than three'],
  primary_usage:      ['Breakfast only', 'Lunch & dinner', 'Full-day cooking', 'Water heating', 'Home business'],
  weather_influence:  ['None', 'Low', 'Medium', 'High'],
  weather_impact_type:['No change', 'Rainy days', 'Cold days'],
  guest_impact:       ['Never', 'Rarely', 'Sometimes', 'Very often'],
}

export default function Household() {
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  const [form, setForm] = useState({
    cylinder_size_kg:   12.5,
    household_size:     3,
    avg_daily_hours:    2,
    purchase_date:      new Date().toISOString().split('T')[0],
    cooking_frequency:  1,
    area_type:          0,
    residence_type:     0,
    primary_usage:      1,
    weather_influence:  0,
    weather_impact_type:0,
    guest_impact:       1,
  })

  const [result, setResult]   = useState(null)
  const [loading, setLoading] = useState(false)

  function set(key, val) { setForm(f => ({...f, [key]: val})) }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = { ...form, user_id: user.id || 'guest' }
      const res = await API.post('/household/predict', payload)
      setResult(res.data)
      toast.success('Prediction complete!')
      // Voice alert
      if ('speechSynthesis' in window) {
        const msg = new SpeechSynthesisUtterance(
          `Based on your usage pattern, your gas cylinder is expected to deplete in ${res.data.weather_adjusted_days} days.`
        )
        window.speechSynthesis.speak(msg)
      }
    } catch (err) {
      toast.error('Prediction failed. Is the backend running?')
    } finally { setLoading(false) }
  }

  function getAlertClass(days) {
    if (days <= 3)  return 'alert alert-danger'
    if (days <= 7)  return 'alert alert-warning'
    return 'alert alert-success'
  }

  return (
    <div className="page">
      <div className="container">
        <h1 className="page-title">🏠 Household Gas Predictor</h1>
        <p className="page-subtitle">Enter your gas usage details to get a depletion prediction</p>

        <div className="grid-2" style={{alignItems:'start'}}>
          {/* Form */}
          <div className="card">
            <div className="card-title">📋 Your Usage Details</div>
            <form onSubmit={handleSubmit}>

              <div className="form-group">
                <label>Cylinder Size</label>
                <select className="form-control" value={form.cylinder_size_kg}
                  onChange={e => set('cylinder_size_kg', parseFloat(e.target.value))}>
                  <option value={5}>5 kg</option>
                  <option value={12.5}>12.5 kg</option>
                  <option value={37.5}>37.5 kg</option>
                </select>
              </div>

              <div className="form-group">
                <label>Purchase Date</label>
                <input type="date" className="form-control" value={form.purchase_date}
                  onChange={e => set('purchase_date', e.target.value)} />
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label>Household Size</label>
                  <select className="form-control" value={form.household_size}
                    onChange={e => set('household_size', parseInt(e.target.value))}>
                    {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} {n===6?'(5+)':''} people</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Daily Cooking Hours</label>
                  <select className="form-control" value={form.avg_daily_hours}
                    onChange={e => set('avg_daily_hours', parseFloat(e.target.value))}>
                    <option value={0.5}>Less than 1 hr</option>
                    <option value={2}>About 2 hrs</option>
                    <option value={4}>About 4 hrs</option>
                    <option value={5}>More than 4 hrs</option>
                  </select>
                </div>
              </div>

              {[
                ['Area Type',          'area_type'],
                ['Residence Type',     'residence_type'],
                ['Cooking Frequency',  'cooking_frequency'],
                ['Primary Usage',      'primary_usage'],
                ['Weather Sensitivity','weather_influence'],
                ['Weather Impact',     'weather_impact_type'],
                ['Guest Impact',       'guest_impact'],
              ].map(([label, key]) => (
                <div className="form-group" key={key}>
                  <label>{label}</label>
                  <select className="form-control" value={form[key]}
                    onChange={e => set(key, parseInt(e.target.value))}>
                    {LABELS[key].map((opt, i) => (
                      <option key={i} value={i}>{opt}</option>
                    ))}
                  </select>
                </div>
              ))}

              <button className="btn btn-primary" disabled={loading}>
                {loading ? '⏳ Predicting...' : '🔮 Predict Depletion Date'}
              </button>
            </form>
          </div>

          {/* Result */}
          <div>
            {result ? (
              <div className="card">
                <div className="card-title">📊 Prediction Result</div>

                <div className={getAlertClass(result.days_left)}>
                  {result.alert_message}
                </div>

                <div className="grid-2" style={{marginTop:16}}>
                  <div className="stat-card">
                    <div className="stat-value">{result.weather_adjusted_days}</div>
                    <div className="stat-label">Days Until Empty</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{result.days_left}</div>
                    <div className="stat-label">Days Remaining</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{result.cylinder_size_kg}kg</div>
                    <div className="stat-label">Cylinder Size</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value" style={{fontSize:'1.2rem'}}>
                      {new Date(result.depletion_date).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}
                    </div>
                    <div className="stat-label">Expected Runout</div>
                  </div>
                </div>

                <div style={{marginTop:16, padding:'12px 16px', background:'#f8fafc', borderRadius:8}}>
                  <div style={{fontSize:'0.82rem', color:'#64748b', marginBottom:8}}>Model Details</div>
                  <div style={{fontSize:'0.88rem', display:'flex', flexDirection:'column', gap:4}}>
                    <span>📈 Base prediction: <b>{result.predicted_days} days</b></span>
                    <span>🌦️ Weather multiplier: <b>{result.weather_multiplier}x</b></span>
                    <span>📅 Purchase date: <b>{result.purchase_date}</b></span>
                  </div>
                </div>

                <div style={{marginTop:12, padding:'10px 14px', background:'#eff6ff',
                  borderRadius:8, fontSize:'0.85rem', color:'#1e40af'}}>
                  🔊 Voice alert has been triggered automatically
                </div>
              </div>
            ) : (
              <div className="card" style={{textAlign:'center', padding:'48px 24px'}}>
                <div style={{fontSize:'4rem', marginBottom:16}}>⛽</div>
                <div style={{color:'#64748b'}}>
                  Fill in your details on the left and click <b>Predict</b> to see when your gas will run out.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}