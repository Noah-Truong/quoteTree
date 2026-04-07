'use client'

import { useRef, useState, useEffect, useMemo, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { motion, AnimatePresence } from 'framer-motion'
import { Leaf } from '@/lib/supabase'

// ─── Deterministic pseudo-random ────────────────────────────────────────────
function seeded(n: number) {
  const x = Math.sin(n + 1) * 10000
  return x - Math.floor(x)
}

// ─── All branches merged into a single draw call ────────────────────────────
function TreeBranches({ branches }: { branches: BranchData[] }) {
  const geometry = useMemo(() => {
    const positions: number[] = []
    const normals: number[] = []
    const indices: number[] = []
    let vertexOffset = 0
    const up = new THREE.Vector3(0, 1, 0)
    const q = new THREE.Quaternion()

    for (const b of branches) {
      const dir = b.end.clone().sub(b.start)
      const length = dir.length()
      const mid = new THREE.Vector3().addVectors(b.start, b.end).multiplyScalar(0.5)
      q.setFromUnitVectors(up, dir.clone().normalize())

      const geo = new THREE.CylinderGeometry(b.radiusTop, b.radiusBottom, length, 5)
      geo.applyQuaternion(q)
      geo.translate(mid.x, mid.y, mid.z)

      const pos = geo.attributes.position.array as Float32Array
      const norm = geo.attributes.normal.array as Float32Array
      const idx = geo.index!.array

      for (let i = 0; i < pos.length; i++) positions.push(pos[i])
      for (let i = 0; i < norm.length; i++) normals.push(norm[i])
      for (let i = 0; i < idx.length; i++) indices.push(idx[i] + vertexOffset)

      vertexOffset += pos.length / 3
      geo.dispose()
    }

    const merged = new THREE.BufferGeometry()
    merged.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    merged.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
    merged.setIndex(indices)
    return merged
  }, [branches])

  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color="#3d2b22" roughness={0.92} />
    </mesh>
  )
}

// ─── Cherry blossom cluster (5 petals + center) ─────────────────────────────
interface BlossomClusterProps {
  position: THREE.Vector3
  rotation: THREE.Euler
  scale: number
  color: string
  leafIndex: number
  isFalling: boolean
  onFallDone: () => void
  isShaking: boolean
  shakePhase: number
}

const PETAL_COUNT = 5

