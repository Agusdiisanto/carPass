import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import type { Parte } from '../../domain/carpass/vehicleParts'
import { tipoParteLabel } from '../../domain/carpass/vehicleParts'
import { getPartesVehiculo, hasContractAddress } from '../../hooks/useVehicleParts'

// Tipo enum: 0=MOTOR, 1=CAJA_CAMBIOS, 2=PDI, 3=PDR, 4=CAPOT, 5=BAUL

// ── Color constants ───────────────────────────────────────────────────────────
const HEX_NONE     = 0x374151
const HEX_ORIGINAL = 0x16a34a
const HEX_REPLACED = 0xd97706
const HEX_SEL      = 0x60a5fa

const GRID_ORDER = [4, 0, 2, 3, 1, 5]

function partHex(p: Parte | undefined): number {
  if (!p || !p.numeroGrabado.trim()) return HEX_NONE
  return p.reemplazada ? HEX_REPLACED : HEX_ORIGINAL
}

function dotStr(p: Parte | undefined): string {
  if (!p || !p.numeroGrabado.trim()) return '#374151'
  return p.reemplazada ? '#b45309' : '#166534'
}

// ── Three.js car builder ──────────────────────────────────────────────────────
//
// Y-up, front = −Z, ground = Y=0. Wheel r=0.32, centers Y=0.32.
//
// Continuous body spine (all panels connected edge-to-edge):
//   FrontBumper(Z=−2.12) → Hood(−2.12→−0.95) → Cowl(Y=0.62,Z=−0.95)
//   → Windshield(center Z=−0.79,Y=0.895,len=0.63,rx=−0.53)
//   → Roof(Z=−0.63→+0.53) → RearGlass(center Z=+0.76,Y=0.895,len=0.71,rx=+0.70)
//   → Trunk(+0.99→+2.12) → RearBumper(Z=+2.12)
//
// Cabin doors: Z=−0.95→+0.99 (length 1.94), center Z=+0.02
// Wheelbase: FL Z=−1.26, RL Z=+1.20

type CarBuild = {
  carGroup: THREE.Group
  partMeshes: THREE.Mesh[]
}

