import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@/lib/supabase/server'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { brandName, description } = await request.json()

    if (!brandName || !description) {
      return NextResponse.json({ error: 'Brand name and description required' }, { status: 400 })
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const prompt = `You are a Reddit marketing expert. A business needs help finding Reddit posts where they can helpfully mention their product.

Brand/Product: ${brandName}
Description: ${description}

Generate 8-10 search keywords/phrases that people would ACTUALLY type on Reddit when looking for products or solutions like this. Focus on:

1. Question phrases people ask ("best X for Y", "looking for X", "X recommendations")
2. Problem-based searches ("how to solve X", "help with X")
3. Comparison searches ("X vs Y", "X alternative")
4. Use case specific ("X for commuting", "X for beginners")

Rules:
- Each keyword should be 2-5 words
- Use natural Reddit language (casual, direct)
- Focus on HIGH-INTENT keywords where someone is looking to buy or get recommendations
- Don't include the brand name in keywords (we want to find NEW customers)
- Make them specific enough to find relevant posts, not too generic

Return ONLY a JSON array of strings, no other text. Example format:
["best electric scooter", "scooter for commuting", "electric scooter recommendation"]`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    // Parse the JSON response
    let keywords: string[] = []
    try {
      // Try to extract JSON from the response
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        keywords = JSON.parse(jsonMatch[0])
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', text)
      // Fallback to basic extraction
      keywords = text
        .split('\n')
        .filter(line => line.trim().startsWith('"') || line.trim().startsWith('-'))
        .map(line => line.replace(/^[\s\-"]+|["]+$/g, '').trim())
        .filter(k => k.length > 0)
    }

    // Ensure we have valid keywords
    keywords = keywords
      .filter(k => typeof k === 'string' && k.length > 2 && k.length < 50)
      .slice(0, 10)

    return NextResponse.json({ keywords })
  } catch (error) {
    console.error('Keyword suggestion error:', error)
    return NextResponse.json({ error: 'Failed to generate suggestions' }, { status: 500 })
  }
}