function BlossomCluster({
  position,
  rotation,
  scale,
  color,
  leafIndex,
  isFalling,
  onFallDone,
  isShaking,
  shakePhase,
}: BlossomClusterProps) {
  const ref = useRef<THREE.Group>(null!)
  const velRef = useRef({ vy: 0, vx: (seeded(leafIndex * 7) - 0.5) * 0.04, vz: (seeded(leafIndex * 11) - 0.5) * 0.04 })
  const doneRef = useRef(false)
  const baseY = position.y

  // Reset fall state each time this blossom is selected to fall — guards
  // against stale vy/doneRef if the same index is picked in a later shake.
  useEffect(() => {
    if (isFalling) {
      doneRef.current = false
      velRef.current.vy = 0
    }
  }, [isFalling])

  useFrame((_, delta) => {
    if (!ref.current) return
    if (isFalling) {
      velRef.current.vy -= 9.8 * delta
      ref.current.position.y += velRef.current.vy * delta
      ref.current.position.x += velRef.current.vx
      ref.current.position.z += velRef.current.vz
      ref.current.rotation.x += 0.06 + seeded(leafIndex) * 0.02
      ref.current.rotation.z += 0.08
      if (ref.current.position.y < -6 && !doneRef.current) {
        doneRef.current = true
        onFallDone()
      }
    } else if (isShaking) {
      const t = shakePhase + leafIndex * 0.3
      ref.current.position.x = position.x + Math.sin(t * 18) * 0.12
      ref.current.position.y = baseY + Math.cos(t * 22 + leafIndex) * 0.08
      ref.current.position.z = position.z
    } else {
      // gentle sway — all three axes restored so post-fall blossoms snap cleanly back
      const t = Date.now() * 0.001 + leafIndex * 0.5
      ref.current.position.x = position.x + Math.sin(t * 0.7) * 0.06
      ref.current.position.y = baseY + Math.cos(t * 0.9) * 0.04
      ref.current.position.z = position.z
      ref.current.rotation.z = rotation.z + Math.sin(t * 0.6) * 0.08
    }
  })

  const petalAccent = useMemo(() => {
    const m = new THREE.Color(color).lerp(new THREE.Color('#ffffff'), 0.35)
    return `#${m.getHexString()}`
  }, [color])

  return (
    <group ref={ref} position={position.clone()} rotation={rotation} scale={scale}>
      {Array.from({ length: PETAL_COUNT }, (_, i) => {
        const a = (i / PETAL_COUNT) * Math.PI * 2 + seeded(leafIndex * 3 + i) * 0.4
        const r = 0.12
        const yLift = Math.sin(i * 1.7) * 0.025
        return (
          <mesh key={i} position={[Math.cos(a) * r * 0.55, yLift, Math.sin(a) * r * 0.55]}>
            <sphereGeometry args={[0.085, 6, 5]} />
            <meshStandardMaterial
              color={i % 2 === 0 ? color : petalAccent}
              roughness={0.38}
              emissive={color}
              emissiveIntensity={0.08}
            />
          </mesh>
        )
      })}
      <mesh position={[0, 0.015, 0]}>
        <sphereGeometry args={[0.04, 5, 4]} />
        <meshStandardMaterial color="#fff7ed" roughness={0.45} emissive="#fff1f2" emissiveIntensity={0.12} />
      </mesh>
    </group>
  )
}

// ─── Build tree skeleton ─────────────────────────────────────────────────────
interface BranchData {
  start: THREE.Vector3
  end: THREE.Vector3
  radiusBottom: number
  radiusTop: number
  depth: number
}

function buildTree(
  start: THREE.Vector3,
  direction: THREE.Vector3,
  length: number,
  radius: number,
  depth: number,
  seed: number,
  branches: BranchData[]
) {
  if (depth === 0 || length < 0.3) return
  const end = start.clone().add(direction.clone().multiplyScalar(length))
  branches.push({ start, end, radiusBottom: radius, radiusTop: radius * 0.65, depth })

  const numChildren = depth > 4 ? 2 : depth > 2 ? 3 : 4
  for (let i = 0; i < numChildren; i++) {
    const s = seed * 31 + i * 17 + depth * 7
    const angle = (seeded(s) - 0.5) * 1.45 + (i / numChildren - 0.5) * 1.0
    const twist = seeded(s + 3) * Math.PI * 2
    const childDir = direction.clone()
    childDir.applyEuler(new THREE.Euler(angle * 0.78, twist, angle * 0.32))
    childDir.normalize()
    buildTree(
      end.clone(),
      childDir,
      length * (0.62 + seeded(s + 5) * 0.15),
      radius * 0.62,
      depth - 1,
      s,
      branches
    )
  }
}

// ─── Leaf spawn positions (at branch tips, depth 1) ─────────────────────────
function getLeafPositions(branches: BranchData[], count: number): Array<{ pos: THREE.Vector3; rot: THREE.Euler; scale: number; color: string }> {
  const tips = branches.filter(b => b.depth <= 3)
  const colors = ['#fda4af', '#fb7185', '#f472b6', '#fecdd3', '#fbcfe8', '#fce7f3', '#e879a9']
  return Array.from({ length: count }).map((_, i) => {
    const tip = tips[i % tips.length]
    const s = i * 13 + 7
    const scatter = new THREE.Vector3(
      (seeded(s) - 0.5) * 0.72,
      seeded(s + 1) * 0.38,
      (seeded(s + 2) - 0.5) * 0.72
    )
    return {
      pos: tip.end.clone().add(scatter),
      rot: new THREE.Euler(seeded(s + 3) * Math.PI, seeded(s + 4) * Math.PI * 2, seeded(s + 5) * Math.PI),
      scale: 0.62 + seeded(s + 6) * 0.58,
      color: colors[i % colors.length],
    }
  })
}

