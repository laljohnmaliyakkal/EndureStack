'use client'

import { useState, useRef } from 'react'
import Modal from './Modal'
import ConfirmModal from './ConfirmModal'

export default function AddFoodModal({ isOpen, onClose, onAdd }) {
    const [mode, setMode] = useState('camera') // 'manual' or 'camera'
    const [loading, setLoading] = useState(false)
    const [analyzing, setAnalyzing] = useState(false)
    const [alertState, setAlertState] = useState({ isOpen: false, message: '' })

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
    const galleryInputRef = useRef(null)
    const cameraInputRef = useRef(null)

    const compressImage = (file) => {
        return new Promise((resolve) => {
            const reader = new FileReader()
            reader.readAsDataURL(file)
            reader.onload = (event) => {
                const img = new Image()
                img.src = event.target.result
                img.onload = () => {
                    const canvas = document.createElement('canvas')
                    const MAX_WIDTH = 800
                    const MAX_HEIGHT = 800
                    let width = img.width
                    let height = img.height

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width
                            width = MAX_WIDTH
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height
                            height = MAX_HEIGHT
                        }
                    }

                    canvas.width = width
                    canvas.height = height
                    const ctx = canvas.getContext('2d')
                    ctx.drawImage(img, 0, 0, width, height)
                    resolve(canvas.toDataURL('image/jpeg', 0.7))
                }
            }
        })
    }

    const handleFileChange = async (e) => {
        const file = e.target.files[0]
        if (!file) return

        setAnalyzing(true)

        try {
            // Compress Image
            const compressedBase64 = await compressImage(file)
            setImagePreview(compressedBase64)

            // Convert base64 to blob for upload
            const res = await fetch(compressedBase64)
            const blob = await res.blob()
            const compressedFile = new File([blob], file.name, { type: 'image/jpeg' })

            // Auto Analyze
            const uploadData = new FormData()
            uploadData.append('image', compressedFile)

            const apiRes = await fetch('/api/analyze-food', {
                method: 'POST',
                body: uploadData
            })

            if (!apiRes.ok) throw new Error('Analysis failed')

            const data = await apiRes.json()
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
            console.error(error)
            setAlertState({
                isOpen: true,
                message: 'Could not analyze image. Please enter details manually.'
            })
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
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                                <button onClick={() => cameraInputRef.current?.click()} className="btn" style={{ backgroundColor: 'var(--primary)', color: 'white' }}>
                                    Take Photo 📸
                                </button>
                                <button onClick={() => galleryInputRef.current?.click()} className="btn" style={{ backgroundColor: 'var(--secondary)', color: 'var(--foreground)' }}>
                                    From Gallery 🖼️
                                </button>
                            </div>

                            {/* Hidden Inputs */}
                            <input
                                ref={cameraInputRef}
                                type="file"
                                accept="image/*"
                                capture="environment"
                                style={{ display: 'none' }}
                                onChange={handleFileChange}
                            />
                            <input
                                ref={galleryInputRef}
                                type="file"
                                accept="image/*"
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

            <ConfirmModal
                isOpen={alertState.isOpen}
                onClose={() => setAlertState({ ...alertState, isOpen: false })}
                title="Analysis Failed"
                message={alertState.message}
                isAlert={true}
            />
        </Modal>
    )
}
