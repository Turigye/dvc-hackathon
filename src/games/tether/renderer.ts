import * as THREE from "three";
import { ORBIT_RADIUS, anchorPosition, orbitPoint, type Anchor, type TetherState } from "./simulation";
import { createOrbMaterial, createRingMaterial, createSkyMaterial } from "./materials";

/**
 * TETHER renderer. Owns nothing but pixels — it reads simulation state and draws
 * it. All physics stays in `simulation.ts`, so the look can change freely.
 *
 * Built for a phone: one perspective camera, additive glow instead of a
 * post-processing bloom pass, pooled meshes, and a device-pixel-ratio cap.
 */

const PALETTE = {
  bg: 0x05030f,
  fog: 0x0b0724,
  orb: 0x7cf9ff,
  tether: 0x7cf9ff,
  solid: 0xff3d9a,
  drift: 0xffd200,
  decay: 0xff5a3c,
  spent: 0x2a2350,
};

type AnchorMesh = { group: THREE.Group; ring: THREE.Mesh; core: THREE.Mesh; halo: THREE.Sprite };

function glowTexture() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.25, "rgba(255,255,255,0.55)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

export class TetherRenderer {
  readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly glow: THREE.Texture;
  private readonly anchors = new Map<number, AnchorMesh>();
  private readonly orb: THREE.Mesh;
  private readonly orbHalo: THREE.Sprite;
  private readonly tether: THREE.Line;
  private readonly trail: THREE.Points;
  private readonly trailPositions: Float32Array;
  private readonly sky: THREE.Mesh;
  private readonly skyMaterial: THREE.ShaderMaterial;
  private readonly orbMaterial: THREE.ShaderMaterial;
  private elapsed = 0;
  private trailHead = 0;
  private cameraY = 0;
  private cameraX = 0;
  private shake = 0;
  /** Smoothed orb draw position. A latch relocates the orb by up to the
   *  capture tolerance in one physics step (arriving near, not exactly on,
   *  the orbit ring) — that is a real position discontinuity, unlike ordinary
   *  flight or orbit motion which is already continuous. Easing the drawn
   *  position removes the pop without touching the physics it is drawn from. */
  private orbRenderPos: { x: number; y: number } | null = null;
  private readonly reducedMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
    // Capping DPR is the single biggest frame-rate lever on a phone.
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(PALETTE.bg, 1);

    this.scene.fog = new THREE.Fog(PALETTE.fog, 9, 26);
    this.camera = new THREE.PerspectiveCamera(52, 1, 0.1, 60);
    this.camera.position.set(0, 0, 9.4);
    this.glow = glowTexture();

