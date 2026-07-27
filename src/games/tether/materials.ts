import * as THREE from "three";

/**
 * Procedural materials for TETHER.
 *
 * Deliberately no image assets. A flat sprite in a perspective scene reads as a
 * billboard, cannot respond to game state, and loses its painted detail at the
 * size an anchor actually occupies on a phone. Shaders cost ~2KB, stay sharp at
 * any distance, and can be driven directly by simulation values — combo heat,
 * decay life, latch flare.
 *
 * Every material here is additive and depth-write-free, which gives real glow
 * without a full-screen bloom pass. That matters: a post-processing pass is the
 * single most expensive thing you can put on a mobile GPU.
 */

const COMMON_VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vViewDir = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

/** The orb: a fresnel rim that brightens with combo, plus an inner core pulse. */
export function createOrbMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uHeat: { value: 0 },
      uCore: { value: new THREE.Color(0x9dfbff) },
      uRim: { value: new THREE.Color(0x2ad4ff) },
    },
    vertexShader: COMMON_VERT,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uHeat;
      uniform vec3 uCore;
      uniform vec3 uRim;
      varying vec3 vNormal;
      varying vec3 vViewDir;
      void main() {
        float facing = clamp(dot(normalize(vNormal), normalize(vViewDir)), 0.0, 1.0);
        float fresnel = pow(1.0 - facing, 2.2);
        float pulse = 0.85 + 0.15 * sin(uTime * 6.0 + uHeat * 3.0);
        vec3 colour = mix(uCore, uRim, fresnel) * pulse;
        colour += uRim * fresnel * (0.6 + uHeat * 1.4);
        float alpha = clamp(0.55 + fresnel * 0.8, 0.0, 1.0);
        gl_FragColor = vec4(colour, alpha);
      }
    `,
  });
}

/**
 * Anchor ring: energy flows around the torus. `uCharge` drives brightness so the
 * live anchor reads instantly, and `uDissolve` eats the ring away for decay
 * anchors — the countdown becomes the visual, not a separate indicator.
 */
export function createRingMaterial(colour: number) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uCharge: { value: 0.4 },
      uDissolve: { value: 0 },
      uColour: { value: new THREE.Color(colour) },
    },
    vertexShader: COMMON_VERT,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uCharge;
      uniform float uDissolve;
      uniform vec3 uColour;
      varying vec2 vUv;
      void main() {
        float flow = fract(vUv.x * 3.0 - uTime * 0.55);
        float pulse = smoothstep(0.0, 0.35, flow) * smoothstep(1.0, 0.65, flow);
        float band = 0.35 + pulse * 0.9;

        // Dissolve nibbles the ring away from pseudo-random points around it.
        float noise = fract(sin(vUv.x * 91.7) * 43758.5453);
        if (noise < uDissolve) discard;

        float alpha = band * (0.35 + uCharge * 0.75);
        gl_FragColor = vec4(uColour * (0.7 + uCharge * 1.1), alpha);
      }
    `,
  });
}

/**
 * Background: an infinite procedural starfield on a single full-screen quad.
 * This replaces a finite point cloud, which had two problems — it ran out after
 * a few hundred units of climb, and its density was tied to a fixed box rather
 * than to what the camera can actually see.
 */
export function createSkyMaterial() {
  return new THREE.ShaderMaterial({
    depthWrite: false,
    depthTest: false,
    uniforms: {
      uScroll: { value: 0 },
      uAspect: { value: 0.5 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.999, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uScroll;
      uniform float uAspect;
      varying vec2 vUv;

      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

      // One scrolling layer of stars. Cell-based so it tiles forever with no
      // stored geometry and no end to the field.
      float layer(vec2 uv, float scale, float speed, float size) {
        vec2 p = vec2(uv.x * uAspect, uv.y) * scale;
        p.y += uScroll * speed;
        vec2 cell = floor(p);
        vec2 local = fract(p) - 0.5;
        float r = hash(cell);
        if (r < 0.86) return 0.0;
        vec2 jitter = vec2(hash(cell + 1.3), hash(cell + 7.1)) - 0.5;
        float d = length(local - jitter * 0.6);
        float twinkle = 0.65 + 0.35 * sin(uScroll * 2.0 + r * 40.0);
        return smoothstep(size, 0.0, d) * twinkle * (0.35 + r * 0.65);
      }

      void main() {
        // A cold vertical gradient so the shaft has a floor and a ceiling.
        vec3 sky = mix(vec3(0.015, 0.010, 0.045), vec3(0.055, 0.035, 0.130), pow(vUv.y, 1.4));

        float near = layer(vUv, 26.0, 0.85, 0.055);
        float mid  = layer(vUv, 15.0, 0.45, 0.075);
        float far  = layer(vUv,  8.0, 0.20, 0.105);

        sky += vec3(0.78, 0.72, 1.0) * near * 0.85;
        sky += vec3(0.55, 0.48, 0.95) * mid * 0.55;
        sky += vec3(0.35, 0.28, 0.75) * far * 0.40;

        // Vignette keeps the centre readable where gameplay lives.
        float v = smoothstep(1.15, 0.25, length(vUv - 0.5) * 1.6);
        gl_FragColor = vec4(sky * v, 1.0);
      }
    `,
  });
}
