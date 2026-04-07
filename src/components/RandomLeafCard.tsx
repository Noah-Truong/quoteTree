'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Leaf } from '@/lib/supabase'

interface Props {
  leaf: Leaf
  onClose: () => void
}

export default function RandomLeafCard({ leaf, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 pt-safe pb-safe"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="presentation"
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="random-leaf-quote"
        className="relative max-w-sm w-full max-h-[min(90dvh,100%)] overflow-y-auto scrollbar-hide"
        initial={{ scale: 0.5, rotate: -15, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        exit={{ scale: 0.5, rotate: 15, opacity: 0 }}
        transition={{ type: 'spring', damping: 15, stiffness: 200 }}
      >
        {/* Leaf shape */}
        <div className="relative bg-gradient-to-br from-pink-400 via-rose-400 to-pink-600 rounded-[60%_40%_60%_40%/40%_60%_40%_60%] p-8 shadow-2xl shadow-rose-900/35">
          {/* Leaf vein decoration */}
          <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 200 200" preserveAspectRatio="none">
            <path d="M100 10 Q120 100 100 190" stroke="white" strokeWidth="2" fill="none" />
            <path d="M100 50 Q140 60 160 40" stroke="white" strokeWidth="1" fill="none" />
            <path d="M100 80 Q145 90 165 75" stroke="white" strokeWidth="1" fill="none" />
            <path d="M100 110 Q140 120 155 110" stroke="white" strokeWidth="1" fill="none" />
            <path d="M100 50 Q60 60 40 40" stroke="white" strokeWidth="1" fill="none" />
            <path d="M100 80 Q55 90 35 75" stroke="white" strokeWidth="1" fill="none" />
            <path d="M100 110 Q60 120 45 110" stroke="white" strokeWidth="1" fill="none" />
          </svg>

          <blockquote
            id="random-leaf-quote"
            className="relative text-white text-base sm:text-lg font-medium leading-relaxed text-center mb-4 px-1"
          >
            &ldquo;{leaf.content}&rdquo;
          </blockquote>
          <p className="relative text-rose-100 text-sm text-center font-light">
            — {leaf.author}
          </p>
        </div>

        <motion.button
          type="button"
          onClick={onClose}
          className="mt-4 w-full min-h-12 py-3.5 rounded-xl bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 transition-colors text-base font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Let it fall
        </motion.button>
      </motion.div>
    </motion.div>
  )
}
