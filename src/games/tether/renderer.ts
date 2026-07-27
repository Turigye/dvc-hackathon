import * as THREE from "three";
import { ORBIT_RADIUS, anchorPosition, orbitPoint, type TetherState } from "./simulation";

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
  private readonly stars: THREE.Points;
  private trailHead = 0;
  private cameraY = 0;
  private shake = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
    // Capping DPR is the single biggest frame-rate lever on a phone.
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(PALETTE.bg, 1);

    this.scene.fog = new THREE.Fog(PALETTE.fog, 9, 26);
    this.camera = new THREE.PerspectiveCamera(52, 1, 0.1, 60);
    this.camera.position.set(0, 0, 9.4);
    this.glow = glowTexture();

    const starCount = 220;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      starPositions[i * 3] = (Math.random() * 2 - 1) * 14;
      starPositions[i * 3 + 1] = Math.random() * 120 - 10;
      starPositions[i * 3 + 2] = -6 - Math.random() * 12;
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    this.stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({
      color: 0x8f7dff, size: 0.09, map: this.glow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    this.scene.add(this.stars);

    this.orb = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.3, 2),
      new THREE.MeshBasicMaterial({ color: PALETTE.orb }),
    );
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
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    // Portrait phones are narrow: widen the field of view so the shaft still fits.
    this.camera.fov = height > width ? 56 : 42;
    this.camera.updateProjectionMatrix();
  }

  punch(strength = 1) {
    this.shake = Math.min(1, this.shake + strength);
  }

  private anchorMesh(id: number): AnchorMesh {
    const existing = this.anchors.get(id);
    if (existing) return existing;
    const group = new THREE.Group();
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(ORBIT_RADIUS, 0.045, 8, 48),
      new THREE.MeshBasicMaterial({ color: PALETTE.solid, transparent: true, opacity: 0.5 }),
    );
    const core = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.26, 0),
      new THREE.MeshBasicMaterial({ color: PALETTE.solid }),
    );
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.glow, color: PALETTE.solid, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    halo.scale.setScalar(2.4);
    group.add(ring, core, halo);
    this.scene.add(group);
    const mesh = { group, ring, core, halo };
    this.anchors.set(id, mesh);
    return mesh;
  }

  render(state: TetherState, dtMs: number) {
    const live = new Set(state.anchors.map((a) => a.id));
    for (const [id, mesh] of this.anchors) {
      if (live.has(id)) continue;
      this.scene.remove(mesh.group);
      mesh.ring.geometry.dispose();
      mesh.core.geometry.dispose();
      this.anchors.delete(id);
    }

    for (const anchor of state.anchors) {
      const mesh = this.anchorMesh(anchor.id);
      const at = anchorPosition(anchor, state.elapsedMs);
      mesh.group.position.set(at.x, at.y, anchor.z);
      const spent = anchor.id < state.anchorId;
      const colour = spent ? PALETTE.spent : anchor.kind === "drift" ? PALETTE.drift : anchor.kind === "decay" ? PALETTE.decay : PALETTE.solid;
      (mesh.core.material as THREE.MeshBasicMaterial).color.setHex(colour);
      (mesh.ring.material as THREE.MeshBasicMaterial).color.setHex(colour);
      (mesh.halo.material as THREE.SpriteMaterial).color.setHex(colour);
      const isCurrent = anchor.id === state.anchorId;
      (mesh.ring.material as THREE.MeshBasicMaterial).opacity = isCurrent ? 0.95 : spent ? 0.15 : 0.4;
      mesh.halo.material.opacity = isCurrent ? 0.8 : spent ? 0.05 : 0.25;
      // A decaying pad visibly winds down, so the launch is never a surprise.
      const urgency = anchor.kind === "decay" && isCurrent ? Math.max(0.2, (anchor.life ?? 1.5) / 1.5) : 1;
      mesh.group.scale.setScalar(isCurrent ? 1 + (1 - urgency) * 0.25 : 1);
      mesh.core.rotation.y += dtMs * (isCurrent ? 0.004 : 0.0012);
      mesh.core.rotation.x += dtMs * 0.0008;
      mesh.ring.rotation.z = state.angle * (isCurrent ? 1 : 0.2);
    }

    const pos = state.phase === "orbiting" ? orbitPoint(state) : state.pos;
    this.orb.position.set(pos.x, pos.y, 0.2);
    this.orb.rotation.x += dtMs * 0.005;
    this.orb.rotation.y += dtMs * 0.004;
    this.orbHalo.position.copy(this.orb.position);
    const heat = 1 + state.combo * 0.12;
    this.orbHalo.scale.setScalar(Math.min(3.4, 2.1 * heat));

    const anchor = state.anchors.find((a) => a.id === state.anchorId);
    const tetherVisible = state.phase === "orbiting" && Boolean(anchor);
    this.tether.visible = tetherVisible;
    if (tetherVisible && anchor) {
      const at = anchorPosition(anchor, state.elapsedMs);
      const points = this.tether.geometry.attributes.position as THREE.BufferAttribute;
      points.setXYZ(0, at.x, at.y, anchor.z);
      points.setXYZ(1, pos.x, pos.y, 0.2);
      points.needsUpdate = true;
    }

    this.trailPositions[this.trailHead * 3] = pos.x;
    this.trailPositions[this.trailHead * 3 + 1] = pos.y;
    this.trailPositions[this.trailHead * 3 + 2] = 0.1;
    this.trailHead = (this.trailHead + 1) % (this.trailPositions.length / 3);
    (this.trail.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.trail.material as THREE.PointsMaterial).opacity = state.phase === "flying" ? 0.85 : 0.3;

    // Camera eases upward and never drops, so the climb always reads as progress.
    const targetY = Math.max(this.cameraY, pos.y + 1.1);
    this.cameraY += (targetY - this.cameraY) * Math.min(1, dtMs / 130);
    this.shake = Math.max(0, this.shake - dtMs / 260);
    const jolt = this.shake * this.shake * 0.22;
    this.camera.position.set(
      pos.x * 0.14 + (Math.random() - 0.5) * jolt,
      this.cameraY + (Math.random() - 0.5) * jolt,
      9.4,
    );
    this.camera.lookAt(pos.x * 0.14, this.cameraY - 0.4, 0);
    this.stars.position.y = this.cameraY * 0.72;

    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.anchors.forEach((mesh) => {
      mesh.ring.geometry.dispose();
      mesh.core.geometry.dispose();
    });
    this.anchors.clear();
    this.orb.geometry.dispose();
    this.glow.dispose();
    this.renderer.dispose();
  }
}
