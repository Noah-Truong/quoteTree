'use client'

import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import TreeScene from '@/components/TreeScene'
import AddLeafModal from '@/components/AddLeafModal'
import RandomLeafCard from '@/components/RandomLeafCard'
import { Leaf } from '@/lib/supabase'

export default function Home() {
  const [leaves, setLeaves] = useState<Leaf[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [randomLeaf, setRandomLeaf] = useState<Leaf | null>(null)
  const [isShaking, setIsShaking] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/leaves')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setLeaves(data)
      })
      .finally(() => setLoading(false))
  }, [])

  const handleAddLeaf = (leaf: Leaf) => {
    setLeaves(prev => [leaf, ...prev])
  }

  const handleLeafRemoved = (id: string) => {
    setLeaves(prev => prev.filter(l => l.id !== id))
  }

  return (
    <main className="min-h-[100dvh] bg-white flex flex-col overflow-x-hidden relative">
      {/* Header */}
      <header className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-4 sm:px-6 pt-safe pb-4 sm:py-5 border-b border-rose-100">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-rose-900 tracking-tight">Quote Tree</h1>
          <p className="text-rose-800/90 text-xs sm:text-sm mt-1">
            {loading
              ? 'Loading...'
              : leaves.length === 0
              ? 'The sakura is bare — add the first blossom'
              : `${leaves.length} ${leaves.length === 1 ? 'blossom' : 'blossoms'} on the tree`}
          </p>
        </div>
        <motion.button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="w-full sm:w-auto shrink-0 inline-flex items-center justify-center min-h-11 px-5 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 active:bg-rose-700 border border-rose-500 text-white text-sm font-medium transition-colors shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Add a blossom
        </motion.button>
      </header>

      {/* 3D Tree — anchored toward bottom of viewport */}
      <div className="relative z-10 flex-1 flex flex-col justify-end items-center pb-safe pt-4 sm:pt-6 px-3 sm:px-4 min-h-0">
        {loading ? (
          <div className="flex flex-col items-center gap-3 pb-32">
            <motion.div
              className="w-8 h-8 rounded-full border-2 border-rose-500 border-t-transparent"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
            <p className="text-rose-800 text-sm">Growing the tree...</p>
          </div>
        ) : (
          <div className="w-full max-w-2xl shrink-0">
            <TreeScene
              leaves={leaves}
              onShakeComplete={setRandomLeaf}
              onLeafRemoved={handleLeafRemoved}
              isShaking={isShaking}
              setIsShaking={setIsShaking}
            />
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showAddModal && (
          <AddLeafModal
            onClose={() => setShowAddModal(false)}
            onAdd={handleAddLeaf}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {randomLeaf && (
          <RandomLeafCard
            leaf={randomLeaf}
            onClose={() => setRandomLeaf(null)}
          />
        )}
      </AnimatePresence>
    </main>
  )
}
