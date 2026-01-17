'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../../../components/AuthProvider'
import { supabase } from '../../../../lib/supabase'
import Link from 'next/link'

export default function TrainerClientsPage() {
    const { user } = useAuth()
    const [clients, setClients] = useState([])

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

            {clients.length === 0 ? (
                <p>No clients assigned yet.</p>
            ) : (
                <div style={{ display: 'grid', gap: '1rem' }}>
                    {clients.map(client => (
                        <div key={client.user_id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Link href={`/app/trainer/users/${client.user_id}`} style={{ flex: 1, textDecoration: 'none' }}>
                                <div>
                                    <p style={{ fontWeight: 'bold' }}>{client.full_name}</p>
                                    <p style={{ color: 'var(--secondary)', fontSize: '0.9rem' }}>Age: {client.age || '-'} | Weight: {client.weight_kg || '-'}kg</p>
                                </div>
                            </Link>
                            <Link href={`/app/workouts/log?userId=${client.user_id}`} className="btn" style={{ marginLeft: '1rem' }}>
                                Log Workout
                            </Link>
                            <Link href={`/app/trainer/users/${client.user_id}/schedule`} className="btn" style={{ marginLeft: '0.5rem', backgroundColor: 'var(--secondary)' }}>
                                Schedule
                            </Link>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
