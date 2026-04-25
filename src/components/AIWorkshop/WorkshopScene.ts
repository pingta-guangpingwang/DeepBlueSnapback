import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js'
import type { DBVSVisualFile, CharacterAction, ModuleStatus, TaskDifficulty } from '../../types/ai-workshop'

// Layout
const ROOM_SIZE = 3.5
const ROOM_HEIGHT = 0.5
const ROOM_SPACING = 4.5
const ROOM_Y = 0.35
const GROUND_SIZE = 28
const MOVE_DURATION = 0.8
const UAL1_URL = './assets/models/ual1.glb'
const FADE_DURATION = 0.15

// Action → clip mapping (use looping clips, NOT hit reactions)
const ACTION_CLIPS: Record<CharacterAction, string> = {
  idle: 'Idle_Loop',
  walking: 'Walk_Loop',
  fighting: 'Jog_Fwd_Loop',
  celebrating: 'NinjaJump_Idle_Loop',
  resting: 'Crouch_Idle_Loop',
}

const ROOM_COLORS: Record<ModuleStatus, { color: number; emissive: number }> = {
  empty:    { color: 0x334155, emissive: 0x000000 },
  active:   { color: 0x1e3a5f, emissive: 0x0a1e3f },
  complete: { color: 0x1a3a2a, emissive: 0x0a2a1a },
  building: { color: 0x3b2f1a, emissive: 0x2a1f0a },
}
const MONSTER_TINT: Record<TaskDifficulty, number> = {
  easy: 0x44bb44,
  medium: 0xfbbf24,
  hard: 0xef4444,
}

interface RoomEntry {
  group: THREE.Group
  box: THREE.Mesh
  mat: THREE.MeshStandardMaterial
  label: CSS2DObject
  light: THREE.PointLight | null
}

interface MonsterEntry {
  group: THREE.Group
  model: THREE.Group | null
  mixer: THREE.AnimationMixer | null
  action: THREE.AnimationAction | null
  idleAction: THREE.AnimationAction | null
  jogAction: THREE.AnimationAction | null
  body: THREE.Mesh | null            // fallback geometry, null after upgrade
  hpBg: THREE.Mesh
  hpFill: THREE.Mesh
  hpMat: THREE.MeshBasicMaterial
  label: CSS2DObject
  removing: boolean
  removeTime: number
  spawnTime: number
}

interface CharacterEntry {
  group: THREE.Group
  model: THREE.Group | null
  mixer: THREE.AnimationMixer | null
  actions: Map<string, THREE.AnimationAction>
  currentAction: string
  nameTag: CSS2DObject
  hpBg: THREE.Mesh
  hpFill: THREE.Mesh
  hpMat: THREE.MeshBasicMaterial
  moveFrom: THREE.Vector3
  moveTo: THREE.Vector3
  moveStart: number
  moving: boolean
  fallback: { body: THREE.Mesh; head: THREE.Mesh; hat: THREE.Mesh } | null
  loading: boolean
}

interface GLBCache {
  scene: THREE.Group
  clips: Map<string, THREE.AnimationClip>
}

export class WorkshopScene {
  private renderer: THREE.WebGLRenderer
  private cssRenderer: CSS2DRenderer
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private controls: OrbitControls
  private clock = new THREE.Clock()

  private rooms = new Map<string, RoomEntry>()
  private monsters = new Map<string, MonsterEntry>()
  private character: CharacterEntry | null = null

  private cameraMode: 'follow' | 'free' = 'follow'
  private lastInteraction = 0
  private prevData: DBVSVisualFile | null = null
  private layout = new Map<string, THREE.Vector3>()
  private characterBaseY = ROOM_Y + ROOM_HEIGHT / 2  // top of platform

  private gltfLoader: GLTFLoader
  private glbCache: GLBCache | null = null
  private glbLoadPromise: Promise<GLBCache | null> | null = null
  private disposed = false

  private roomGeo: THREE.BoxGeometry
  private easyGeo: THREE.SphereGeometry
  private medGeo: THREE.BoxGeometry
  private hardGeo: THREE.ConeGeometry

