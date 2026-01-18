'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../../../components/AuthProvider'
import { supabase } from '../../../../lib/supabase'
import Link from 'next/link'

export default function TrainerClientsPage() {
    const { user } = useAuth()
    const [clients, setClients] = useState([])
    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => {
        if (user) {
            const fetchClients = async () => {
                // 1. Get user IDs assigned to this trainer
                const { data: relations } = await supabase
                    .from('trainer_users')
                    .select('user_id')
                    .eq('trainer_id', user.id)

                if (relations && relations.length > 0) {
                    const userIds = relations.map(r => r.user_id)

                    // 2. Get profiles for these users
                    const { data: profiles } = await supabase
                        .from('profiles')
                        .select('*')
                        .in('user_id', userIds)

                    setClients(profiles || [])
                } else {
                    setClients([])
                }
            }
            fetchClients()
        }
    }, [user])

    return (
        <div>
            <h1 style={{ marginBottom: '1.5rem' }}>My Clients</h1>

            <input
                type="text"
                className="input"
                placeholder="Search clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ marginBottom: '1.5rem' }}
            />

            {clients.length === 0 ? (
                <p>No clients assigned yet.</p>
            ) : (
                <div style={{ display: 'grid', gap: '1rem' }}>
                    {clients.filter(c => c.full_name.toLowerCase().includes(searchQuery.toLowerCase())).map(client => (
                        <div key={client.user_id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {/* Top Row: Client Info */}
                            <Link href={`/app/trainer/users/${client.user_id}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{
                                    width: '48px', height: '48px', borderRadius: '50%',
                                    background: 'var(--primary-gradient)',
                                    color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontWeight: 'bold', fontSize: '1.2rem'
                                }}>
                                    {client.full_name?.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{client.full_name}</p>
                                    <p style={{ color: 'var(--secondary)', fontSize: '0.9rem' }}>Age: {client.age || '-'} | Weight: {client.weight_kg || '-'}kg</p>
                                </div>
                            </Link>

                            {/* Bottom Row: Actions */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <Link href={`/app/workouts/log?userId=${client.user_id}`} className="btn" style={{ width: '100%' }}>
                                    Log Workout
                                </Link>
                                <Link href={`/app/trainer/users/${client.user_id}/schedule`} className="btn" style={{ width: '100%', background: 'var(--secondary-bg)', color: 'var(--foreground)', border: '1px solid var(--border)' }}>
                                    Schedule
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
