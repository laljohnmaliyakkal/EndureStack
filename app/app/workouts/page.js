'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../components/AuthProvider'
import Link from 'next/link'

export default function WorkoutsPage() {
    const { user } = useAuth()
    const [sessions, setSessions] = useState([])

    useEffect(() => {
        if (user) {
            const fetchSessions = async () => {
                const { data } = await supabase
                    .from('workout_sessions')
                    .select('*, workout_logs(*)')
                    .eq('user_id', user.id)
                    .order('session_date', { ascending: false })

                if (data) setSessions(data)
            }
            fetchSessions()
        }
    }, [user?.id])

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h1>My Workouts</h1>
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
        </div>
    )
}
