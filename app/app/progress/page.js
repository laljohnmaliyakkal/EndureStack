'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../components/AuthProvider'

export default function ProgressPage() {
    const { user } = useAuth()
    const [stats, setStats] = useState([])

    useEffect(() => {
        if (user) {
            const fetchStats = async () => {
                const { data, error } = await supabase
                    .from('daily_workout_stats')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('session_date', { ascending: false })

                if (data) setStats(data)
            }
            fetchStats()
        }
    }, [user])

    return (
        <div>
            <h1 style={{ marginBottom: '1.5rem' }}>Your Progress</h1>

            <div className="card">
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
                        {stats.length === 0 && (
                            <tr>
                                <td colSpan={4} style={{ padding: '1rem', textAlign: 'center', color: 'var(--secondary)' }}>
                                    No workout data yet.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