function buildCar(): CarBuild {
  const carGroup = new THREE.Group()

  const BODY = 0x1d2d40
  const mkB  = (sh = 55) => new THREE.MeshPhongMaterial({
    color: BODY, shininess: sh, specular: new THREE.Color(0x223a55),
  })
  const mkDk = () => new THREE.MeshPhongMaterial({ color: 0x060c15, shininess: 8 })
  const glMat = new THREE.MeshPhongMaterial({
    color: 0xa8d4ea, transparent: true, opacity: 0.46,
    side: THREE.DoubleSide, shininess: 180,
  })
  const tireMat = new THREE.MeshPhongMaterial({ color: 0x0e1520, shininess: 4 })
  const rimMat  = new THREE.MeshPhongMaterial({
    color: 0x8090a4, shininess: 135, specular: new THREE.Color(0xbbccdd),
  })
  const hubMat  = new THREE.MeshPhongMaterial({
    color: 0xc8d8e8, shininess: 200, specular: new THREE.Color(0xffffff),
  })
  const lFMat = new THREE.MeshPhongMaterial({
    color: 0xf8f8f0, shininess: 95,
    emissive: new THREE.Color(0x1a1800), emissiveIntensity: 0.3,
  })
  const lRMat = new THREE.MeshPhongMaterial({
    color: 0xcc2020, shininess: 80,
    emissive: new THREE.Color(0x3d0000), emissiveIntensity: 0.5,
  })
  const drlMat = new THREE.MeshPhongMaterial({
    color: 0xe8f2ff, shininess: 50,
    emissive: new THREE.Color(0x7799ff), emissiveIntensity: 0.65,
  })
  const grillMat = new THREE.MeshPhongMaterial({ color: 0x040810, shininess: 10 })
  const chrMat   = new THREE.MeshPhongMaterial({
    color: 0xc0d0e0, shininess: 180, specular: new THREE.Color(0xffffff),
  })

  function addS(
    geo: THREE.BufferGeometry, mat: THREE.Material,
    x: number, y: number, z: number, rx = 0,
  ) {
    const m = new THREE.Mesh(geo, mat)
    m.position.set(x, y, z); m.rotation.x = rx; carGroup.add(m)
  }

  // ── Lower body sill (full length) ──────────────────────────────────────────
  addS(new THREE.BoxGeometry(1.84, 0.44, 4.24), mkB(),  0, 0.37, 0)
  addS(new THREE.BoxGeometry(1.92, 0.07, 3.60), mkDk(), 0, 0.12, 0)     // rocker panel
  addS(new THREE.BoxGeometry(1.68, 0.05, 4.00), mkDk(), 0, 0.06, 0)     // underbody

  // ── Hood: Z=−2.12→−0.95, slopes Y=0.555→Y=0.622 (rx=+0.055) ───────────────
  addS(new THREE.BoxGeometry(1.76, 0.065, 1.18), mkB(), 0, 0.589, -1.535,  0.055)
  // Hood-to-cowl fill strip
  addS(new THREE.BoxGeometry(1.84, 0.065, 0.18), mkB(), 0, 0.622, -0.965)

  // ── Cabin shoulder shelf (Z=−0.95→+0.99) ───────────────────────────────────
  addS(new THREE.BoxGeometry(1.68, 0.07, 1.94), mkB(), 0, 0.635, 0.02)

  // ── Cabin walls (doors) Z=−0.95→+0.99, center Z=+0.02 ─────────────────────
  addS(new THREE.BoxGeometry(1.58, 0.54, 1.94), mkB(),   0, 0.905, 0.02)

  // ── B-pillars ──────────────────────────────────────────────────────────────
  addS(new THREE.BoxGeometry(0.052, 0.54, 0.12), mkDk(), -0.799, 0.905, 0.02)
  addS(new THREE.BoxGeometry(0.052, 0.54, 0.12), mkDk(),  0.799, 0.905, 0.02)

  // ── Roof: Z=−0.63→+0.53, center Z=−0.05 ─────────────────────────────────
  addS(new THREE.BoxGeometry(1.42, 0.08, 1.16), mkB(80), 0, 1.18, -0.05)
  addS(new THREE.BoxGeometry(1.50, 0.02, 1.16), mkDk(),  0, 1.14, -0.05) // drip rail

  // ── Front windshield ────────────────────────────────────────────────────────
  // Bottom edge: (Z=−0.950, Y=0.620)  Top edge: (Z=−0.632, Y=1.175)
  // dZ=0.318, dY=0.555 → len=0.634, rx=−atan(0.318/0.555)=−0.520 rad
  // Center: Z=(−0.950+−0.632)/2=−0.791, Y=(0.620+1.175)/2=0.898
  addS(new THREE.BoxGeometry(1.36, 0.635, 0.05), glMat, 0, 0.898, -0.791, -0.520)
  // Cowl trim strip at base of windshield
  addS(new THREE.BoxGeometry(1.44, 0.065, 0.15), mkB(), 0, 0.635, -0.950)
  // A-pillar cover strips (L/R sides of windshield frame)
  addS(new THREE.BoxGeometry(0.06, 0.635, 0.05), mkDk(), -0.715, 0.898, -0.791, -0.520)
  addS(new THREE.BoxGeometry(0.06, 0.635, 0.05), mkDk(),  0.715, 0.898, -0.791, -0.520)

  // ── Rear glass ───────────────────────────────────────────────────────────────
  // Top edge: (Z=+0.530, Y=1.175)  Bottom edge: (Z=+0.985, Y=0.620)
  // dZ=0.455, dY=0.555 → len=0.720, rx=+atan(0.455/0.555)=+0.685 rad
  // Center: Z=(0.530+0.985)/2=+0.758, Y=(1.175+0.620)/2=0.898
  addS(new THREE.BoxGeometry(1.36, 0.720, 0.05), glMat, 0, 0.898, 0.758, 0.685)
  // Rear shelf trim
  addS(new THREE.BoxGeometry(1.44, 0.065, 0.15), mkB(), 0, 0.635, 0.990)
  // C-pillar cover strips
  addS(new THREE.BoxGeometry(0.06, 0.720, 0.05), mkDk(), -0.715, 0.898, 0.758, 0.685)
  addS(new THREE.BoxGeometry(0.06, 0.720, 0.05), mkDk(),  0.715, 0.898, 0.758, 0.685)

  // ── Side windows (L & R) ─────────────────────────────────────────────────────
  // Front door pane: Z=−0.88 to −0.02, center=−0.45 (w=0.86 minus B-pillar gap)
  addS(new THREE.BoxGeometry(0.04, 0.40, 0.84), glMat, -0.797, 1.00, -0.45)
  addS(new THREE.BoxGeometry(0.04, 0.40, 0.84), glMat,  0.797, 1.00, -0.45)
  // Rear door pane: Z=+0.06 to +0.90, center=+0.48
  addS(new THREE.BoxGeometry(0.04, 0.38, 0.82), glMat, -0.797, 0.99, 0.49)
  addS(new THREE.BoxGeometry(0.04, 0.38, 0.82), glMat,  0.797, 0.99, 0.49)
  // Window belt trim (chrome strip at beltline)
  addS(new THREE.BoxGeometry(0.04, 0.02, 1.94), chrMat, -0.800, 0.81, 0.02)
  addS(new THREE.BoxGeometry(0.04, 0.02, 1.94), chrMat,  0.800, 0.81, 0.02)

  // ── Trunk: Z=+0.99→+2.12, slopes Y=0.622→Y=0.590 (rx=−0.028) ───────────────
  addS(new THREE.BoxGeometry(1.76, 0.065, 1.14), mkB(), 0, 0.585, 1.555, -0.028)
  // Trunk-to-cabin fill
  addS(new THREE.BoxGeometry(1.84, 0.065, 0.18), mkB(), 0, 0.622, 1.00)
  // Trunk spoiler lip
  addS(new THREE.BoxGeometry(1.38, 0.038, 0.07), mkDk(), 0, 0.625, 2.09)

  // ── Wheel arch fender flares ──────────────────────────────────────────────────
  addS(new THREE.BoxGeometry(1.90, 0.09, 0.74), mkB(35), 0, 0.61, -1.26)
  addS(new THREE.BoxGeometry(1.90, 0.09, 0.74), mkB(35), 0, 0.61,  1.20)

  // ── Front bumper ──────────────────────────────────────────────────────────────
  addS(new THREE.BoxGeometry(1.88, 0.24, 0.09), mkB(),  0, 0.22, -2.13)
  addS(new THREE.BoxGeometry(1.76, 0.13, 0.10), mkDk(), 0, 0.09, -2.13)
  addS(new THREE.BoxGeometry(1.88, 0.10, 0.08), mkB(),  0, 0.41, -2.14)
  addS(new THREE.BoxGeometry(1.50, 0.04, 0.08), mkDk(), 0, 0.03, -2.13)

  // ── Rear bumper ───────────────────────────────────────────────────────────────
  addS(new THREE.BoxGeometry(1.88, 0.24, 0.09), mkB(),  0, 0.22, 2.13)
  addS(new THREE.BoxGeometry(1.76, 0.13, 0.10), mkDk(), 0, 0.09, 2.13)
  addS(new THREE.BoxGeometry(1.88, 0.10, 0.08), mkB(),  0, 0.41, 2.14)
  addS(new THREE.BoxGeometry(1.50, 0.04, 0.08), mkDk(), 0, 0.03, 2.13)

  // ── Headlights (housing + beam + DRL) ─────────────────────────────────────────
  for (const sx of [-1, 1] as const) {
    addS(new THREE.BoxGeometry(0.60, 0.16, 0.06), mkDk(),  sx*0.57, 0.565, -2.14)
    addS(new THREE.BoxGeometry(0.52, 0.10, 0.07), lFMat,   sx*0.56, 0.550, -2.15)
    addS(new THREE.BoxGeometry(0.46, 0.024, 0.05), drlMat, sx*0.54, 0.650, -2.15)
  }

  // ── Taillights ────────────────────────────────────────────────────────────────
  for (const sx of [-1, 1] as const) {
    addS(new THREE.BoxGeometry(0.54, 0.22, 0.07), lRMat, sx*0.60, 0.49, 2.14)
  }
  addS(new THREE.BoxGeometry(0.58, 0.024, 0.06), lRMat, 0, 0.60, 2.14) // center strip

  // ── Grille ────────────────────────────────────────────────────────────────────
  addS(new THREE.BoxGeometry(0.88, 0.26, 0.05), chrMat,   0, 0.37, -2.14)
  addS(new THREE.BoxGeometry(0.80, 0.18, 0.07), grillMat, 0, 0.37, -2.15)
  addS(new THREE.BoxGeometry(0.07, 0.07, 0.04), chrMat,   0, 0.37, -2.14) // center badge

  // ── Door character lines ──────────────────────────────────────────────────────
  addS(new THREE.BoxGeometry(1.88, 0.013, 2.60), mkB(95), 0, 0.46, 0)
  addS(new THREE.BoxGeometry(1.88, 0.013, 2.40), mkB(95), 0, 0.61, 0)

  // ── Side mirrors ──────────────────────────────────────────────────────────────
  for (const sx of [-1, 1] as const) {
    addS(new THREE.BoxGeometry(0.11, 0.064, 0.18), mkB(),  sx*0.942, 0.780, -0.95)
    addS(new THREE.BoxGeometry(0.02, 0.050, 0.14), mkDk(), sx*0.997, 0.780, -0.95)
  }

  // ── Wheels + rims ─────────────────────────────────────────────────────────────
  const wGeo   = new THREE.CylinderGeometry(0.32, 0.32, 0.24, 28)
  const rGeo   = new THREE.CylinderGeometry(0.20, 0.20, 0.25, 16)
  const hubGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.26, 8)
  const HP = Math.PI / 2
  for (const [wx, wy, wz] of [
    [-0.97, 0.32, -1.26], [0.97, 0.32, -1.26],
    [-0.97, 0.32,  1.20], [0.97, 0.32,  1.20],
  ] as [number, number, number][]) {
    const wm = new THREE.Mesh(wGeo, tireMat)
    wm.position.set(wx, wy, wz); wm.rotation.z = HP; carGroup.add(wm)
    const rm = new THREE.Mesh(rGeo, rimMat)
    rm.position.set(wx, wy, wz); rm.rotation.z = HP; carGroup.add(rm)
    const hm = new THREE.Mesh(hubGeo, hubMat)
    hm.position.set(wx, wy, wz); hm.rotation.z = HP; carGroup.add(hm)
  }


  // ── Interactable part meshes ──────────────────────────────────────────────
  const partMeshes: THREE.Mesh[] = []

  function addPart(
    tipo: number, geo: THREE.BufferGeometry,
    x: number, y: number, z: number, rx = 0,
  ) {
    const mat = new THREE.MeshPhongMaterial({
      color: HEX_NONE, shininess: 90, specular: new THREE.Color(0x223344),
    })
    const m = new THREE.Mesh(geo, mat)
    m.position.set(x, y, z)
    m.rotation.x = rx
    m.userData.tipo = tipo
    carGroup.add(m)
    partMeshes.push(m)
  }

  addPart(4, new THREE.BoxGeometry(1.74, 0.065, 1.16), 0,      0.601,  -1.535,  0.055) // CAPOT
  addPart(0, new THREE.BoxGeometry(1.50, 0.44,  0.065), 0,     0.370,  -2.135)          // MOTOR
  addPart(2, new THREE.BoxGeometry(0.065, 0.54, 1.94), -0.922, 0.905,   0.020)          // PDI
  addPart(3, new THREE.BoxGeometry(0.065, 0.54, 1.94),  0.922, 0.905,   0.020)          // PDR
  addPart(1, new THREE.BoxGeometry(0.46,  0.045, 2.50), 0,     0.275,   0.020)          // CAJA
  addPart(5, new THREE.BoxGeometry(1.74,  0.065, 1.12), 0,     0.598,   1.555, -0.028)  // BAUL

  return { carGroup, partMeshes }
}