  constructor(container: HTMLElement) {
    const w = container.clientWidth
    const h = container.clientHeight

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(w, h)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.4
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFShadowMap
    this.renderer.setClearColor(0x0c1222, 1)
    container.appendChild(this.renderer.domElement)

    this.cssRenderer = new CSS2DRenderer()
    this.cssRenderer.setSize(w, h)
    this.cssRenderer.domElement.style.position = 'absolute'
    this.cssRenderer.domElement.style.top = '0'
    this.cssRenderer.domElement.style.left = '0'
    this.cssRenderer.domElement.style.pointerEvents = 'none'
    container.appendChild(this.cssRenderer.domElement)

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x0c1222)
    this.scene.fog = new THREE.FogExp2(0x0c1222, 0.018)

    this.camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 200)
    this.camera.position.set(0, 12, 10)
    this.camera.lookAt(0, 0, 0)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.08
    this.controls.minDistance = 4
    this.controls.maxDistance = 40
    this.controls.maxPolarAngle = Math.PI / 2.2
    this.controls.minPolarAngle = Math.PI / 8
    this.controls.target.set(0, 0, 0)
    this.controls.addEventListener('start', () => {
      this.cameraMode = 'free'
      this.lastInteraction = this.clock.elapsedTime
    })

    // Lights
    this.scene.add(new THREE.AmbientLight(0xc8d0e0, 0.6))
    this.scene.add(new THREE.HemisphereLight(0x88bbff, 0x445566, 0.6))
    const dirLight = new THREE.DirectionalLight(0xfff8f0, 1.8)
    dirLight.position.set(8, 20, 6)
    dirLight.castShadow = true
    dirLight.shadow.mapSize.set(2048, 2048)
    dirLight.shadow.camera.near = 0.5
    dirLight.shadow.camera.far = 50
    dirLight.shadow.camera.left = -15
    dirLight.shadow.camera.right = 15
    dirLight.shadow.camera.top = 15
    dirLight.shadow.camera.bottom = -15
    dirLight.shadow.normalBias = 0.02
    this.scene.add(dirLight)

    // Ground
    const groundGeo = new THREE.BoxGeometry(GROUND_SIZE, 0.3, GROUND_SIZE)
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x1a2744, roughness: 0.85, metalness: 0.1 })
    const ground = new THREE.Mesh(groundGeo, groundMat)
    ground.position.y = -0.15
    ground.receiveShadow = true
    this.scene.add(ground)

    const grid = new THREE.GridHelper(GROUND_SIZE, GROUND_SIZE / 2, 0x1e3a5f, 0x1e3a5f)
    grid.position.y = 0.01
    ;(grid.material as THREE.Material).opacity = 0.15
    ;(grid.material as THREE.Material).transparent = true
    this.scene.add(grid)

    // Shared geometries
    this.roomGeo = new THREE.BoxGeometry(ROOM_SIZE, ROOM_HEIGHT, ROOM_SIZE)
    this.easyGeo = new THREE.SphereGeometry(0.2, 10, 8)
    this.medGeo = new THREE.BoxGeometry(0.35, 0.35, 0.35)
    this.hardGeo = new THREE.ConeGeometry(0.22, 0.45, 8)

    this.gltfLoader = new GLTFLoader()

    // Start loading GLB immediately
    this.loadMannequinModel()

    this.renderer.setAnimationLoop(() => this.onFrame())
  }

  update(data: DBVSVisualFile): void {
    this.computeLayout(data.modules)
    this.syncRooms(data)
    this.syncMonsters(data)
    this.syncCharacter(data)
    this.prevData = data
  }

  setCameraMode(mode: 'follow' | 'free'): void {
    this.cameraMode = mode
    this.lastInteraction = this.clock.elapsedTime
  }

  resize(w: number, h: number): void {
    if (w <= 0 || h <= 0) return
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h)
    this.cssRenderer.setSize(w, h)
  }

  dispose(): void {
    this.disposed = true
    this.renderer.setAnimationLoop(null)
    if (this.character?.mixer) this.character.mixer.stopAllAction()
    for (const [, r] of this.rooms) this.scene.remove(r.group)
    for (const [, m] of this.monsters) {
      m.mixer?.stopAllAction()
      this.scene.remove(m.group)
    }
    if (this.character) this.scene.remove(this.character.group)
    if (this.glbCache) {
      this.glbCache.scene.traverse(node => {
        if (node instanceof THREE.Mesh) {
          node.geometry.dispose()
          if (Array.isArray(node.material)) node.material.forEach(m => m.dispose())
          else node.material.dispose()
        }
      })
      this.glbCache = null
    }
    this.roomGeo.dispose()
    this.easyGeo.dispose()
    this.medGeo.dispose()
    this.hardGeo.dispose()
    this.renderer.dispose()
    this.renderer.domElement.remove()
    this.cssRenderer.domElement.remove()
  }

  // ---- Layout ----

  private computeLayout(modules: DBVSVisualFile['modules']): void {
    this.layout.clear()
    const n = modules.length
    const cols = Math.max(1, Math.ceil(Math.sqrt(n)))
    for (let i = 0; i < n; i++) {
      const col = i % cols
      const row = Math.floor(i / cols)
      const x = (col - (cols - 1) / 2) * ROOM_SPACING
      const z = (row - (Math.ceil(n / cols) - 1) / 2) * ROOM_SPACING
      this.layout.set(modules[i].id, new THREE.Vector3(x, ROOM_Y, z))
    }
  }

  // ---- Room Sync ----

  private syncRooms(data: DBVSVisualFile): void {
    const active = new Set(data.modules.map(m => m.id))
    for (const [id] of this.rooms) {
      if (!active.has(id)) {
        this.scene.remove(this.rooms.get(id)!.group)
        this.rooms.delete(id)
      }
    }
    for (const mod of data.modules) {
      let entry = this.rooms.get(mod.id)
      const pos = this.layout.get(mod.id)!
      const isActive = data.character.position === mod.id
      if (!entry) {
        entry = this.createRoom(mod, pos, isActive)
        this.rooms.set(mod.id, entry)
      }
      this.updateRoomStyle(entry, mod.status, isActive)
      entry.group.position.lerp(pos, 0.1)
    }
  }

  private createRoom(mod: DBVSVisualFile['modules'][0], pos: THREE.Vector3, isActive: boolean): RoomEntry {
    const group = new THREE.Group()
    group.position.copy(pos)

    const mat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7, metalness: 0.1 })
    const box = new THREE.Mesh(this.roomGeo, mat)
    box.castShadow = true
    box.receiveShadow = true
    group.add(box)

    // Edge glow
    const edgesGeo = new THREE.EdgesGeometry(this.roomGeo)
    const edgesMat = new THREE.LineBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.3 })
    group.add(new THREE.LineSegments(edgesGeo, edgesMat))

    const label = this.createLabel(mod.name, '9px', '#c8d6e5')
    label.position.set(0, -ROOM_HEIGHT / 2 - 0.15, ROOM_SIZE / 2 + 0.1)
    group.add(label)

    let light: THREE.PointLight | null = null
    if (isActive) {
      light = new THREE.PointLight(0x3b82f6, 0.4, 4)
      light.position.set(0, 0.6, 0)
      group.add(light)
    }

    this.scene.add(group)
    return { group, box, mat, label, light }
  }

  private updateRoomStyle(entry: RoomEntry, status: ModuleStatus, isActive: boolean): void {
    const c = ROOM_COLORS[status]
    entry.mat.color.setHex(isActive ? 0x1e3a5f : c.color)
    entry.mat.emissive.setHex(isActive ? 0x1a3a6f : c.emissive)
    if (isActive && !entry.light) {
      entry.light = new THREE.PointLight(0x3b82f6, 0.4, 4)
      entry.light.position.set(0, 0.6, 0)
      entry.group.add(entry.light)
    } else if (!isActive && entry.light) {
      entry.group.remove(entry.light)
      entry.light.dispose()
      entry.light = null
    }
  }

  // ---- Character Sync ----

  private syncCharacter(data: DBVSVisualFile): void {
    if (!this.character) {
      this.character = this.createCharacter()
    }
    const char = this.character
    const targetRoom = this.layout.get(data.character.position)
    if (!targetRoom) return

    const target = new THREE.Vector3(targetRoom.x, this.characterBaseY, targetRoom.z)

    if (this.prevData && this.prevData.character.position !== data.character.position) {
      char.moveFrom.copy(char.group.position)
      char.moveTo.copy(target)
      char.moveStart = this.clock.elapsedTime
      char.moving = true
    } else if (!char.moving) {
      char.group.position.lerp(target, 0.08)
    }

    const hpRatio = Math.max(0, Math.min(1, data.character.hp / 100))
    char.hpFill.scale.x = hpRatio
    char.hpMat.color.setHex(hpRatio > 0.6 ? 0x22c55e : hpRatio > 0.3 ? 0xf59e0b : 0xef4444)

    // Update name tag
    ;(char.nameTag.element as HTMLDivElement).textContent = data.character.name
  }

  private createCharacter(): CharacterEntry {
    const group = new THREE.Group()

    // Fallback geometry
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x4488ff, roughness: 0.5 })
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.5, 8), bodyMat)
    body.position.y = 0.25; body.castShadow = true; group.add(body)

    const headMat = new THREE.MeshStandardMaterial({ color: 0x6ba3ff, roughness: 0.4 })
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 8), headMat)
    head.position.y = 0.6; head.castShadow = true; group.add(head)

    const hatMat = new THREE.MeshStandardMaterial({ color: 0x6b21a8, roughness: 0.5 })
    const hat = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.3, 8), hatMat)
    hat.position.y = 0.85; hat.castShadow = true; group.add(hat)

    // HP bar
    const hpBg = new THREE.Mesh(
      new THREE.PlaneGeometry(0.7, 0.06),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.5 })
    )
    hpBg.position.y = 1.6; group.add(hpBg)

    const hpMat = new THREE.MeshBasicMaterial({ color: 0x22c55e })
    const hpFill = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.06), hpMat)
    hpFill.position.y = 1.6; hpFill.position.z = 0.001; group.add(hpFill)

    // Name tag (prominent, with background)
    const nameDiv = document.createElement('div')
    nameDiv.textContent = 'AI'
    nameDiv.style.cssText = `color:#fff;font-size:13px;font-weight:bold;font-family:-apple-system,sans-serif;background:rgba(59,130,246,0.7);padding:2px 8px;border-radius:4px;white-space:nowrap;pointer-events:none;user-select:none;`
    const nameTag = new CSS2DObject(nameDiv)
    nameTag.position.set(0, 1.85, 0)
    group.add(nameTag)

    group.position.set(0, this.characterBaseY, 0)
    this.scene.add(group)

    const entry: CharacterEntry = {
      group, model: null, mixer: null,
      actions: new Map(), currentAction: '',
      nameTag, hpBg, hpFill, hpMat,
      moveFrom: new THREE.Vector3(), moveTo: new THREE.Vector3(),
      moveStart: 0, moving: false,
      fallback: { body, head, hat },
      loading: false,
    }

    this.upgradeCharacterToMannequin(entry)
    return entry
  }

  // ---- GLB Loading ----

  private async loadMannequinModel(): Promise<GLBCache | null> {
    if (this.glbCache) return this.glbCache
    if (this.glbLoadPromise) return this.glbLoadPromise

    this.glbLoadPromise = (async () => {
      try {
        const gltf = await this.gltfLoader.loadAsync(UAL1_URL)
        const clips = new Map<string, THREE.AnimationClip>()
        for (const clip of gltf.animations ?? []) clips.set(clip.name, clip)
        this.glbCache = { scene: gltf.scene, clips }
        return this.glbCache
      } catch (err) {
        console.warn('[WorkshopScene] GLB load failed, using fallback:', err)
        return null
      }
    })()

    return this.glbLoadPromise
  }

  /** Build a tinted mannequin clone from cache. Returns null if cache not ready. */
  private buildMannequinClone(tint: number, targetHeight: number): {
    model: THREE.Group
    mixer: THREE.AnimationMixer
    idleAction: THREE.AnimationAction | null
    jogAction: THREE.AnimationAction | null
  } | null {
    if (!this.glbCache) return null

    const clone = skeletonClone(this.glbCache.scene) as THREE.Group

    // Scale
    const box = new THREE.Box3().setFromObject(clone)
    const h = box.max.y - box.min.y
    if (h > 0) clone.scale.setScalar(targetHeight / h)
    const scaledBox = new THREE.Box3().setFromObject(clone)
    clone.position.y = -scaledBox.min.y

    // Tint + shadows
    clone.traverse(node => {
      if (node instanceof THREE.Mesh) {
        node.castShadow = true
        node.receiveShadow = true
        if (Array.isArray(node.material)) {
          node.material = node.material.map((m: THREE.Material) => m.clone())
        } else {
          node.material = node.material.clone()
        }
        if ((node.material as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
          const mat = node.material as THREE.MeshStandardMaterial
          mat.color.set(tint)
          mat.emissive.set(tint).multiplyScalar(0.2)
          mat.emissiveIntensity = 0.15
        }
      }
    })

    const mixer = new THREE.AnimationMixer(clone)

    const idleClip = this.glbCache.clips.get('Idle_Loop')
    const jogClip = this.glbCache.clips.get('Push_Loop') ?? this.glbCache.clips.get('Jog_Fwd_Loop')

    const idleAction = idleClip ? mixer.clipAction(idleClip) : null
    const jogAction = jogClip ? mixer.clipAction(jogClip) : null

    if (idleAction) idleAction.play()

    return { model: clone, mixer, idleAction, jogAction }
  }

  private async upgradeCharacterToMannequin(entry: CharacterEntry): Promise<void> {
    if (entry.loading || entry.model) return
    entry.loading = true

    const cached = await this.loadMannequinModel()
    if (!cached || this.disposed || this.character !== entry) {
      entry.loading = false
      return
    }

    const result = this.buildMannequinClone(0x5599ff, 1.0)
    if (!result) { entry.loading = false; return }

    // Remove fallback
    if (entry.fallback) {
      entry.group.remove(entry.fallback.body)
      entry.group.remove(entry.fallback.head)
      entry.group.remove(entry.fallback.hat)
      entry.fallback.body.geometry.dispose()
      entry.fallback.head.geometry.dispose()
      entry.fallback.hat.geometry.dispose()
      entry.fallback = null
    }

    entry.group.add(result.model)
    entry.model = result.model
    entry.mixer = result.mixer

    // Build all action clips for the character
    for (const [actionName, clipName] of Object.entries(ACTION_CLIPS)) {
      const clip = cached.clips.get(clipName)
      if (!clip) continue
      entry.actions.set(actionName, entry.mixer.clipAction(clip))
    }

    // Start idle
    const idleAction = entry.actions.get('idle')
    if (idleAction) {
      idleAction.play()
      entry.currentAction = 'idle'
    }

    entry.loading = false
  }

  // ---- Monster Sync ----

  private syncMonsters(data: DBVSVisualFile): void {
    const activeIds = new Set(
      data.tasks.filter(t => t.status !== 'completed' && t.status !== 'failed').map(t => t.id)
    )

    for (const [id, m] of this.monsters) {
      if (!activeIds.has(id) && !m.removing) {
        m.removing = true
        m.removeTime = this.clock.elapsedTime
      }
    }

    for (const task of data.tasks) {
      if (task.status === 'completed' || task.status === 'failed') continue
      let entry = this.monsters.get(task.id)
      if (!entry) {
        const roomPos = this.layout.get(task.module)
        if (!roomPos) continue
        entry = this.createMonster(task, roomPos, data.tasks.indexOf(task))
        this.monsters.set(task.id, entry)
      }

      // Update HP bar (remaining HP = 100 - progress)
      const remaining = Math.max(0.01, (100 - task.progress) / 100)
      entry.hpFill.scale.x = remaining
      entry.hpMat.color.setHex(remaining > 0.6 ? 0xef4444 : remaining > 0.3 ? 0xf59e0b : 0x22c55e)

      // Switch monster animation based on task status
      if (entry.mixer && entry.idleAction && entry.jogAction) {
        if (task.status === 'active') {
          if (entry.action !== entry.jogAction) {
            entry.idleAction.fadeOut(FADE_DURATION)
            entry.jogAction.reset().fadeIn(FADE_DURATION).play()
            entry.action = entry.jogAction
          }
        } else {
          if (entry.action !== entry.idleAction) {
            entry.jogAction?.fadeOut(FADE_DURATION)
            entry.idleAction.reset().fadeIn(FADE_DURATION).play()
            entry.action = entry.idleAction
          }
        }
      }
    }
  }

  private createMonster(task: DBVSVisualFile['tasks'][0], roomPos: THREE.Vector3, idx: number): MonsterEntry {
    const group = new THREE.Group()
    const offsets = [[0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7], [0, 0.9], [0, -0.9]]
    const off = offsets[idx % offsets.length]
    const tint = MONSTER_TINT[task.difficulty]

    // Try mannequin clone immediately
    const mannequin = this.buildMannequinClone(tint, 0.65)
    let model: THREE.Group | null = null
    let mixer: THREE.AnimationMixer | null = null
    let idleAction: THREE.AnimationAction | null = null
    let jogAction: THREE.AnimationAction | null = null
    let body: THREE.Mesh | null = null

    if (mannequin) {
      model = mannequin.model
      mixer = mannequin.mixer
      idleAction = mannequin.idleAction
      jogAction = mannequin.jogAction
      // Active tasks play aggressive animation
      if (task.status === 'active' && jogAction) {
        idleAction?.fadeOut(0)
        jogAction.play()
      }
      group.add(model)
    } else {
      // Fallback simple geometry
      const geo = task.difficulty === 'easy' ? this.easyGeo : task.difficulty === 'medium' ? this.medGeo : this.hardGeo
      const mat = new THREE.MeshStandardMaterial({ color: tint, roughness: 0.5, emissive: tint, emissiveIntensity: 0.15 })
      body = new THREE.Mesh(geo, mat)
      body.position.y = ROOM_HEIGHT / 2 + 0.3
      body.castShadow = true
      group.add(body)
    }

    // HP bar (larger, billboard)
    const hpBg = new THREE.Mesh(
      new THREE.PlaneGeometry(0.7, 0.08),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.6 })
    )
    hpBg.position.y = 1.1
    group.add(hpBg)

    const hpMat = new THREE.MeshBasicMaterial({ color: 0xef4444 })
    const hpFill = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.08), hpMat)
    hpFill.position.y = 1.1
    hpFill.position.z = 0.001
    group.add(hpFill)

    const label = this.createLabel(task.description, '8px', '#94a3b8')
    label.position.set(0, 1.3, 0)
    group.add(label)

    group.position.set(roomPos.x + off[0], ROOM_Y + ROOM_HEIGHT / 2, roomPos.z + off[1])
    group.scale.setScalar(0.01)
    this.scene.add(group)

    return {
      group, model, mixer,
      action: task.status === 'active' ? jogAction : idleAction,
      idleAction, jogAction,
      body, hpBg, hpFill, hpMat, label,
      removing: false, removeTime: 0,
      spawnTime: this.clock.elapsedTime,
    }
  }

  // ---- Helpers ----

  private createLabel(text: string, size: string, color: string): CSS2DObject {
    const div = document.createElement('div')
    div.textContent = text
    div.style.cssText = `color:${color};font-size:${size};font-family:-apple-system,sans-serif;text-shadow:0 1px 3px rgba(0,0,0,0.9);white-space:nowrap;pointer-events:none;user-select:none;`
    return new CSS2DObject(div)
  }

  // ---- Animation ----

  private playCharacterAction(entry: CharacterEntry, actionName: CharacterAction): void {
    if (!entry.mixer || entry.currentAction === actionName) return

    const prev = entry.actions.get(entry.currentAction)
    const next = entry.actions.get(actionName)
    if (!next) return

    if (prev) prev.fadeOut(FADE_DURATION)
    next.reset().fadeIn(FADE_DURATION).play()
    entry.currentAction = actionName
  }

  // ---- Render Loop ----

  private onFrame(): void {
    const dt = this.clock.getDelta()
    const t = this.clock.elapsedTime
    this.controls.update()

    // Auto-revert to follow
    if (this.cameraMode === 'free' && t - this.lastInteraction > 5) {
      this.cameraMode = 'follow'
    }

    // Camera follow
    if (this.cameraMode === 'follow' && this.character) {
      const charPos = this.character.group.position
      this.controls.target.lerp(new THREE.Vector3(charPos.x, 0, charPos.z), 0.03)
    }

    // Character
    if (this.character) {
      this.animateCharacter(this.character, dt, t)
    }

    // Monsters
    for (const [id, m] of this.monsters) {
      if (m.removing) {
        const prog = Math.min(1, (t - m.removeTime) / 0.5)
        m.group.scale.setScalar(1 - prog)
        m.group.position.y += dt * 1.5
        if (prog >= 1) {
          m.mixer?.stopAllAction()
          this.scene.remove(m.group)
          this.monsters.delete(id)
        }
      } else {
        // Spawn animation
        const spawnProg = Math.min(1, (t - m.spawnTime) / 0.3)
        m.group.scale.setScalar(this.easeOutBack(spawnProg))

        // Drive monster mixer
        if (m.mixer) m.mixer.update(dt)

        // Fallback geometry hover
        if (m.body) {
          m.body.position.y = ROOM_HEIGHT / 2 + 0.3 + Math.sin(t * 2 + m.spawnTime * 10) * 0.04
        }

        // Billboard HP bar
        m.hpBg.lookAt(this.camera.position)
        m.hpFill.lookAt(this.camera.position)
      }
    }

    // Upgrade fallback monsters once GLB is loaded
    if (this.glbCache) {
      for (const [, m] of this.monsters) {
        if (m.model || m.removing) continue
        this.upgradeMonsterFromFallback(m)
      }
    }

    // Room pulse
    for (const [, r] of this.rooms) {
      r.mat.emissiveIntensity = r.mat.emissive.getHex() !== 0 ? 0.15 + Math.sin(t * 3) * 0.1 : 0
    }

    this.renderer.render(this.scene, this.camera)
    this.cssRenderer.render(this.scene, this.camera)
  }

  private upgradeMonsterFromFallback(m: MonsterEntry): void {
    const tint = m.hpMat.color.getHex() // approximate from HP color
    // Use difficulty-based tint — we can't easily recover it, so use a default red
    const result = this.buildMannequinClone(0xcc4444, 0.65)
    if (!result) return

    // Remove fallback geometry
    if (m.body) {
      m.group.remove(m.body)
      m.body.geometry.dispose()
      m.body = null
    }

    m.model = result.model
    m.mixer = result.mixer
    m.idleAction = result.idleAction
    m.jogAction = result.jogAction
    m.action = m.idleAction
    m.group.add(m.model)
  }

  private animateCharacter(char: CharacterEntry, dt: number, t: number): void {
    if (char.mixer) char.mixer.update(dt)

    // Movement
    if (char.moving) {
      const elapsed = t - char.moveStart
      const progress = Math.min(1, elapsed / MOVE_DURATION)
      const eased = this.easeInOutCubic(progress)
      char.group.position.lerpVectors(char.moveFrom, char.moveTo, eased)
      char.group.position.y += Math.sin(eased * Math.PI) * 0.8
      if (progress >= 1) {
        char.moving = false
        char.group.position.copy(char.moveTo)
      }
    }

    // HP bar billboard
    char.hpBg.lookAt(this.camera.position)
    char.hpFill.lookAt(this.camera.position)

    const data = this.prevData
    if (!data) return

    const action = data.character.action as CharacterAction

    if (char.model) {
      if (char.moving) {
        this.playCharacterAction(char, 'walking')
      } else {
        this.playCharacterAction(char, action)
      }
    } else if (char.fallback) {
      const baseX = char.moving ? 0 : char.group.position.x
      switch (action) {
        case 'idle':
          char.group.position.y += Math.sin(t * 1.5) * 0.002
          break
        case 'fighting':
          char.group.position.x = baseX + Math.sin(t * 30) * 0.03
          char.fallback.body.rotation.z = Math.sin(t * 25) * 0.05
          break
        case 'celebrating':
          char.group.position.y = this.characterBaseY + Math.abs(Math.sin(t * 5)) * 0.25
          char.fallback.body.rotation.y = t * 3
          break
        case 'resting':
          char.fallback.body.rotation.z = Math.sin(t * 0.8) * 0.03
          break
      }
    }
  }

  private easeInOutCubic(x: number): number {
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2
  }

  private easeOutBack(x: number): number {
    const c1 = 1.70158
    const c3 = c1 + 1
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2)
  }
}
