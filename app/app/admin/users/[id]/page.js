'use client'

import { useState, useEffect, use } from 'react'
import { supabase } from '../../../../../lib/supabase'
import Link from 'next/link'
import Avatar from '../../../../../components/Avatar'

export default function AdminClientProfilePage({ params }) {
    const { id } = use(params)
    const [client, setClient] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchClient = async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('user_id', id)
                .single()

            if (error) {
                console.error('Error fetching client:', error)
            } else {
                setClient(data)
            }
            setLoading(false)
        }

        fetchClient()
    }, [id])

    if (loading) return <div>Loading profile...</div>
    if (!client) return <div>Client not found</div>

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <Link href="/app/admin/users?role=user" className="btn" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border)', color: 'var(--foreground)', display: 'inline-block', marginBottom: '1.5rem' }}>
                &larr; Back to Users
            </Link>

            <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1.5rem' }}>
                    <Avatar
                        name={client.full_name}
                        userId={client.user_id}
                        url={client.avatar_url}
                        size={80}
                    />
                    <div>
                        <h1 style={{ marginBottom: '0.25rem' }}>{client.full_name}</h1>
                        <span style={{
                            padding: '0.25rem 0.75rem',
                            backgroundColor: client.role === 'trainer' ? '#0f766e' : '#1e293b',
                            color: 'white',
                            borderRadius: '1rem',
                            fontSize: '0.875rem'
                        }}>
                            {client.role.toUpperCase()}
                        </span>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                    <div>
                        <p style={{ color: 'var(--secondary)', fontSize: '0.9rem' }}>Age</p>
                        <p style={{ fontSize: '1.25rem', fontWeight: '600' }}>{client.age || '-'}</p>
                    </div>
                    <div>
                        <p style={{ color: 'var(--secondary)', fontSize: '0.9rem' }}>Height</p>
                        <p style={{ fontSize: '1.25rem', fontWeight: '600' }}>{client.height_cm ? `${client.height_cm}cm` : '-'}</p>
                    </div>
                    <div>
                        <p style={{ color: 'var(--secondary)', fontSize: '0.9rem' }}>Weight</p>
                        <p style={{ fontSize: '1.25rem', fontWeight: '600' }}>{client.weight_kg ? `${client.weight_kg}kg` : '-'}</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