// ── Camera presets per part ──────────────────────────────────────────────────
// eye = camera world position, at = lookAt target, rotY = carGroup.rotation.y
const DEFAULT_EYE: [number,number,number] = [-3.6, 1.9, 5.2]
const DEFAULT_AT:  [number,number,number] = [0, 0.62, -0.1]
const DEFAULT_ROT = 0

const PART_CAM: Record<number, {
  eye: [number,number,number]
  at:  [number,number,number]
  rotY: number
}> = {
  4: { eye: [-2.4, 1.4, -2.2], at: [0,    0.60, -1.5],  rotY:  0.15 }, // CAPOT  – front 3/4
  0: { eye: [-1.4, 0.8, -4.0], at: [0,    0.37, -2.1],  rotY:  0.0  }, // MOTOR  – straight front
  2: { eye: [-4.2, 1.1,  0.3], at: [-0.9, 0.90,  0.0],  rotY:  0.0  }, // PDI    – left side
  3: { eye: [ 4.2, 1.1,  0.3], at: [ 0.9, 0.90,  0.0],  rotY:  0.0  }, // PDR    – right side
  1: { eye: [-2.2, 0.5,  0.6], at: [0,    0.28,  0.0],  rotY:  0.0  }, // CAJA   – low centre
  5: { eye: [-2.5, 2.4, 4.6], at: [0, 0.60, 1.55], rotY: 0 }, // BAUL – rear elevated 3/4
}