    // A single full-screen quad running a procedural starfield. Replaces two
    // finite point clouds that ran out partway up a long climb.
    this.skyMaterial = createSkyMaterial();
    this.sky = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.skyMaterial);
    this.sky.frustumCulled = false;
    this.sky.renderOrder = -1;
    this.scene.add(this.sky);

    this.orbMaterial = createOrbMaterial();
    this.orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3, 3), this.orbMaterial);
    this.scene.add(this.orb);

    this.orbHalo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.glow, color: PALETTE.orb, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    this.orbHalo.scale.setScalar(2.1);
    this.scene.add(this.orbHalo);

    this.tether = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
      new THREE.LineBasicMaterial({ color: PALETTE.tether, transparent: true, opacity: 0.75 }),
    );
    this.scene.add(this.tether);

    const trailCount = 60;
    this.trailPositions = new Float32Array(trailCount * 3).fill(-999);
    const trailGeometry = new THREE.BufferGeometry();
    trailGeometry.setAttribute("position", new THREE.BufferAttribute(this.trailPositions, 3));
    this.trail = new THREE.Points(trailGeometry, new THREE.PointsMaterial({
      color: PALETTE.orb, size: 0.34, map: this.glow, transparent: true, opacity: 0.75, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    this.scene.add(this.trail);
  }

  resize(width: number, height: number) {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    // Portrait phones are narrow: widen the field of view so the shaft still fits.
    this.camera.fov = height > width ? 56 : 42;
    this.skyMaterial.uniforms.uAspect.value = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
  }

  /** Returns the view to the origin for a fresh run. Without this the camera
   *  stayed parked at the previous run's height and the new orb spawned off-screen. */
  reset() {
    this.cameraY = 0;
    this.cameraX = 0;
    this.shake = 0;
    this.orbRenderPos = null;
    this.trailPositions.fill(-999);
    (this.trail.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    for (const [id, mesh] of this.anchors) {
      this.scene.remove(mesh.group);
      mesh.ring.geometry.dispose();
      mesh.core.geometry.dispose();
      (mesh.ring.material as THREE.Material).dispose();
      (mesh.core.material as THREE.Material).dispose();
      mesh.halo.material.dispose();
      this.anchors.delete(id);
    }
  }

  punch(strength = 1) {
    if (this.reducedMotion) return;
    this.shake = Math.min(1, this.shake + strength);
  }

  /**
   * Anchor kinds must read apart by silhouette, not only colour — solid,
   * drift and decay used to share one octahedron and differ by hex alone,
   * which fails for colour-blind players and, now that drift/decay actually
   * spawn (they never did before a generator bug was fixed), is a real gap
   * rather than a theoretical one.
   *
   * solid = octahedron, a stable diamond.
   * drift = a flattened wide slab, hinting at the sideways glide.
   * decay = a spiky low-poly tetrahedron, reading as fragile before it even moves.
   */
  private coreGeometry(kind: Anchor["kind"]) {
    if (kind === "drift") return new THREE.BoxGeometry(0.44, 0.16, 0.3);
    if (kind === "decay") return new THREE.TetrahedronGeometry(0.3, 0);
    return new THREE.OctahedronGeometry(0.26, 0);
  }

  private anchorMesh(anchor: Anchor): AnchorMesh {
    const existing = this.anchors.get(anchor.id);
    if (existing) return existing;
    const group = new THREE.Group();
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(ORBIT_RADIUS, 0.05, 10, 96),
      createRingMaterial(PALETTE.solid),
    );
    const core = new THREE.Mesh(
      this.coreGeometry(anchor.kind),
      new THREE.MeshBasicMaterial({ color: PALETTE.solid }),
    );
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.glow, color: PALETTE.solid, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    halo.scale.setScalar(2.4);
    group.add(ring, core, halo);
    this.scene.add(group);
    const mesh = { group, ring, core, halo };
    this.anchors.set(anchor.id, mesh);
    return mesh;
  }

  render(state: TetherState, dtMs: number) {
    this.elapsed += dtMs / 1000;
    const live = new Set(state.anchors.map((a) => a.id));
    for (const [id, mesh] of this.anchors) {
      if (live.has(id)) continue;
      this.scene.remove(mesh.group);
      mesh.ring.geometry.dispose();
      mesh.core.geometry.dispose();
      (mesh.ring.material as THREE.Material).dispose();
      (mesh.core.material as THREE.Material).dispose();
      mesh.halo.material.dispose();
      this.anchors.delete(id);
    }

    for (const anchor of state.anchors) {
      const mesh = this.anchorMesh(anchor);
      const at = anchorPosition(anchor, state.elapsedMs);
      mesh.group.position.set(at.x, at.y, anchor.z);
      const spent = anchor.id < state.anchorId;
      const colour = spent ? PALETTE.spent : anchor.kind === "drift" ? PALETTE.drift : anchor.kind === "decay" ? PALETTE.decay : PALETTE.solid;
      (mesh.core.material as THREE.MeshBasicMaterial).color.setHex(colour);
      (mesh.halo.material as THREE.SpriteMaterial).color.setHex(colour);
      const isCurrent = anchor.id === state.anchorId;
      const ringUniforms = (mesh.ring.material as THREE.ShaderMaterial).uniforms;
      ringUniforms.uTime.value = this.elapsed;
      ringUniforms.uColour.value.setHex(colour);
      ringUniforms.uCharge.value = isCurrent ? 1 : spent ? 0.05 : 0.3;
      // A decay anchor visibly eats itself as its life runs down.
      ringUniforms.uDissolve.value = anchor.kind === "decay" && isCurrent
        ? 1 - Math.max(0, Math.min(1, (anchor.life ?? 1.5) / 1.5))
        : 0;
      mesh.halo.material.opacity = isCurrent ? 0.8 : spent ? 0.05 : 0.25;
      // A decaying pad visibly winds down, so the launch is never a surprise.
      const urgency = anchor.kind === "decay" && isCurrent ? Math.max(0.2, (anchor.life ?? 1.5) / 1.5) : 1;
      mesh.group.scale.setScalar(isCurrent ? 1 + (1 - urgency) * 0.25 : 1);
      mesh.core.rotation.y += dtMs * (isCurrent ? 0.004 : 0.0012);
      mesh.core.rotation.x += dtMs * 0.0008;
    }

    const pos = state.phase === "orbiting" ? orbitPoint(state) : state.pos;
    if (!this.orbRenderPos) this.orbRenderPos = { x: pos.x, y: pos.y };
    else {
      const drawEase = Math.min(1, dtMs / 70);
      this.orbRenderPos.x += (pos.x - this.orbRenderPos.x) * drawEase;
      this.orbRenderPos.y += (pos.y - this.orbRenderPos.y) * drawEase;
    }
    this.orb.position.set(this.orbRenderPos.x, this.orbRenderPos.y, 0.2);
    this.orb.rotation.x += dtMs * 0.005;
    this.orb.rotation.y += dtMs * 0.004;
    this.orbHalo.position.copy(this.orb.position);
    const heat = 1 + state.combo * 0.12;
    this.orbHalo.scale.setScalar(Math.min(3.4, 2.1 * heat));
    this.orbMaterial.uniforms.uTime.value = this.elapsed;
    this.orbMaterial.uniforms.uHeat.value = Math.min(2.5, state.combo * 0.35);

    const anchor = state.anchors.find((a) => a.id === state.anchorId);
    const tetherVisible = state.phase === "orbiting" && Boolean(anchor);
    this.tether.visible = tetherVisible;
    if (tetherVisible && anchor) {
      const at = anchorPosition(anchor, state.elapsedMs);
      const points = this.tether.geometry.attributes.position as THREE.BufferAttribute;
      points.setXYZ(0, at.x, at.y, anchor.z);
      points.setXYZ(1, this.orbRenderPos.x, this.orbRenderPos.y, 0.2);
      points.needsUpdate = true;
    }

    // Trail and tether both read the smoothed draw position, not the raw
    // physics position, so nothing visibly detaches from the ball on a latch.
    this.trailPositions[this.trailHead * 3] = this.orbRenderPos.x;
    this.trailPositions[this.trailHead * 3 + 1] = this.orbRenderPos.y;
    this.trailPositions[this.trailHead * 3 + 2] = 0.1;
    this.trailHead = (this.trailHead + 1) % (this.trailPositions.length / 3);
    (this.trail.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.trail.material as THREE.PointsMaterial).opacity = state.phase === "flying" ? 0.85 : 0.3;

    // Camera eases upward and never drops, so the climb always reads as progress.
    const targetY = Math.max(this.cameraY, pos.y + 1.1);
    this.cameraY += (targetY - this.cameraY) * Math.min(1, dtMs / 130);

    // Horizontal tracking is phase-dependent. While orbiting, the orb itself
    // swings +/-ORBIT_RADIUS around the anchor every spin; following that
    // directly reads as camera wobble, so we hold on the anchor's x instead
    // and pan to it gently. The moment you release, a bad shot can send the
    // orb far off either side, and any eased follow — even a fast one — can
    // still lose it for a frame if dt spikes (a stalled tab catching up, a
    // GC pause). Flight tracking is a hard snap with no easing at all, so the
    // orb is physically incapable of leaving frame regardless of frame timing.
    if (state.phase === "orbiting" && anchor) {
      const targetX = anchorPosition(anchor, state.elapsedMs).x;
      this.cameraX += (targetX - this.cameraX) * Math.min(1, dtMs / 260);
    } else {
      this.cameraX = pos.x;
    }

    this.shake = Math.max(0, this.shake - dtMs / 260);
    const jolt = this.shake * this.shake * 0.22;
    this.camera.position.set(
      this.cameraX + (jolt > 0 ? (Math.random() - 0.5) * jolt : 0),
      this.cameraY + (jolt > 0 ? (Math.random() - 0.5) * jolt : 0),
      9.4,
    );
    this.camera.lookAt(this.cameraX, this.cameraY - 0.4, 0);
    this.skyMaterial.uniforms.uScroll.value = this.cameraY * 0.06;

    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.anchors.forEach((mesh) => {
      mesh.ring.geometry.dispose();
      mesh.core.geometry.dispose();
    });
    this.anchors.clear();
    this.orb.geometry.dispose();
    (this.orb.material as THREE.Material).dispose();
    this.orbHalo.material.dispose();
    this.tether.geometry.dispose();
    (this.tether.material as THREE.Material).dispose();
    this.trail.geometry.dispose();
    (this.trail.material as THREE.Material).dispose();
    this.sky.geometry.dispose();
    this.skyMaterial.dispose();
    this.glow.dispose();
    this.renderer.dispose();
  }
}
