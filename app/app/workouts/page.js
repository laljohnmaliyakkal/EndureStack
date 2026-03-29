'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../components/AuthProvider'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { useRouter } from 'next/navigation'

function WorkoutsContent() {
    const { user, profile } = useAuth()
    const searchParams = useSearchParams()
    const router = useRouter()
    const filter = searchParams.get('filter')
    const targetUserId = searchParams.get('userId') || user?.id
    const [sessions, setSessions] = useState([])
    const [partner, setPartner] = useState(null)
    const [targetUser, setTargetUser] = useState(null)

    useEffect(() => {
        if (targetUserId) {
            const fetchProfiles = async () => {
                const { data: targetProfile } = await supabase.from('profiles').select('full_name, partner_id').eq('user_id', targetUserId).single()
                
                if (targetProfile) {
                    setTargetUser({ full_name: targetProfile.full_name, id: targetUserId })
                    
                    if (targetProfile.partner_id) {
                        const { data: partnerProfile } = await supabase.from('profiles').select('full_name').eq('user_id', targetProfile.partner_id).single()
                        if (partnerProfile) {
                            setPartner({ full_name: partnerProfile.full_name, id: targetProfile.partner_id })
                        }
                    } else {
                        setPartner(null)
                    }
                }
            }
            fetchProfiles()
        }
    }, [targetUserId])

    useEffect(() => {
        if (user && targetUserId) {
            console.log('Filtering workouts with:', filter)
            const fetchSessions = async () => {
                let query = supabase
                    .from('workout_sessions')
                    .select('*, workout_logs(*)')
                    .eq('user_id', targetUserId)

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
    }, [user?.id, targetUserId, filter])

    const getTitle = () => {
        const prefix = targetUserId === user?.id ? 'My ' : `${targetUser?.full_name || 'Client'}'s `
        if (filter === 'future') return `${prefix}Upcoming Workouts`
        if (filter === 'completed') return `${prefix}Completed Workouts`
        return `${prefix}Workouts`
    }

    const getFirstName = (fullName) => fullName ? fullName.split(' ')[0] : ''

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {(filter === 'future' || filter === 'completed') && (
                        <Link href={`/app/dashboard?userId=${targetUserId}`} style={{ textDecoration: 'none', color: 'var(--secondary)', fontSize: '1.5rem' }}>
                            &larr;
                        </Link>
                    )}
                    <h1>{getTitle()}</h1>
                </div>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <Link href={`/app/workouts/plan?userId=${targetUserId}`} className="btn" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border)', color: 'var(--foreground)' }}>
                        {targetUserId === user?.id ? 'My Plan' : `${getFirstName(targetUser?.full_name) || 'Client'}'s Plan`}
                    </Link>
                    <Link href={`/app/workouts/log?userId=${targetUserId}`} className="btn">
                        Log Workout
                    </Link>
                </div>
            </div>

            {partner && (
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                    <button 
                        onClick={() => router.push(`/app/workouts?userId=${targetUserId}${filter ? '&filter=' + filter : ''}`)}
                        className="btn" 
                        style={{ 
                            flex: 1, 
                            background: 'var(--primary)', 
                            color: 'white',
                            border: '1px solid var(--primary)' 
                        }}
                    >
                        {targetUserId === user?.id ? 'Me' : (getFirstName(targetUser?.full_name) || 'Client')}
                    </button>
                    <button 
                        onClick={() => router.push(`/app/workouts?userId=${partner.id}${filter ? '&filter=' + filter : ''}`)}
                        className="btn" 
                        style={{ 
                            flex: 1, 
                            background: 'var(--card-bg)', 
                            color: 'var(--foreground)',
                            border: '1px solid var(--border)' 
                        }}
                    >
                        {getFirstName(partner.full_name)}
                    </button>
                </div>
            )}

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