// ── Main component ────────────────────────────────────────────────────────────

export function VehiclePartsStatusDiagram({
  tokenId,
  refreshKey = 0,
}: {
  tokenId: bigint
  refreshKey?: number
}) {
  const wrapRef   = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  type ThreeCtx = {
    renderer: THREE.WebGLRenderer
    scene: THREE.Scene
    camera: THREE.PerspectiveCamera
    carGroup: THREE.Group
    partMeshes: THREE.Mesh[]
    raf: number
    autoRotate: boolean        // stops when a part is selected
    // camera fly-to targets (mutated by color+camera effect)
    camEye:   THREE.Vector3
    camAt:    THREE.Vector3
    lookNow:  THREE.Vector3   // current interpolated lookAt
    rotYTgt:  number          // target carGroup.rotation.y
  }
  const ctxRef = useRef<ThreeCtx | null>(null)

  const [isLoading, setIsLoading] = useState(true)
  const [partes,    setPartes]    = useState<Parte[]>([])
  const [selected,  setSelected]  = useState<number | null>(null)

  // ── Fetch ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!hasContractAddress) { setIsLoading(false); return }
    let cancelled = false
    setIsLoading(true)
    getPartesVehiculo(tokenId)
      .then(r => { if (!cancelled) { setPartes(r); setIsLoading(false) } })
      .catch(() => { if (!cancelled) setIsLoading(false) })
    return () => { cancelled = true }
  }, [tokenId, refreshKey])

  // ── Three.js setup (runs once on mount) ───────────────────────────────────
  useEffect(() => {
    const wrap   = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return

    const { width: W0, height: H0 } = wrap.getBoundingClientRect()
    const W = W0 || 380
    const H = H0 || 285

    const scene  = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(38, W / H, 0.1, 50)
    // Front-left 3/4 view: slightly above, showing front and left side
    camera.position.set(-3.6, 1.9, 5.2)
    camera.lookAt(0, 0.62, -0.1)

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(W, H)
    renderer.setClearColor(0x000000, 0)

    // 4-point lighting: key + fill + rim + ground bounce
    scene.add(new THREE.AmbientLight(0xffffff, 0.42))
    const sun = new THREE.DirectionalLight(0xffffff, 1.30)
    sun.position.set(-4, 9, 4)   // front-top-left (matches camera side)
    scene.add(sun)
    const fill = new THREE.DirectionalLight(0x4466aa, 0.32)
    fill.position.set(5, 2, -4)
    scene.add(fill)
    const rim = new THREE.DirectionalLight(0x223355, 0.22)
    rim.position.set(0, -0.5, 5)
    scene.add(rim)
    const ground = new THREE.DirectionalLight(0x112233, 0.16)
    ground.position.set(0, -3, 0)  // ground bounce
    scene.add(ground)

    const { carGroup, partMeshes } = buildCar()
    scene.add(carGroup)

    const camEye  = new THREE.Vector3(...DEFAULT_EYE)
    const camAt   = new THREE.Vector3(...DEFAULT_AT)
    const lookNow = new THREE.Vector3(...DEFAULT_AT)
    const LERP_K  = 0.072  // smoothing factor (lower = smoother/slower)

    // Create ctx BEFORE animate so the loop can read fields by reference
    const ctx: ThreeCtx = {
      renderer, scene, camera, carGroup, partMeshes, raf: 0,
      autoRotate: true,
      camEye, camAt, lookNow, rotYTgt: DEFAULT_ROT,
    }
    ctxRef.current = ctx

    function animate() {
      ctx.raf = requestAnimationFrame(animate)
      if (ctx.autoRotate) carGroup.rotation.y += 0.004

      // Smooth camera fly-to
      camera.position.lerp(ctx.camEye, LERP_K)
      ctx.lookNow.lerp(ctx.camAt, LERP_K)
      camera.lookAt(ctx.lookNow)

      // Smooth car rotation to preset angle
      carGroup.rotation.y += (ctx.rotYTgt - carGroup.rotation.y) * LERP_K

      renderer.render(scene, camera)
    }
    animate()

    // ── Drag rotation ───────────────────────────────────────────────────────
    let dragging = false
    let prevX = 0, prevY = 0
    let downX = 0, downY = 0

    function onPointerDown(e: PointerEvent) {
      dragging = true; ctx.autoRotate = false
      prevX = downX = e.clientX; prevY = downY = e.clientY
      canvas.setPointerCapture(e.pointerId)
      // Snap lerp targets to current state so drag doesn't fight fly-to
      ctx.camEye.copy(camera.position)
      ctx.camAt.copy(lookNow)
      ctx.rotYTgt = carGroup.rotation.y
    }

    function onPointerMove(e: PointerEvent) {
      if (!dragging) return
      carGroup.rotation.y += (e.clientX - prevX) * 0.012
      carGroup.rotation.x = Math.max(-0.55, Math.min(0.55,
        carGroup.rotation.x + (e.clientY - prevY) * 0.008))
      ctx.rotYTgt = carGroup.rotation.y  // keep in sync
      prevX = e.clientX; prevY = e.clientY
    }

    function onPointerUp(e: PointerEvent) {
      if (!dragging) return
      dragging = false
      if (Math.hypot(e.clientX - downX, e.clientY - downY) < 6) {
        const r2 = canvas.getBoundingClientRect()
        const ndc = new THREE.Vector2(
          ((e.clientX - r2.left) / r2.width) * 2 - 1,
          -((e.clientY - r2.top) / r2.height) * 2 + 1,
        )
        const ray = new THREE.Raycaster()
        ray.setFromCamera(ndc, camera)
        const hits = ray.intersectObjects(partMeshes, false)
        if (hits.length > 0) {
          const tipo = hits[0].object.userData.tipo as number
          setSelected(prev => prev === tipo ? null : tipo)
        } else {
          setSelected(null)
        }
      }
    }

    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerup',   onPointerUp)

    // ── Responsive ─────────────────────────────────────────────────────────
    const ro = new ResizeObserver(entries => {
      for (const e of entries) {
        const { width: w, height: h } = e.contentRect
        if (w > 0 && h > 0) {
          camera.aspect = w / h
          camera.updateProjectionMatrix()
          renderer.setSize(w, h)
        }
      }
    })
    ro.observe(wrap)

    return () => {
      cancelAnimationFrame(ctx.raf)
      ro.disconnect()
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup',   onPointerUp)
      scene.traverse(obj => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose()
          const mat = obj.material
          if (Array.isArray(mat)) mat.forEach(m => m.dispose())
          else mat.dispose()
        }
      })
      renderer.dispose()
      ctxRef.current = null
    }
  }, [])

  // ── Sync colors + camera fly-to when partes or selection changes ───────────
  useEffect(() => {
    const ctx = ctxRef.current
    if (!ctx) return

    // ── colors
    const pm = new Map(partes.map(p => [p.tipo, p]))
    for (const mesh of ctx.partMeshes) {
      const tipo = mesh.userData.tipo as number
      const mat  = mesh.material as THREE.MeshPhongMaterial
      const isSel = selected === tipo
      mat.color.setHex(isSel ? HEX_SEL : partHex(pm.get(tipo)))
      mat.emissive.setHex(isSel ? 0x1a3355 : 0x000000)
      mat.emissiveIntensity = isSel ? 0.6 : 0
    }

    // ── camera fly-to
    if (selected !== null && PART_CAM[selected]) {
      const p = PART_CAM[selected]
      ctx.autoRotate = false   // freeze rotation so fly-to is accurate
      ctx.camEye.set(...p.eye)
      ctx.camAt.set(...p.at)
      ctx.rotYTgt = p.rotY
    } else {
      ctx.autoRotate = true    // resume rotation when deselected
      ctx.camEye.set(...DEFAULT_EYE)
      ctx.camAt.set(...DEFAULT_AT)
      ctx.rotYTgt = DEFAULT_ROT
    }
  }, [partes, selected])

  const parteMap = new Map(partes.map(p => [p.tipo, p]))

  return (
    <div className="vpv">
      {/* ── 3D Canvas ─────────────────────────────────────────────────────── */}
      <div ref={wrapRef} className="vpv-canvas-wrap">
        <canvas ref={canvasRef} className="vpv-canvas" />
        {isLoading && <div className="vpv-overlay">Consultando autopartes…</div>}
      </div>

      <p className="vpv-hint">Arrastrá para girar · Tocá una parte para ver detalle</p>

      {/* ── Legend ────────────────────────────────────────────────────────── */}
      <div className="vpv-legend">
        <span className="vpv-leg vpv-leg--original">Original</span>
        <span className="vpv-leg vpv-leg--reemplazada">Reemplazada</span>
        <span className="vpv-leg vpv-leg--none">Sin datos</span>
      </div>

      {/* ── 6-part grid ───────────────────────────────────────────────────── */}
      <div className="vpv-grid">
        {GRID_ORDER.map(tipo => {
          const parte = parteMap.get(tipo)
          const registrada = parte && parte.numeroGrabado.trim().length > 0
          const isSel = selected === tipo
          const cls = [
            'vpv-card',
            registrada ? (parte!.reemplazada ? 'vpv-card--reemplazada' : 'vpv-card--original') : '',
            isSel ? 'vpv-card--sel' : '',
          ].filter(Boolean).join(' ')
          return (
            <div key={tipo} className={cls} onClick={() => setSelected(p => p === tipo ? null : tipo)}>
              <div className="vpv-card-head">
                <span className="vpv-dot" style={{ background: dotStr(parte) }} />
                <span className="vpv-card-name">{tipoParteLabel(tipo)}</span>
              </div>
              <p className={`vpv-card-num${!registrada ? ' vpv-card-num--empty' : ''}`}>
                {registrada ? `#${parte!.numeroGrabado}` : '—'}
              </p>
              {registrada && parte!.reemplazada && <span className="vpv-card-badge">Reemplazada</span>}
            </div>
          )
        })}
      </div>

      {/* ── Detail panel ──────────────────────────────────────────────────── */}
      {selected !== null && <PartDetail tipo={selected} parte={parteMap.get(selected)} />}
    </div>
  )
}

