import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export async function GET() {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('leaves')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = getSupabase()
  const body = await request.json()
  const { content, author } = body

  if (!content?.trim()) {
    return NextResponse.json({ error: 'Content is required' }, { status: 400 })
  }
  if (content.trim().length > 280) {
    return NextResponse.json({ error: 'Content must be 280 characters or less' }, { status: 400 })
  }
  if (author?.trim() && author.trim().length > 50) {
    return NextResponse.json({ error: 'Author name must be 50 characters or less' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('leaves')
    .insert([{ content: content.trim(), author: author?.trim() || 'Anonymous' }])
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
