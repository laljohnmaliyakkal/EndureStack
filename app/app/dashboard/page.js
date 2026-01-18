'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../../components/AuthProvider'
import { supabase } from '../../../lib/supabase'
import Link from 'next/link'

export default function Dashboard() {
    const { profile, user } = useAuth()
    const [stats, setStats] = useState({
        gyms: 0,
        trainers: 0,
        clients: 0,
        daysTrained: 0,
        trainer: null
    })

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
                            trainers: trainerCount || 0,
                            clients: clientCount || 0
                        }))
                    } else {
                        setStats(prev => ({ ...prev, gyms: 0, trainers: 0, clients: 0 }))
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

                if (assignment) {
                    const { data: trainerDetails } = await supabase
                        .from('profiles')
                        .select('user_id, full_name')
                        .eq('user_id', assignment.trainer_id)
                        .single()

                    if (trainerDetails) {
                        setStats(prev => ({
                            ...prev,
                            daysTrained: daysTrained || 0,
                            scheduledWorkouts: scheduledCount || 0,
                            trainer: { id: trainerDetails.user_id, full_name: trainerDetails.full_name }
                        }))
                    } else {
                        setStats(prev => ({ ...prev, daysTrained: daysTrained || 0, scheduledWorkouts: scheduledCount || 0, trainer: null }))
                    }
                } else {
                    setStats(prev => ({ ...prev, daysTrained: daysTrained || 0, scheduledWorkouts: scheduledCount || 0, trainer: null }))
                }
            }
        }

        fetchStats()
    }, [profile, user])

    if (!profile) return <div>Loading profile...</div>

    return (
        <div>
            <h1 style={{ marginBottom: '2rem' }}>Welcome, {profile.full_name}</h1>

            <div className="card">
                <h2 style={{ marginBottom: '1rem' }}>Dashboard - {profile.role?.toUpperCase()}</h2>

                {profile.role === 'admin' && (
                    <div>
                        <p style={{ marginBottom: '1rem' }}>Manage your gyms and crew here.</p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                            <div className="card" style={{ padding: '1.5rem' }}>
                                <h3 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>Gyms</h3>
                                <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.gyms}</p>
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

                        {/* Days Trained Tile */}
                        <Link href="/app/workouts" style={{ textDecoration: 'none' }}>
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
                        <Link href="/app/workouts" style={{ textDecoration: 'none' }}>
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
                                        <h3 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>My Trainer</h3>
                                        <p style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0' }}>{stats.trainer.full_name}</p>
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
