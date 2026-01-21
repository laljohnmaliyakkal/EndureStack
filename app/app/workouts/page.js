'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../components/AuthProvider'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function WorkoutsContent() {
    const { user } = useAuth()
    const searchParams = useSearchParams()
    const filter = searchParams.get('filter')
    const [sessions, setSessions] = useState([])

    useEffect(() => {
        if (user) {
            console.log('Filtering workouts with:', filter)
            const fetchSessions = async () => {
                let query = supabase
                    .from('workout_sessions')
                    .select('*, workout_logs(*)')
                    .eq('user_id', user.id)

                const today = new Date().toISOString().split('T')[0]
                console.log('Comparison Date (Today):', today)

                if (filter === 'future') {
                    console.log('Applying FUTURE filter')
                    query = query.gt('session_date', today)
                } else if (filter === 'completed') {
                    console.log('Applying COMPLETED filter')
                    query = query.lte('session_date', today)
                }

                const { data, error } = await query.order('session_date', { ascending: false })

                if (error) console.error('Supabase Error:', error)
                if (data) {
                    console.log(`Fetched ${data.length} sessions`)
                    setSessions(data)
                }
            }
            fetchSessions()
        }
    }, [user?.id, filter])

    const getTitle = () => {
        if (filter === 'future') return 'Upcoming Workouts'
        if (filter === 'completed') return 'Completed Workouts'
        return 'My Workouts'
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {(filter === 'future' || filter === 'completed') && (
                        <Link href="/app/dashboard" style={{ textDecoration: 'none', color: 'var(--secondary)', fontSize: '1.5rem' }}>
                            &larr;
                        </Link>
                    )}
                    <h1>{getTitle()} (Debug: {filter || 'None'})</h1>
                </div>
                <Link href="/app/workouts/log" className="btn">
                    Log Workout
                </Link>
            </div>

            <div style={{ display: 'grid', gap: '1rem' }}>
                {sessions.map(session => (
                    <Link href={`/app/workouts/${session.id}`} key={session.id} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div className="card" style={{ cursor: 'pointer', transition: 'transform 0.2s', ':hover': { transform: 'translateY(-2px)' } }}>
                            <h3 style={{ marginBottom: '0.5rem', color: 'var(--primary)' }}>
                                {new Date(session.session_date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </h3>
                            <div style={{ marginBottom: '0.5rem' }}>
                                <span style={{ color: 'var(--secondary)' }}>Sets: </span>
                                {session.workout_logs?.length || 0}
                            </div>

                            <div style={{ fontSize: '0.9rem', color: 'var(--secondary)' }}>
                                {/* Unique workout names */}
                                {[...new Set(session.workout_logs?.map(l => l.workout_name))].join(', ')}
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
            {sessions.length === 0 && (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--secondary)' }}>
                    {filter === 'future' ? 'No upcoming workouts scheduled.' : 'No workouts found.'}
                </div>
            )}
        </div>
    )
}

export default function WorkoutsPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <WorkoutsContent />
        </Suspense>
    )
}