// ─── Full tree scene mesh ────────────────────────────────────────────────────
interface TreeMeshProps {
  leaves: Leaf[]
  isShaking: boolean
  shakePhase: number
  fallingIndex: number | null
  onLeafFallDone: () => void
}

function TreeMesh({ leaves, isShaking, shakePhase, fallingIndex, onLeafFallDone }: TreeMeshProps) {
  const groupRef = useRef<THREE.Group>(null!)
  const leafCount = leaves.length

  const branches = useMemo(() => {
    const b: BranchData[] = []
    buildTree(new THREE.Vector3(0, -2, 0), new THREE.Vector3(0, 1, 0), 2.4, 0.22, 6, 42, b)
    return b
  }, [])

  const leafSlots = useMemo(() => getLeafPositions(branches, Math.max(leafCount, 1)), [branches, leafCount])
  const visibleLeaves = leafSlots.slice(0, leafCount)

  // Shake the whole group
  useFrame(() => {
    if (!groupRef.current) return
    if (isShaking) {
      groupRef.current.rotation.z = Math.sin(shakePhase * 18) * 0.07 * Math.max(0, 1 - shakePhase)
    } else {
      groupRef.current.rotation.z *= 0.85
    }
  })

  return (
    <group ref={groupRef} position={[0, -3.2, 0]}>
      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.02, 0]}>
        <circleGeometry args={[8, 32]} />
        <meshStandardMaterial color="#fdf2f8" roughness={1} />
      </mesh>

      {/* Trunk & branches — single merged mesh */}
      <TreeBranches branches={branches} />

      {/* Cherry blossoms — keys tied to DB ids so counts can change without swapping meshes */}
      {leaves.map((leaf, i) => {
        const l = visibleLeaves[i]
        if (!l) return null
        return (
          <BlossomCluster
            key={leaf.id}
            leafIndex={i}
            position={l.pos}
            rotation={l.rot}
            scale={l.scale}
            color={l.color}
            isFalling={fallingIndex === i}
            onFallDone={onLeafFallDone}
            isShaking={isShaking}
            shakePhase={shakePhase}
          />
        )
      })}
    </group>
  )
}

// ─── Camera that gently orbits when idle ────────────────────────────────────
function AutoRotate({ enabled }: { enabled: boolean }) {
  const { camera } = useThree()
  const angleRef = useRef(Math.atan2(camera.position.x, camera.position.z))
  useFrame((_, delta) => {
    if (!enabled) {
      // Keep angle in sync so rotation resumes from wherever the user left the camera
      angleRef.current = Math.atan2(camera.position.x, camera.position.z)
      return
    }
    angleRef.current += delta * 0.15
    const r = Math.sqrt(camera.position.x ** 2 + camera.position.z ** 2) || 9
    camera.position.x = Math.sin(angleRef.current) * r
    camera.position.z = Math.cos(angleRef.current) * r
    camera.lookAt(0, -1.35, 0)
  })
  return null
}

// ─── Main exported component ─────────────────────────────────────────────────
interface Props {
  leaves: Leaf[]
  onShakeComplete: (leaf: Leaf) => void
  onLeafRemoved: (id: string) => void
  isShaking: boolean
  setIsShaking: (v: boolean) => void
  remoteFall: { id: string; key: number } | null
  onRemoteFallResolved: (id: string | null) => void
  claimLocalShakeDelete: (id: string) => void
  releaseLocalShakeDelete: (id: string) => void
}

