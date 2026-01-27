'use client'

import { useState, useEffect } from 'react'
import Avatar from '../../../components/Avatar'
import { useAuth } from '../../../components/AuthProvider'
import { supabase } from '../../../lib/supabase'
import Link from 'next/link'

export default function Dashboard() {
    const { profile, user } = useAuth()
    const [stats, setStats] = useState({
        gyms: 0,
        gymName: '',
        trainers: 0,
        clients: 0,
        daysTrained: 0,
        trainer: null
    })
    const [trainerStats, setTrainerStats] = useState([])

    useEffect(() => {
        const fetchStats = async () => {
            if (profile?.role === 'admin' && user) {
                // 1. Fetch Gyms owned by admin
                const { data: gyms, error: gymError } = await supabase
                    .from('profiles')
                    .select('gym_id')
                    .eq('user_id', user.id)

                if (gyms) {
                    const gymIds = gyms.map(g => g.gym_id)
                    const gymCount = gyms.length

                    let fetchedGymName = ''
                    if (gymIds.length > 0) {
                        const { data: gymData } = await supabase
                            .from('gyms')
                            .select('name')
                            .eq('id', gymIds[0]) // Assuming first gym for now
                            .single()
                        if (gymData) fetchedGymName = gymData.name
                    }

                    if (gymIds.length > 0) {
                        // 2. Count Trainers
                        const { count: trainerCount } = await supabase
                            .from('profiles')
                            .select('*', { count: 'exact', head: true })
                            .in('gym_id', gymIds)
                            .eq('role', 'trainer')

                        // 3. Count Clients
                        const { count: clientCount } = await supabase
                            .from('profiles')
                            .select('*', { count: 'exact', head: true })
                            .in('gym_id', gymIds)
                            .eq('role', 'user')

                        setStats(prev => ({
                            ...prev,
                            gyms: gymCount,
                            gymName: fetchedGymName,
                            trainers: trainerCount || 0,
                            clients: clientCount || 0
                        }))

                        // 4. Fetch Trainer Performance Stats
                        const { data: perfStats, error: perfError } = await supabase
                            .rpc('get_trainer_stats', { target_gym_id: gymIds[0] })

                        if (perfStats) {
                            setTrainerStats(perfStats)
                        } else if (perfError) {
                            console.error('Error fetching trainer stats:', perfError)
                        }

                    } else {
                        setStats(prev => ({ ...prev, gyms: 0, gymName: '', trainers: 0, clients: 0 }))
                    }
                }
            }

            // Trainer Stats
            if (profile?.role === 'trainer' && user) {
                // Count Clients assigned to this trainer
                const { count: clientCount } = await supabase
                    .from('trainer_users')
                    .select('*', { count: 'exact', head: true })
                    .eq('trainer_id', user.id)

                setStats(prev => ({
                    ...prev,
                    clients: clientCount || 0
                }))
            }

            // User Stats
            if (profile?.role === 'user' && user) {
                const today = new Date().toISOString().split('T')[0]

                // 1. Count Days Trained (<= Today)
                const { count: daysTrained } = await supabase
                    .from('workout_sessions')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', user.id)
                    .lte('session_date', today)

                // 2. Count Scheduled Workouts (> Today)
                const { count: scheduledCount } = await supabase
                    .from('workout_sessions')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', user.id)
                    .gt('session_date', today)

                // 3. Find Assigned Trainer
                const { data: assignment } = await supabase
                    .from('trainer_users')
                    .select('trainer_id')
                    .eq('user_id', user.id)
                    .single()

                // 4. Calculate Streak
                // 4. Calculate Streak
                const { data: sessions } = await supabase
                    .from('workout_sessions')
                    .select('session_date')
                    .eq('user_id', user.id)
                    .order('session_date', { ascending: false })

                let streak = 0
                let highestStreak = 0

                if (sessions && sessions.length > 0) {
                    // Current Streak
                    const datesSet = new Set(sessions.map(s => s.session_date))
                    let checkDate = new Date()
                    let keepChecking = true
                    const subDays = (date, n) => {
                        const d = new Date(date)
                        d.setDate(d.getDate() - n)
                        return d
                    }
                    while (keepChecking) {
                        const dateStr = checkDate.toISOString().split('T')[0]
                        const dayOfWeek = checkDate.getDay()
                        if (datesSet.has(dateStr)) {
                            streak++
                            checkDate = subDays(checkDate, 1)
                        } else {
                            if (dateStr === today) {
                                checkDate = subDays(checkDate, 1)
                            } else if (dayOfWeek === 0) {
                                checkDate = subDays(checkDate, 1)
                            } else {
                                keepChecking = false
                            }
                        }
                    }

                    // Highest Streak (Sorted Ascending)
                    const uniqueSortedDates = [...datesSet].sort()
                    let currentRun = 0
                    let prevDate = null

                    uniqueSortedDates.forEach(dateStr => {
                        const d = new Date(dateStr)
                        if (!prevDate) {
                            currentRun = 1
                        } else {
                            const diffTime = Math.abs(d - prevDate)
                            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))

                            if (diffDays === 1) {
                                currentRun++
                            } else if (diffDays === 2) {
                                // Check if skipped day was Sunday
                                const missingDay = new Date(prevDate)
                                missingDay.setDate(missingDay.getDate() + 1)
                                if (missingDay.getDay() === 0) {
                                    currentRun++
                                } else {
                                    currentRun = 1
                                }
                            } else {
                                currentRun = 1
                            }
                        }
                        if (currentRun > highestStreak) highestStreak = currentRun
                        prevDate = d
                    })
                }

                if (assignment) {
                    const { data: trainerDetails } = await supabase
                        .from('profiles')
                        .select('user_id, full_name, avatar_url')
                        .eq('user_id', assignment.trainer_id)
                        .single()

                    if (trainerDetails) {
                        setStats(prev => ({
                            ...prev,
                            daysTrained: daysTrained || 0,
                            scheduledWorkouts: scheduledCount || 0,
                            streak: streak,
                            highestStreak: highestStreak,
                            trainer: {
                                id: trainerDetails.user_id,
                                full_name: trainerDetails.full_name,
                                avatar_url: trainerDetails.avatar_url
                            }
                        }))
                    } else {
                        setStats(prev => ({ ...prev, daysTrained: daysTrained || 0, scheduledWorkouts: scheduledCount || 0, streak: streak, highestStreak: highestStreak, trainer: null }))
                    }
                } else {
                    setStats(prev => ({ ...prev, daysTrained: daysTrained || 0, scheduledWorkouts: scheduledCount || 0, streak: streak, highestStreak: highestStreak, trainer: null }))
                }
            }
        }

        fetchStats()
    }, [profile?.role, user?.id])

    if (!profile) return <div>Loading profile...</div>

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                <Avatar
                    url={profile.avatar_url}
                    name={profile.full_name}
                    userId={user.id}
                    size={64}
                />
                <div>
                    <h1 style={{ marginBottom: '0.25rem', fontSize: '1.8rem' }}>Welcome, {profile.full_name}</h1>
                    <h2 style={{ fontSize: '1rem', color: 'var(--secondary)', fontWeight: 'normal' }}>Dashboard - {profile.role?.toUpperCase()}</h2>
                </div>
            </div>

            <div className="card">


                {profile.role === 'admin' && (
                    <div>
                        <p style={{ marginBottom: '1rem' }}>Manage your gyms and crew here.</p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                            <div className="card" style={{ padding: '1.5rem' }}>
                                <h3 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>Gym</h3>
                                <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.gymName || 'N/A'}</p>
                            </div>
                            <Link href="/app/admin/users?role=trainer" style={{ textDecoration: 'none' }}>
                                <div className="card" style={{ padding: '1.5rem', cursor: 'pointer', height: '100%' }}>
                                    <h3 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>Trainers</h3>
                                    <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>{stats.trainers}</p>
                                </div>
                            </Link>
                            <Link href="/app/admin/users?role=user" style={{ textDecoration: 'none' }}>
                                <div className="card" style={{ padding: '1.5rem', cursor: 'pointer', height: '100%' }}>
                                    <h3 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>Clients</h3>
                                    <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>{stats.clients}</p>
                                </div>
                            </Link>
                        </div>

                        {/* Trainer Performance Tile */}
                        <div className="card">
                            <h3 style={{ marginBottom: '1rem' }}>Trainer Performance (Sessions)</h3>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                    <thead>
                                        <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)', color: 'var(--secondary)' }}>
                                            <th style={{ padding: '0.75rem' }}>Trainer</th>
                                            <th style={{ padding: '0.75rem', textAlign: 'center' }}>Today</th>
                                            <th style={{ padding: '0.75rem', textAlign: 'center' }}>7 Days</th>
                                            <th style={{ padding: '0.75rem', textAlign: 'center' }}>30 Days</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {trainerStats.map((t, i) => (
                                            <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                                                <td style={{ padding: '0.75rem', fontWeight: '500' }}>{t.trainer_name}</td>
                                                <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold', color: t.sessions_today > 0 ? 'var(--success)' : 'inherit' }}>{t.sessions_today}</td>
                                                <td style={{ padding: '0.75rem', textAlign: 'center' }}>{t.sessions_week}</td>
                                                <td style={{ padding: '0.75rem', textAlign: 'center' }}>{t.sessions_month}</td>
                                            </tr>
                                        ))}
                                        {trainerStats.length === 0 && (
                                            <tr>
                                                <td colSpan={4} style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--secondary)' }}>
                                                    No session data found for your trainers.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {profile.role === 'trainer' && (
                    <div className="trainer-dashboard-grid">
                        {/* My Clients Tile */}
                        <Link href="/app/trainer/users" style={{ textDecoration: 'none' }}>
                            <div className="card" style={{
                                cursor: 'pointer',
                                transition: 'transform 0.2s',
                                ':hover': { transform: 'translateY(-2px)' },
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between'
                            }}>
                                <div>
                                    <h3 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>My Clients</h3>
                                    <p style={{ fontSize: '3rem', fontWeight: 'bold', margin: '0' }}>{stats.clients}</p>
                                </div>
                                <p style={{ color: 'var(--secondary)', fontSize: '0.9rem', marginTop: '1rem' }}>
                                    View active clients &rarr;
                                </p>
                            </div>
                        </Link>
                    </div>
                )}

                {profile.role === 'user' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>

                        {/* Streak Tile */}
                        <div className="card" style={{
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            border: '1px solid var(--border)'
                        }}>
                            <div>
                                <h3 style={{ color: '#f59e0b', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span>🔥</span> Streak
                                </h3>
                                <p style={{ fontSize: '3rem', fontWeight: 'bold', margin: '0' }}>{stats.streak || 0}</p>
                            </div>
                            <p style={{ color: 'var(--secondary)', fontSize: '0.9rem', marginTop: '1rem' }}>
                                Consecutive days
                                <br />
                                <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#eab308' }}>🔥 Best: {stats.highestStreak || 0}</span>
                            </p>
                        </div>

                        {/* Days Trained Tile */}
                        <Link href="/app/workouts?filter=completed" style={{ textDecoration: 'none' }}>
                            <div className="card" style={{
                                cursor: 'pointer',
                                transition: 'transform 0.2s',
                                ':hover': { transform: 'translateY(-2px)' },
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between'
                            }}>
                                <div>
                                    <h3 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>Days Trained</h3>
                                    <p style={{ fontSize: '3rem', fontWeight: 'bold', margin: '0' }}>{stats.daysTrained}</p>
                                </div>
                                <p style={{ color: 'var(--secondary)', fontSize: '0.9rem', marginTop: '1rem' }}>
                                    View workout history &rarr;
                                </p>
                            </div>
                        </Link>

                        {/* Scheduled Workouts Tile */}
                        <Link href="/app/workouts?filter=future" style={{ textDecoration: 'none' }}>
                            <div className="card" style={{
                                cursor: 'pointer',
                                transition: 'transform 0.2s',
                                ':hover': { transform: 'translateY(-2px)' },
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between'
                            }}>
                                <div>
                                    <h3 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>Scheduled</h3>
                                    <p style={{ fontSize: '3rem', fontWeight: 'bold', margin: '0' }}>{stats.scheduledWorkouts}</p>
                                </div>
                                <p style={{ color: 'var(--secondary)', fontSize: '0.9rem', marginTop: '1rem' }}>
                                    View upcoming sessions &rarr;
                                </p>
                            </div>
                        </Link>

                        {/* Trainer Tile */}
                        {stats.trainer ? (
                            <Link href={`/app/trainer/${stats.trainer.id}`} style={{ textDecoration: 'none' }}>
                                <div className="card" style={{
                                    cursor: 'pointer',
                                    transition: 'transform 0.2s',
                                    ':hover': { transform: 'translateY(-2px)' },
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between'
                                }}>
                                    <div>
                                        <h3 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>My Trainer</h3>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <Avatar
                                                url={stats.trainer.avatar_url}
                                                name={stats.trainer.full_name}
                                                userId={stats.trainer.id}
                                                size={48}
                                            />
                                            <p style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: '0' }}>{stats.trainer.full_name}</p>
                                        </div>
                                    </div>
                                    <p style={{ color: 'var(--secondary)', fontSize: '0.9rem', marginTop: '1rem' }}>
                                        View profile &rarr;
                                    </p>
                                </div>
                            </Link>
                        ) : (
                            <div className="card" style={{
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                opacity: 0.8
                            }}>
                                <div>
                                    <h3 style={{ color: 'var(--secondary)', marginBottom: '0.5rem' }}>My Trainer</h3>
                                    <p style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0', color: 'var(--secondary)' }}>Self Trained</p>
                                </div>
                                <p style={{ color: 'var(--secondary)', fontSize: '0.9rem', marginTop: '1rem' }}>
                                    No trainer assigned
                                </p>
                            </div>
                        )}

                    </div>
                )}
            </div>
        </div>
    )
}