// ── Part detail ───────────────────────────────────────────────────────────────

function PartDetail({ tipo, parte }: { tipo: number; parte: Parte | undefined }) {
  const registrada = parte && parte.numeroGrabado.trim().length > 0
  const fecha = parte && parte.timestamp > 0n
    ? new Date(Number(parte.timestamp) * 1000).toLocaleDateString('es-AR',
        { day: '2-digit', month: 'short', year: 'numeric' })
    : '—'
  const cls = `vpv-detail${!registrada ? '' : parte!.reemplazada ? ' vpv-detail--reemplazada' : ' vpv-detail--original'}`
  return (
    <div className={cls}>
      <div className="vpv-detail-hdr">
        <p className="vpv-detail-title">{tipoParteLabel(tipo)}</p>
        {registrada && (
          <span className={`vpv-badge vpv-badge--${parte!.reemplazada ? 'reemplazada' : 'original'}`}>
            {parte!.reemplazada ? 'Reemplazada' : 'Original'}
          </span>
        )}
      </div>
      {!registrada ? (
        <p className="vpv-detail-empty">Sin datos on-chain para esta autoparte.</p>
      ) : (
        <>
          <div className="vpv-detail-row">
            <span className="vpv-detail-k">Nº Grabado</span>
            <span className="vpv-detail-v vpv-detail-v--mono">{parte!.numeroGrabado}</span>
          </div>
          <div className="vpv-detail-row">
            <span className="vpv-detail-k">Instalado</span>
            <span className="vpv-detail-v">{fecha}</span>
          </div>
          <div className="vpv-detail-row">
            <span className="vpv-detail-k">Taller / Registrador</span>
            <span className="vpv-detail-v vpv-detail-v--mono vpv-detail-v--addr">
              {parte!.instalador.slice(0, 6)}…{parte!.instalador.slice(-4)}
            </span>
          </div>
        </>
      )}
    </div>
  )
}

