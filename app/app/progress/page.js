'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../components/AuthProvider'
import { getOverloadRecommendation, evaluateProgress, detectSystemicFatigue } from '../../../lib/progressiveOverload'

export default function ProgressPage() {
    const { user } = useAuth()
    const [stats, setStats] = useState([])
    const [selectedMuscle, setSelectedMuscle] = useState('All')
    const [muscleGroups, setMuscleGroups] = useState([])
    const [recommendations, setRecommendations] = useState([])
    const [systemicFatigue, setSystemicFatigue] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (user) {
            Promise.all([fetchStats(), fetchAnalysis()]).finally(() => setLoading(false))
        }
    }, [user])

    const fetchStats = async () => {
        const { data } = await supabase
            .from('daily_workout_stats')
            .select('*')
            .eq('user_id', user.id)
            .order('session_date', { ascending: false })
            .limit(10)
        if (data) setStats(data)
    }

    const fetchAnalysis = async () => {
        // 0. Fetch Workouts Catalog for mapping
        const { data: catalog } = await supabase.from('workouts').select('name, muscle_group')
        const exerciseMap = {}
        if (catalog) {
            catalog.forEach(w => {
                exerciseMap[w.name] = w.muscle_group || 'Other'
            })
        }

        // 1. Fetch User Sessions first to get IDs and Dates
        const { data: sessions, error: sessionError } = await supabase
            .from('workout_sessions')
            .select('id, session_date')
            .eq('user_id', user.id)
            .order('session_date', { ascending: false })

        if (sessionError || !sessions || sessions.length === 0) return

        const sessionMap = {}
        const sessionIds = sessions.map(s => {
            sessionMap[s.id] = s.session_date
            return s.id
        })

        // 2. Fetch Logs for these sessions
        const { data: logs, error: logsError } = await supabase
            .from('workout_logs')
            .select('*')
            .in('session_id', sessionIds)
            .order('created_at', { ascending: false })

        if (logsError || !logs) return

        // 3. Attach date to logs manually
        const enrichedLogs = logs.map(log => ({
            ...log,
            workout_sessions: {
                session_date: sessionMap[log.session_id]
            }
        }))

        // 4. Group by Exercise
        const exercises = {}

        enrichedLogs.forEach(log => {
            const name = log.workout_name
            const date = log.workout_sessions?.session_date

            if (!exercises[name]) exercises[name] = {}
            if (!exercises[name][date]) exercises[name][date] = []

            exercises[name][date].push(log)
        })

        // 5. Run Analysis
        const analyzedData = []

        Object.entries(exercises).forEach(([name, dateObj]) => {
            // Convert date map to array of sessions sorted by date desc
            const history = Object.entries(dateObj)
                .map(([date, sets]) => ({ date, sets }))
                .sort((a, b) => new Date(b.date) - new Date(a.date))

            // Config: Default to 8-12 rep range, 2.5kg increment
            const config = { minReps: 12, maxReps: 15, incrementKg: 2.5 }
            const recommendation = getOverloadRecommendation(history, config)

            // Get last session comparison for context
            let progressContext = null
            if (history.length >= 2) {
                progressContext = evaluateProgress(history[0].sets, history[1].sets)
            }

            analyzedData.push({
                name,
                muscleGroup: exerciseMap[name] || 'Other',
                recommendation,
                lastSession: history[0],
                progressContext
            })
        })

        // Check Systemic Fatigue
        const isFatigued = detectSystemicFatigue(analyzedData)
        setSystemicFatigue(isFatigued)

        // Extract Muscle Groups for Filter
        const groups = ['All', ...new Set(analyzedData.map(d => d.muscleGroup))].sort()
        setMuscleGroups(groups)

        setRecommendations(analyzedData.sort((a, b) => a.name.localeCompare(b.name)))
    }

    const filteredRecommendations = selectedMuscle === 'All'
        ? recommendations
        : recommendations.filter(rec => rec.muscleGroup === selectedMuscle)

    const getRecColor = (type) => {
        switch (type) {
            case 'weight': return 'var(--primary)' // Orange - Intensity
            case 'reps': return '#34c759' // Green - Volume
            case 'deload': return '#5856D6' // Purple - Recovery
            case 'maintain': return 'var(--secondary)' // Gray
            default: return 'var(--foreground)'
        }
    }

    return (
        <div style={{ paddingBottom: '4rem' }}>
            <h1 style={{ marginBottom: '2rem', fontWeight: 'bold' }}>Progress & Recommendations</h1>

            {/* Muscle Group Filter */}
            {!loading && recommendations.length > 0 && (
                <div style={{ marginBottom: '2rem', overflowX: 'auto', whiteSpace: 'nowrap', paddingBottom: '0.5rem' }}>
                    {muscleGroups.map(group => (
                        <button
                            key={group}
                            onClick={() => setSelectedMuscle(group)}
                            style={{
                                display: 'inline-block',
                                padding: '0.5rem 1rem',
                                marginRight: '0.5rem',
                                borderRadius: '20px',
                                border: 'none',
                                background: selectedMuscle === group ? 'var(--primary)' : 'var(--secondary-bg)',
                                color: selectedMuscle === group ? 'white' : 'var(--foreground)',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                fontSize: '0.9rem',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            {group}
                        </button>
                    ))}
                </div>
            )}

            {loading ? (
                <p>Analyzing workout data...</p>
            ) : (
                <>
                    {/* Systemic Fatigue Warning */}
                    {systemicFatigue && (
                        <div className="card" style={{
                            marginBottom: '2rem',
                            borderLeft: '4px solid var(--danger)',
                            backgroundColor: '#fff5f5'
                        }}>
                            <h3 style={{ color: 'var(--danger)', marginBottom: '0.5rem' }}>⚠️ Systemic Fatigue Detected</h3>
                            <p style={{ fontSize: '0.9rem' }}>
                                A significant number of your exercises are regressing. You may be overtraining.
                                Consider a deload week or extra rest days.
                            </p>
                        </div>
                    )}

                    {/* Recommendations Grid */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h2 style={{ fontSize: '1.25rem', color: 'var(--secondary)', margin: 0 }}>Next Session Targets</h2>
                        <span style={{ fontSize: '0.9rem', color: 'var(--secondary)' }}>{filteredRecommendations.length} Exercises</span>
                    </div>

                    {recommendations.length === 0 ? (
                        <div className="card" style={{ padding: '2rem', textAlign: 'center', marginBottom: '3rem' }}>
                            <p>No enough data to generate recommendations. Log more workouts!</p>
                        </div>
                    ) : filteredRecommendations.length === 0 ? (
                        <div className="card" style={{ padding: '2rem', textAlign: 'center', marginBottom: '3rem' }}>
                            <p>No exercises found for {selectedMuscle}.</p>
                        </div>
                    ) : (
                        <div className="workout-details-grid" style={{ marginBottom: '3rem' }}>
                            {filteredRecommendations.map((rec) => (
                                <div key={rec.name} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: `4px solid ${getRecColor(rec.recommendation.type)}` }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                        <h3 style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{rec.name}</h3>
                                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                            {Array.isArray(rec.recommendation.prInfo) && rec.recommendation.prInfo.map((pr, idx) => (
                                                <span key={idx} style={{ fontSize: '0.7rem', background: 'gold', color: 'black', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }} title={pr.value}>
                                                    🏆 {pr.type} PR
                                                </span>
                                            ))}
                                            {!Array.isArray(rec.recommendation.prInfo) && rec.recommendation.prInfo && (
                                                <span style={{ fontSize: '0.7rem', background: 'gold', color: 'black', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                                                    🏆 PR
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        <div style={{
                                            display: 'inline-block',
                                            padding: '0.25rem 0.5rem',
                                            borderRadius: '4px',
                                            background: `${getRecColor(rec.recommendation.type)}20`,
                                            color: getRecColor(rec.recommendation.type),
                                            fontWeight: 'bold',
                                            fontSize: '0.8rem',
                                            width: 'fit-content',
                                        }}>
                                            {rec.recommendation.type.toUpperCase()}
                                        </div>

                                        {rec.recommendation.confidence && (
                                            <div style={{
                                                display: 'inline-block',
                                                padding: '0.25rem 0.5rem',
                                                borderRadius: '4px',
                                                background: '#f2f2f7',
                                                color: rec.recommendation.confidence === 'high' ? 'var(--success)' :
                                                    rec.recommendation.confidence === 'moderate' ? 'var(--warning)' : 'var(--secondary)',
                                                fontWeight: 'bold',
                                                fontSize: '0.8rem',
                                                width: 'fit-content',
                                            }}>
                                                {rec.recommendation.confidence.toUpperCase()} CONFIDENCE
                                            </div>
                                        )}
                                    </div>

                                    {rec.recommendation.target && (
                                        <div style={{ padding: '0.5rem', background: 'var(--secondary-bg)', borderRadius: '8px', marginTop: '0.5rem' }}>
                                            <p style={{ fontSize: '0.8rem', color: 'var(--secondary)', marginBottom: '0.25rem' }}>NEXT TARGET</p>
                                            <p style={{ fontWeight: 'bold', fontSize: '1rem' }}>
                                                {rec.recommendation.target.weight}kg <span style={{ color: 'var(--secondary)', fontWeight: 'normal' }}>x</span> {rec.recommendation.target.sets || '3'} <span style={{ color: 'var(--secondary)', fontWeight: 'normal' }}>sets x</span> {rec.recommendation.target.reps} <span style={{ color: 'var(--secondary)', fontWeight: 'normal' }}>reps</span>
                                            </p>
                                        </div>
                                    )}

                                    <p style={{ fontSize: '0.9rem', color: 'var(--foreground)', lineHeight: '1.4', marginTop: '0.5rem' }}>
                                        {rec.recommendation.explanation}
                                    </p>

                                    {rec.progressContext && (
                                        <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border)', fontSize: '0.8rem', color: 'var(--secondary)' }}>
                                            Last Session:
                                            <span style={{
                                                color: rec.progressContext.status === 'progress' ? 'var(--success)' :
                                                    rec.progressContext.status === 'regression' ? 'var(--danger)' :
                                                        'var(--warning)',
                                                marginLeft: '0.5rem',
                                                fontWeight: 'bold'
                                            }}>
                                                {rec.progressContext.status.toUpperCase()}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Stats Table */}
                    <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--secondary)' }}>History Overview</h2>
                    <div className="card" style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--foreground)' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                                    <th style={{ padding: '0.75rem' }}>Date</th>
                                    <th style={{ padding: '0.75rem' }}>Sets</th>
                                    <th style={{ padding: '0.75rem' }}>Reps</th>
                                    <th style={{ padding: '0.75rem' }}>Volume (kg)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.map((stat, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '0.75rem' }}>{new Date(stat.session_date).toLocaleDateString()}</td>
                                        <td style={{ padding: '0.75rem' }}>{stat.total_sets}</td>
                                        <td style={{ padding: '0.75rem' }}>{stat.total_reps}</td>
                                        <td style={{ padding: '0.75rem' }}>{stat.total_volume}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    )
}
