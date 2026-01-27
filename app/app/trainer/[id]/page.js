'use client'

import { useState, useEffect, use } from 'react'
import Avatar from '../../../../components/Avatar'
import { supabase } from '../../../../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function TrainerProfilePage({ params }) {
    const { id } = use(params)
    const [trainer, setTrainer] = useState(null)
    const [loading, setLoading] = useState(true)
    const router = useRouter()

    useEffect(() => {
        const fetchTrainer = async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('user_id', id)
                .eq('role', 'trainer')
                .single()

            if (error) {
                console.error('Error fetching trainer:', error)
                // router.push('/app/dashboard')
                return
            }

            if (data) setTrainer(data)
            setLoading(false)
        }

        fetchTrainer()
    }, [id])

    if (loading) return <div>Loading trainer profile...</div>
    if (!trainer) return <div>Trainer not found</div>

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <Link href="/app/dashboard" className="btn" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border)', color: 'var(--foreground)', display: 'inline-block', marginBottom: '1.5rem' }}>
                &larr; Back to Dashboard
            </Link>

            <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1.5rem' }}>
                    <Avatar
                        url={trainer.avatar_url}
                        name={trainer.full_name}
                        userId={trainer.user_id}
                        size={80}
                    />
                    <div>
                        <h1 style={{ marginBottom: '0.25rem' }}>{trainer.full_name}</h1>
                        <span style={{
                            padding: '0.25rem 0.75rem',
                            backgroundColor: '#0f766e',
                            color: 'white',
                            borderRadius: '1rem',
                            fontSize: '0.875rem'
                        }}>
                            Certified Trainer
                        </span>
                    </div>
                </div>

                <div style={{ display: 'grid', gap: '2rem' }}>
                    <section>
                        <h3 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>Certifications</h3>
                        <p style={{ lineHeight: '1.6', color: 'var(--foreground)' }}>
                            {trainer.certifications || 'No certifications listed.'}
                        </p>
                    </section>

                    <section>
                        <h3 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>Experience</h3>
                        <p style={{ lineHeight: '1.6', color: 'var(--foreground)' }}>
                            {trainer.experience || 'No experience listed.'}
                        </p>
                    </section>

                    <section>
                        <h3 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>Achievements</h3>
                        <p style={{ lineHeight: '1.6', color: 'var(--foreground)' }}>
                            {trainer.achievements || 'No achievements listed.'}
                        </p>
                    </section>
                </div>
            </div>
        </div>
    )
}
