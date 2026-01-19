'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../../components/AuthProvider'
import { supabase } from '../../../lib/supabase'
import AddFoodModal from '../../../components/AddFoodModal'
import ConfirmModal from '../../../components/ConfirmModal'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function NutritionPage() {
    const { user, profile } = useAuth()
    const searchParams = useSearchParams()
    const paramUserId = searchParams.get('userId')

    // Determine if we are viewing another user's data
    // Only trainers/admins should be doing this really, but RLS protects the data anyway.
    const isViewingClient = paramUserId && user && paramUserId !== user.id
    const targetUserId = isViewingClient ? paramUserId : (user ? user.id : null)


    const [logs, setLogs] = useState([])
    const [loading, setLoading] = useState(true)
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [summary, setSummary] = useState({ calories: 0, protein: 0, carbs: 0, fats: 0 })
    const [modalState, setModalState] = useState({ isOpen: false, title: '', message: '', isAlert: false, isDanger: false, onConfirm: null })

    // Date Selection (default today)
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

    const fetchLogs = async () => {
        if (!user || !targetUserId) return

        const { data, error } = await supabase
            .from('food_logs')
            .select('*')
            .eq('user_id', targetUserId)

            .eq('log_date', selectedDate)
            .order('created_at', { ascending: true })

        if (data) {
            setLogs(data)

            // Calc Summary
            const sum = data.reduce((acc, log) => ({
                calories: acc.calories + (log.calories || 0),
                protein: acc.protein + (log.protein || 0),
                carbs: acc.carbs + (log.carbs || 0),
                fats: acc.fats + (log.fats || 0)
            }), { calories: 0, protein: 0, carbs: 0, fats: 0 })
            setSummary(sum)
        }
        setLoading(false)
    }

    useEffect(() => {
        if (targetUserId) fetchLogs()
    }, [user, targetUserId, selectedDate])


    const handleAddFood = async (foodData) => {
        const { error } = await supabase.from('food_logs').insert([{
            user_id: user.id,
            ...foodData,
            log_date: selectedDate
        }])

        if (!error) {
            fetchLogs()
        } else {
            setModalState({
                isOpen: true,
                title: 'Error',
                message: 'Error adding food: ' + error.message,
                isAlert: true
            })
        }
    }

    const executeDelete = async (id) => {
        await supabase.from('food_logs').delete().eq('id', id)
        fetchLogs()
        setModalState(prev => ({ ...prev, isOpen: false }))
    }

    const requestDelete = (id) => {
        setModalState({
            isOpen: true,
            title: 'Delete Food Log?',
            message: 'Are you sure you want to delete this entry? This actions cannot be undone.',
            isDanger: true,
            isAlert: false,
            onConfirm: () => executeDelete(id)
        })
    }

    // Group logs by meal type
    const groupedLogs = {
        Breakfast: logs.filter(l => l.meal_type === 'Breakfast'),
        Lunch: logs.filter(l => l.meal_type === 'Lunch'),
        Dinner: logs.filter(l => l.meal_type === 'Dinner'),
        Snack: logs.filter(l => l.meal_type === 'Snack'),
    }

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '4rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1>Diet Analysis</h1>
                    {isViewingClient && (
                        <Link href={`/app/trainer/users/${targetUserId}`} style={{ fontSize: '0.9rem', color: 'var(--primary)', textDecoration: 'none' }}>
                            &larr; Back to Client Profile
                        </Link>
                    )}
                </div>
                <input
                    type="date"
                    className="input"
                    style={{ width: 'auto', marginBottom: 0 }}
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                />
            </div>


            {/* Summary Card */}
            <div className="card" style={{ marginBottom: '2rem', backgroundImage: 'linear-gradient(135deg, #059669 0%, #047857 100%)', color: 'white', border: 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Daily Summary</h2>
                    <span style={{ fontSize: '0.9rem', opacity: 0.9 }}>Goal: 2000 kcal</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
                    <div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{summary.calories}</div>
                        <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Calories</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '1.5rem', fontWeight: '600' }}>{summary.protein}g</div>
                        <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Protein</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '1.5rem', fontWeight: '600' }}>{summary.carbs}g</div>
                        <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Carbs</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '1.5rem', fontWeight: '600' }}>{summary.fats}g</div>
                        <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Fats</div>
                    </div>
                </div>
            </div>

            {/* Meals */}
            {['Breakfast', 'Lunch', 'Dinner', 'Snack'].map(meal => (
                <div key={meal} style={{ marginBottom: '2rem' }}>
                    <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                        {meal}
                        <span style={{ fontSize: '0.9rem', color: 'var(--secondary)', fontWeight: 'normal' }}>
                            {groupedLogs[meal].reduce((sum, item) => sum + item.calories, 0)} kcal
                        </span>
                    </h3>

                    {groupedLogs[meal].length > 0 ? (
                        <div style={{ display: 'grid', gap: '0.75rem' }}>
                            {groupedLogs[meal].map(log => (
                                <div key={log.id} className="card" style={{ padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    {log.image_url && (
                                        <img src={log.image_url} alt={log.food_name} style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '0.25rem' }} />
                                    )}
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: '600' }}>{log.food_name}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--secondary' }}>
                                            P: {log.protein}g • C: {log.carbs}g • F: {log.fats}g
                                        </div>
                                    </div>
                                    <div style={{ fontWeight: 'bold', marginRight: '1rem' }}>
                                        {log.calories}
                                    </div>
                                    {!isViewingClient && (
                                        <button onClick={() => requestDelete(log.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '1.2rem' }}>
                                            &times;
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ color: 'var(--secondary)', fontSize: '0.9rem', fontStyle: 'italic' }}>No food logged.</div>
                    )}
                </div>
            ))}

            {/* Floating Action Button - Only for owner */}
            {!isViewingClient && (
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    style={{
                        position: 'fixed',
                        bottom: '2rem',
                        right: '2rem',
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--primary)',
                        color: 'white',
                        border: 'none',
                        fontSize: '2rem',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 50
                    }}
                >
                    +
                </button>
            )}

            <AddFoodModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onAdd={handleAddFood}
            />

            <ConfirmModal
                isOpen={modalState.isOpen}
                onClose={() => setModalState({ ...modalState, isOpen: false })}
                onConfirm={modalState.onConfirm}
                title={modalState.title}
                message={modalState.message}
                isDanger={modalState.isDanger}
                isAlert={modalState.isAlert}
            />
        </div>
    )
}
