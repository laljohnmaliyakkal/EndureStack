import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextResponse } from 'next/server'
import { Buffer } from 'buffer'

export async function POST(request) {
    try {
        console.log('request received')
        const formData = await request.formData()
        const image = formData.get('image')

        if (!image) {
            return NextResponse.json({ error: 'No image provided' }, { status: 400 })
        }

        const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY
        console.log('API Key:', apiKey)
        if (!apiKey) {
            return NextResponse.json({ error: 'Gemini API Key missing' }, { status: 500 })
        }

        const genAI = new GoogleGenerativeAI(apiKey)
        const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' })

        // Convert file to base64
        const bytes = await image.arrayBuffer()
        const buffer = Buffer.from(bytes)
        const base64Image = buffer.toString('base64')

        const prompt = `
            Analyze the food in this image. identifying the food name and estimating the calories, protein (g), carbs (g), and fats (g).
            
            Return ONLY a JSON object with this structure (no markdown):
            {
                "food_name": "Example Food",
                "calories": 0,
                "protein": 0,
                "carbs": 0,
                "fats": 0,
                "meal_type_suggestion": "Lunch"
            }
        `

        const result = await model.generateContent([
            prompt,
            { inlineData: { data: base64Image, mimeType: image.type || 'image/jpeg' } }
        ])

        const response = await result.response
        const text = response.text()

        // Cleanup JSON string (remove backticks if any)
        const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim()

        try {
            const data = JSON.parse(jsonString)
            return NextResponse.json(data)
        } catch (e) {
            console.error('JSON Parse Failed:', e)
            return NextResponse.json({ error: 'Failed to parse AI response', raw_text: text }, { status: 500 })
        }
    } catch (error) {
        console.error('Food analysis error:', error)
        return NextResponse.json({ error: 'Failed to analyze food: ' + error.message }, { status: 500 })
    }
}