export default function TreeScene({
  leaves,
  onShakeComplete,
  onLeafRemoved,
  isShaking,
  setIsShaking,
  remoteFall,
  onRemoteFallResolved,
  claimLocalShakeDelete,
  releaseLocalShakeDelete,
}: Props) {
  const [shakePhase, setShakePhase] = useState(0)
  const [fallingIndex, setFallingIndex] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const shakeRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pendingLocalLeafRef = useRef<Leaf | null>(null)
  const activeRemoteFallIdRef = useRef<string | null>(null)
  const isShakingRef = useRef(false)
  const leavesRef = useRef(leaves)
  const isEmpty = leaves.length === 0

  useEffect(() => {
    leavesRef.current = leaves
  }, [leaves])

  useEffect(() => {
    isShakingRef.current = isShaking
  }, [isShaking])

  const clearShakeInterval = useCallback(() => {
    if (shakeRef.current) {
      clearInterval(shakeRef.current)
      shakeRef.current = null
    }
  }, [])

  const startShakeInterval = useCallback(() => {
    clearShakeInterval()
    let phase = 0
    shakeRef.current = setInterval(() => {
      phase += 0.05
      setShakePhase(phase)
      if (phase >= 1 && shakeRef.current) clearInterval(shakeRef.current)
    }, 16)
  }, [clearShakeInterval])

  const resetShakeVisual = useCallback(() => {
    clearShakeInterval()
    setShakePhase(0)
    setIsShaking(false)
    setFallingIndex(null)
    pendingLocalLeafRef.current = null
    activeRemoteFallIdRef.current = null
  }, [clearShakeInterval, setIsShaking])

  const handleShake = async () => {
    if (isShaking || isEmpty) return
    setIsShaking(true)
    pendingLocalLeafRef.current = null
    activeRemoteFallIdRef.current = null
    startShakeInterval()

    try {
      const res = await fetch('/api/leaves/random')
      if (res.status === 404) {
        resetShakeVisual()
        return
      }
      const data = (await res.json()) as Leaf & { error?: string }
      if (!res.ok) {
        resetShakeVisual()
        return
      }
      claimLocalShakeDelete(data.id)
      pendingLocalLeafRef.current = data
      const idx = leavesRef.current.findIndex(l => l.id === data.id)
      setFallingIndex(idx >= 0 ? idx : 0)
    } catch {
      resetShakeVisual()
    }
  }

  const handleFallDone = useCallback(() => {
    clearShakeInterval()
    const localLeaf = pendingLocalLeafRef.current
    const remoteId = activeRemoteFallIdRef.current
    pendingLocalLeafRef.current = null
    activeRemoteFallIdRef.current = null
    setFallingIndex(null)
    setIsShaking(false)
    setShakePhase(0)

    if (localLeaf) {
      onLeafRemoved(localLeaf.id)
      releaseLocalShakeDelete(localLeaf.id)
      onShakeComplete(localLeaf)
    } else if (remoteId !== null) {
      onRemoteFallResolved(remoteId)
    }
  }, [clearShakeInterval, onLeafRemoved, onShakeComplete, onRemoteFallResolved, releaseLocalShakeDelete, setIsShaking])

  useEffect(() => {
    if (!remoteFall) return
    const id = remoteFall.id
    const idx = leavesRef.current.findIndex(l => l.id === id)
    if (idx === -1) {
      onRemoteFallResolved(null)
      return
    }
    if (isShakingRef.current) {
      if (pendingLocalLeafRef.current?.id === id) {
        onRemoteFallResolved(null)
        return
      }
      onRemoteFallResolved(id)
      return
    }
    activeRemoteFallIdRef.current = id
    pendingLocalLeafRef.current = null
    setIsShaking(true)
    startShakeInterval()
    setFallingIndex(idx)
  }, [remoteFall?.key, onRemoteFallResolved, startShakeInterval, setIsShaking])

  useEffect(() => {
    if (fallingIndex !== null && fallingIndex >= leaves.length) {
      handleFallDone()
    }
  }, [fallingIndex, leaves.length, handleFallDone])

  useEffect(() => {
    return () => {
      clearShakeInterval()
    }
  }, [clearShakeInterval])

  return (
    <div className="relative w-full flex flex-col items-center max-w-[100vw] mx-auto px-0">
      {/* 3D view — height leaves room for header + controls on small screens; dpr cap saves mobile GPU */}
      <div
        className="relative w-full flex flex-col items-center shrink-0"
        style={{ height: 'clamp(420px, calc(100dvh - 15.5rem), 900px)' }}
      >
        <div
          className="w-full h-full rounded-xl sm:rounded-2xl overflow-hidden border border-rose-100 shadow-sm bg-white [touch-action:none] overscroll-none"
          role="img"
          aria-label="Interactive three-dimensional cherry blossom tree. Drag or swipe with one finger to rotate. Pinch with two fingers, or scroll, to zoom."
        >
        <Canvas
          camera={{ position: [0, 1.55, 9.45], fov: 50 }}
          dpr={[1, 2]}
          gl={{ antialias: false, alpha: false }}
          style={{ background: '#ffffff', touchAction: 'none' }}
          onCreated={({ gl }) => {
            gl.setClearColor('#ffffff', 1)
          }}
          onPointerDown={() => setIsDragging(true)}
          onPointerUp={() => setIsDragging(false)}
          onPointerCancel={() => setIsDragging(false)}
        >
          <color attach="background" args={['#ffffff']} />
          <ambientLight intensity={0.55} />
          <directionalLight position={[5, 10, 5]} intensity={1.15} color="#ffffff" />
          <directionalLight position={[-4, 6, -3]} intensity={0.42} color="#fce7f3" />

          <TreeMesh
            leaves={leaves}
            isShaking={isShaking}
            shakePhase={shakePhase}
            fallingIndex={fallingIndex}
            onLeafFallDone={handleFallDone}
          />

          <AutoRotate enabled={!isDragging && !isShaking} />
          <OrbitControls
            enableZoom={true}
            enablePan={false}
            minDistance={4}
            maxDistance={16}
            minPolarAngle={Math.PI * 0.1}
            maxPolarAngle={Math.PI * 0.75}
            target={[0, -1.35, 0]}
          />

          {/* Fog — same as background so the viewport stays pure white */}
          <fog attach="fog" args={['#ffffff', 14, 30]} />
        </Canvas>
        </div>

        {/* Empty state overlay */}
        <AnimatePresence>
          {isEmpty && (
            <motion.div
              className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="bg-white/90 backdrop-blur-sm border border-rose-200 rounded-2xl px-6 py-5 sm:px-8 sm:py-6 text-center max-w-xs shadow-lg">
                <p className="text-rose-900 font-semibold text-base sm:text-lg leading-tight">The sakura is bare</p>
                <p className="text-rose-700/90 text-sm mt-2">No blossoms yet. Add the first one.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Controls hint */}
      <p className="text-rose-800/75 text-xs mt-2 sm:mt-3 text-center px-2 select-none max-w-md">
        <span className="sm:hidden">Swipe to rotate · Pinch to zoom</span>
        <span className="hidden sm:inline">Drag to rotate · Scroll or pinch to zoom</span>
      </p>

      {/* Shake tree */}
      <motion.button
        type="button"
        onClick={handleShake}
        disabled={isShaking || isEmpty}
        className="mt-3 w-full max-w-md min-h-12 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-base shadow-lg shadow-rose-900/25 transition-[transform,background] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-800"
        whileHover={{ scale: isEmpty ? 1 : 1.02 }}
        whileTap={{ scale: isEmpty ? 1 : 0.98 }}
      >
        {isShaking ? 'Shaking…' : isEmpty ? 'No blossoms left' : 'Shake the tree'}
      </motion.button>
      {!isEmpty && (
        <p className="text-rose-800/80 text-xs mt-1.5 mb-1 text-center px-4 select-none max-w-md">
          One blossom falls — gone from the tree forever
        </p>
      )}
    </div>
  )
}
