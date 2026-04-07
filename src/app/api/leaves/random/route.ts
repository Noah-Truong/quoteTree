import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export async function GET() {
  const supabase = getSupabase()

  // Get total count
  const { count, error: countError } = await supabase
    .from('leaves')
    .select('*', { count: 'exact', head: true })

  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 })
  }

  if (!count || count === 0) {
    return NextResponse.json({ empty: true }, { status: 404 })
  }

  // Pick a random offset and fetch+delete atomically
  const randomOffset = Math.floor(Math.random() * count)

  const { data, error } = await supabase
    .from('leaves')
    .select('*')
    .range(randomOffset, randomOffset)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Delete the leaf
  await supabase.from('leaves').delete().eq('id', data.id)

  return NextResponse.json(data)
}
