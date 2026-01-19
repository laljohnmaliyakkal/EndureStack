'use client'

import { useState, useRef } from 'react'
import Modal from './Modal'

export default function AddFoodModal({ isOpen, onClose, onAdd }) {
    const [mode, setMode] = useState('camera') // 'manual' or 'camera'
    const [loading, setLoading] = useState(false)
    const [analyzing, setAnalyzing] = useState(false)

    // Form State
    const [formData, setFormData] = useState({
        food_name: '',
        calories: '',
        protein: '',
        carbs: '',
        fats: '',
        meal_type: 'Breakfast'
    })

    // Image State
    const [imagePreview, setImagePreview] = useState(null)
    const fileInputRef = useRef(null)

    const handleFileChange = async (e) => {
        const file = e.target.files[0]
        if (!file) return

        // Preview
        const reader = new FileReader()
        reader.onloadend = () => setImagePreview(reader.result)
        reader.readAsDataURL(file)

        // Auto Analyze
        setAnalyzing(true)
        try {
            const uploadData = new FormData()
            uploadData.append('image', file)
            const res = await fetch('/api/analyze-food', {
                method: 'POST',
                body: uploadData
            })
            console.log('response received', res)
            if (!res.ok) throw new Error('Analysis failed')

            const data = await res.json()
            setFormData(prev => ({
                ...prev,
                food_name: data.food_name,
                calories: data.calories,
                protein: data.protein,
                carbs: data.carbs,
                fats: data.fats,
                meal_type: data.meal_type_suggestion || prev.meal_type
            }))
            setMode('manual') // Switch to review mode
        } catch (error) {
            console.log(error)
            alert('Could not analyze image. Please enter details manually.')
        } finally {
            setAnalyzing(false)
        }
    }

    const handleSubmit = async () => {
        setLoading(true)
        await onAdd({
            ...formData,
            image_url: imagePreview // Saving base64 for now, ideally upload to storage
        })
        setLoading(false)
        onClose()
        // Reset
        setFormData({ food_name: '', calories: '', protein: '', carbs: '', fats: '', meal_type: 'Breakfast' })
        setImagePreview(null)
        setMode('camera')
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Add Food"
            footer={
                <>
                    <button onClick={onClose} className="btn" style={{ backgroundColor: 'var(--secondary)' }}>Cancel</button>
                    {(mode === 'manual') && (
                        <button onClick={handleSubmit} className="btn" disabled={loading || !formData.food_name}>
                            {loading ? 'Saving...' : 'Add Log'}
                        </button>
                    )}
                </>
            }
        >
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)' }}>
                <button
                    onClick={() => setMode('camera')}
                    style={{
                        padding: '0.5rem 1rem',
                        background: 'transparent',
                        borderBottom: mode === 'camera' ? '2px solid var(--primary)' : 'transparent',
                        color: mode === 'camera' ? 'var(--primary)' : 'var(--secondary)',
                        fontWeight: mode === 'camera' ? 'bold' : 'normal',
                        cursor: 'pointer'
                    }}
                >
                    AI Camera
                </button>
                <button
                    onClick={() => setMode('manual')}
                    style={{
                        padding: '0.5rem 1rem',
                        background: 'transparent',
                        borderBottom: mode === 'manual' ? '2px solid var(--primary)' : 'transparent',
                        color: mode === 'manual' ? 'var(--primary)' : 'var(--secondary)',
                        fontWeight: mode === 'camera' ? 'normal' : 'bold',
                        cursor: 'pointer'
                    }}
                >
                    Manual Entry
                </button>
            </div>

            {mode === 'camera' && (
                <div style={{ textAlign: 'center', padding: '2rem', border: '2px dashed var(--border)', borderRadius: '0.5rem' }}>
                    {analyzing ? (
                        <div style={{ color: 'var(--primary)' }}>Analyzing Food... ✨</div>
                    ) : (
                        <>
                            <p style={{ marginBottom: '1rem' }}>Take a photo or upload an image to analyze calories.</p>
                            <button onClick={() => fileInputRef.current?.click()} className="btn">
                                Select Image
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                capture="environment" // trigger camera on mobile
                                style={{ display: 'none' }}
                                onChange={handleFileChange}
                            />
                        </>
                    )}
                </div>
            )}

            {mode === 'manual' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {imagePreview && (
                        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                            <img src={imagePreview} alt="Food" style={{ maxHeight: '150px', borderRadius: '0.5rem' }} />
                        </div>
                    )}

                    <div>
                        <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Food Name</label>
                        <input className="input" value={formData.food_name} onChange={e => setFormData({ ...formData, food_name: e.target.value })} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Calories</label>
                            <input type="number" className="input" value={formData.calories} onChange={e => setFormData({ ...formData, calories: e.target.value })} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Meal Type</label>
                            <select className="input" value={formData.meal_type} onChange={e => setFormData({ ...formData, meal_type: e.target.value })}>
                                <option>Breakfast</option>
                                <option>Lunch</option>
                                <option>Dinner</option>
                                <option>Snack</option>
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--secondary)' }}>Protein (g)</label>
                            <input type="number" className="input" value={formData.protein} onChange={e => setFormData({ ...formData, protein: e.target.value })} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--secondary)' }}>Carbs (g)</label>
                            <input type="number" className="input" value={formData.carbs} onChange={e => setFormData({ ...formData, carbs: e.target.value })} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--secondary)' }}>Fats (g)</label>
                            <input type="number" className="input" value={formData.fats} onChange={e => setFormData({ ...formData, fats: e.target.value })} />
                        </div>
                    </div>
                </div>
            )}
        </Modal>
    )
}
