'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Leaf } from '@/lib/supabase'

interface Props {
  onClose: () => void
  onAdd: (leaf: Leaf) => void
}

export default function AddLeafModal({ onClose, onAdd }: Props) {
  const [content, setContent] = useState('')
  const [author, setAuthor] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, author }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onAdd(data)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 pt-safe pb-safe"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="presentation"
    >
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-blossom-heading"
        className="relative w-full max-w-md max-h-[min(90dvh,100%)] overflow-y-auto bg-white border border-rose-200 rounded-2xl p-5 sm:p-6 shadow-2xl"
        initial={{ scale: 0.8, y: 40, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.8, y: 40, opacity: 0 }}
        transition={{ type: 'spring', damping: 20 }}
      >
        <h2 id="add-blossom-heading" className="text-xl sm:text-2xl font-bold text-rose-900 mb-1">
          Add a blossom
        </h2>
        <p className="text-rose-500 text-sm mb-5">Your words will stay on the sakura.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <textarea
              className="w-full min-h-[7rem] bg-rose-50 border border-rose-200 rounded-xl p-3 text-rose-900 placeholder-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-rose-400 resize-none text-base"
              placeholder="Write anything… a quote, a thought, a feeling."
              rows={4}
              maxLength={280}
              value={content}
              onChange={e => setContent(e.target.value)}
              autoFocus
            />
            <p className="text-right text-rose-400 text-xs mt-1">{content.length}/280</p>
          </div>

          <input
            className="w-full min-h-11 bg-rose-50 border border-rose-200 rounded-xl p-3 text-rose-900 placeholder-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-rose-400 text-base"
            placeholder="Your name (optional)"
            maxLength={50}
            value={author}
            onChange={e => setAuthor(e.target.value)}
          />

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 min-h-12 py-3 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !content.trim()}
              className="flex-1 min-h-12 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold transition-colors text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-800"
            >
              {loading ? 'Adding…' : 'Add blossom'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}
