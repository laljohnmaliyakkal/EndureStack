'use client'

import { useState, useEffect, use } from 'react'
import { supabase } from '../../../../../../lib/supabase'
import Link from 'next/link'

export default function SchedulePage({ params }) {
    const { id: clientId } = use(params)
    const [schedule, setSchedule] = useState([])
    const [clientName, setClientName] = useState('')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchSchedule = async () => {
            // 1. Get Client Name
            const { data: profile } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('user_id', clientId)
                .single()

            if (profile) setClientName(profile.full_name)

            // 2. Generate next 6 days
            const days = []
            const today = new Date()

            for (let i = 0; i < 6; i++) {
                const d = new Date(today)
                d.setDate(today.getDate() + i)
                days.push({
                    date: d.toISOString().split('T')[0],
                    display: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
                    isToday: i === 0
                })
            }

            // 3. Check for existing sessions
            const { data: sessions } = await supabase
                .from('workout_sessions')
                .select('session_date, id')
                .eq('user_id', clientId)
                .in('session_date', days.map(d => d.date))

            // 4. Merge data
            const scheduleData = days.map(day => {
                const session = sessions?.find(s => s.session_date === day.date)
                return {
                    ...day,
                    sessionId: session?.id || null
                }
            })

            setSchedule(scheduleData)
            setLoading(false)
        }

        fetchSchedule()
    }, [clientId])

    if (loading) return <div>Loading schedule...</div>

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <Link href="/app/trainer/users" className="btn" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border)', color: 'var(--foreground)', display: 'inline-block', marginBottom: '1.5rem' }}>
                &larr; Back to Clients
            </Link>

            <h1 style={{ marginBottom: '2rem' }}>Schedule for {clientName}</h1>

            <div className="card">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    {schedule.map(day => (
                        <div key={day.date} style={{
                            padding: '1rem',
                            backgroundColor: '#0f172a',
                            border: `1px solid ${day.isToday ? 'var(--primary)' : 'var(--border)'}`,
                            borderRadius: '0.5rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1rem'
                        }}>
                            <div>
                                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>{day.display}</h3>
                                {day.isToday && <span style={{ fontSize: '0.8rem', color: 'var(--primary)' }}>Today</span>}
                            </div>

                            {day.sessionId ? (
                                <Link href={`/app/workouts/log?userId=${clientId}&date=${day.date}`} style={{
                                    display: 'block',
                                    textAlign: 'center',
                                    padding: '0.5rem',
                                    backgroundColor: '#0f766e',
                                    color: 'white',
                                    borderRadius: '0.25rem',
                                    marginTop: 'auto',
                                    textDecoration: 'none'
                                }}>
                                    Edit Workout
                                </Link>
                            ) : (
                                <Link href={`/app/workouts/log?userId=${clientId}&date=${day.date}`} style={{
                                    display: 'block',
                                    textAlign: 'center',
                                    padding: '0.5rem',
                                    border: '1px dashed var(--secondary)',
                                    color: 'var(--secondary)',
                                    borderRadius: '0.25rem',
                                    marginTop: 'auto',
                                    textDecoration: 'none'
                                }}>
                                    Schedule
                                </Link>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
