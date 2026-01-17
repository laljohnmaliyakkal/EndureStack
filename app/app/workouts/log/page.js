'use client'

import { useState, useEffect, Suspense, useMemo } from 'react'
import { supabase } from '../../../../lib/supabase'
import { useAuth } from '../../../../components/AuthProvider'
import { useSearchParams, useRouter } from 'next/navigation'

function Logger() {
    const { user } = useAuth()
    const searchParams = useSearchParams()
    const router = useRouter()

    const targetUserId = searchParams.get('userId') || user?.id
    const urlDate = searchParams.get('date')
    const [date, setDate] = useState(urlDate || new Date().toISOString().split('T')[0])
    const [sessionId, setSessionId] = useState(null)
    const [logs, setLogs] = useState([])
    const [loading, setLoading] = useState(false)

    // Catalog Data
    const [availableWorkouts, setAvailableWorkouts] = useState([])
    const [muscleGroups, setMuscleGroups] = useState([])

    // Form Selection
    const [selectedMuscle, setSelectedMuscle] = useState('')
    const [selectedExercise, setSelectedExercise] = useState('')

    const [reps, setReps] = useState('')
    const [weight, setWeight] = useState('')
    const [setNumber, setSetNumber] = useState(1)

    // Fetch Workouts Catalog
    useEffect(() => {
        const fetchCatalog = async () => {
            const { data } = await supabase.from('workouts').select('*')
            if (data) {
                setAvailableWorkouts(data)
                const groups = [...new Set(data.map(w => w.muscle_group))].sort()
                setMuscleGroups(groups)
            }
        }
        fetchCatalog()
    }, [])

    // Filter exercises based on muscle group
    const filteredExercises = useMemo(() => {
        if (!selectedMuscle) return []
        return availableWorkouts.filter(w => w.muscle_group === selectedMuscle)
    }, [selectedMuscle, availableWorkouts])

    // Fetch or Create Session
    useEffect(() => {
        if (!targetUserId) return

        const getSession = async () => {
            const { data, error } = await supabase
                .from('workout_sessions')
                .select('id')
                .eq('user_id', targetUserId)
                .eq('session_date', date)
                .single()

            if (data) {
                setSessionId(data.id)
                fetchLogs(data.id)
            } else {
                setSessionId(null)
                setLogs([])
            }
        }
        getSession()
    }, [date, targetUserId])

    const fetchLogs = async (sId) => {
        const { data } = await supabase
            .from('workout_logs')
            .select('*')
            .eq('session_id', sId)
            .order('created_at', { ascending: true })
        if (data) {
            setLogs(data)
        }
    }

    const handleAddSet = async (e) => {
        e.preventDefault()
        if (!selectedExercise) return

        setLoading(true)

        try {
            let currentSessionId = sessionId

            // Create session if first log
            if (!currentSessionId) {
                const { data: newSession, error: sessionError } = await supabase
                    .from('workout_sessions')
                    .insert([{ user_id: targetUserId, session_date: date }])
                    .select()
                    .single()

                if (sessionError) throw sessionError
                currentSessionId = newSession.id
                setSessionId(currentSessionId)
            }

            // Add Log
            const { error: logError } = await supabase
                .from('workout_logs')
                .insert([{
                    session_id: currentSessionId,
                    workout_name: selectedExercise,
                    set_number: setNumber,
                    reps: parseInt(reps),
                    weight: parseFloat(weight),
                    updated_by: user.id
                }])

            if (logError) throw logError

            // Don't reset exercise so they can log next set easily
            setSetNumber(prev => prev + 1)
            fetchLogs(currentSessionId)
        } catch (err) {
            alert('Error logging set: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <h1 style={{ marginBottom: '1.5rem' }}>Log Workout</h1>

            <div className="card" style={{ marginBottom: '2rem' }}>
                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>Date</label>
                    <input
                        type="date"
                        className="input"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                    />
                </div>

                <form onSubmit={handleAddSet}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Muscle Group</label>
                            <select
                                className="input"
                                value={selectedMuscle}
                                onChange={e => {
                                    setSelectedMuscle(e.target.value)
                                    setSelectedExercise('') // Reset exercise when muscle changes
                                }}
                                required
                            >
                                <option value="">Select Muscle</option>
                                {muscleGroups.map(g => (
                                    <option key={g} value={g}>{g}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Exercise</label>
                            <select
                                className="input"
                                value={selectedExercise}
                                onChange={e => setSelectedExercise(e.target.value)}
                                required
                                disabled={!selectedMuscle}
                            >
                                <option value="">Select Exercise</option>
                                {filteredExercises.map(ex => (
                                    <option key={ex.id} value={ex.name}>{ex.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Reps</label>
                            <input
                                type="number"
                                className="input"
                                value={reps}
                                onChange={e => setReps(e.target.value)}
                                required
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Weight (kg)</label>
                            <input
                                type="number"
                                className="input"
                                value={weight}
                                onChange={e => setWeight(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <button type="submit" className="btn" style={{ width: '100%', marginTop: '1rem' }} disabled={loading}>
                        {loading ? 'Saving...' : 'Add Set'}
                    </button>
                </form>
            </div>

            <div style={{ display: 'grid', gap: '0.5rem' }}>
                {logs.map(log => (
                    <div key={log.id} style={{
                        backgroundColor: 'var(--card-bg)',
                        padding: '1rem',
                        borderRadius: '0.375rem',
                        border: '1px solid var(--border)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <div>
                            <span style={{ fontWeight: 'bold' }}>{log.workout_name}</span>
                            <div style={{ color: 'var(--secondary)', fontSize: '0.9rem' }}>
                                {log.reps} reps @ {log.weight}kg
                            </div>
                        </div>
                        <span style={{ color: 'var(--secondary)' }}>Set {log.set_number || 1}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default function LogPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <Logger />
        </Suspense>
    )
}
