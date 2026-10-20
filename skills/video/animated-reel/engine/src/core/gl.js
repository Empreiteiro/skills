import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';

import { W, H, V } from './format.js';
export { W, H };

// Final grade, in display space (after the OutputPass): split-tone with navy in the
// shadows and gold in the highlights, contrast, saturation and vignette.
const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    vignette: { value: 0.28 },
    tone: { value: 0.5 },
    contrast: { value: 1.04 },
    saturation: { value: 1.0 },
    lift: { value: 0.0 },
    flash: { value: 0.0 },
    flashColor: { value: new THREE.Color(1, 0.93, 0.78) },
    aberration: { value: 0.0 },
    aspect: { value: V ? 0.5625 : 1.7778 },
  },
  vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform float vignette, tone, contrast, saturation, lift, flash, aberration, aspect; uniform vec3 flashColor;
    varying vec2 vUv;
    void main(){
      vec2 d = vUv - 0.5;
      vec3 col;
      if (aberration > 0.0) {
        vec2 o = d * aberration * 0.006;
        col = vec3(texture2D(tDiffuse, vUv - o).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv + o).b);
      } else col = texture2D(tDiffuse, vUv).rgb;
      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      vec3 shadowTint = vec3(0.90, 0.96, 1.10);
      vec3 highTint = vec3(1.06, 1.0, 0.90);
      col *= mix(vec3(1.0), shadowTint, (1.0 - smoothstep(0.0, 0.45, l)) * tone);
      col *= mix(vec3(1.0), highTint, smoothstep(0.55, 1.0, l) * tone);
      col = (col - 0.5) * contrast + 0.5 + lift;
      float l2 = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(l2), col, saturation);
      d.x *= aspect;
      float v = smoothstep(1.05, 0.25, length(d));
      col *= mix(1.0 - vignette, 1.0, v);
      col += flashColor * flash; // additive flash: brightens without washing out the contrast
      // 1-LSB dither: no banding in dark gradients
      col += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;
      gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }`,
};

export function createGL(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;

  const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, rt);
  const renderPass = new RenderPass(new THREE.Scene(), new THREE.PerspectiveCamera());
  const bokeh = new BokehPass(new THREE.Scene(), new THREE.PerspectiveCamera(), { focus: 10, aperture: 0.0001, maxblur: 0.006 });
  const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.5, 0.5, 0.85);
  const output = new OutputPass();
  const grade = new ShaderPass(GradeShader);
  composer.addPass(renderPass);
  composer.addPass(bokeh);
  composer.addPass(bloom);
  composer.addPass(output);
  composer.addPass(grade);

  const toneMaps = { aces: THREE.ACESFilmicToneMapping, agx: THREE.AgXToneMapping, neutral: THREE.NeutralToneMapping, none: THREE.NoToneMapping };

  /**
   * Renders a scene with the film's post-processing. opts (all optional):
   *  bloom {strength, radius, threshold} · dof {focus, aperture, maxblur} | null
   *  exposure · toneMapping ('aces'|'agx'|'neutral'|'none') · grade {vignette, tone, contrast, saturation, lift, flash, aberration}
   */
  function render(scene, camera, opts = {}) {
    renderPass.scene = scene;
    renderPass.camera = camera;
    const b = opts.bloom || {};
    bloom.strength = b.strength ?? 0.5;
    bloom.radius = b.radius ?? 0.5;
    bloom.threshold = b.threshold ?? 0.85;
    bloom.enabled = bloom.strength > 0;
    if (opts.dof) {
      bokeh.enabled = true;
      bokeh.scene = scene;
      bokeh.camera = camera;
      bokeh.uniforms.focus.value = opts.dof.focus ?? 10;
      bokeh.uniforms.aperture.value = opts.dof.aperture ?? 0.0002;
      bokeh.uniforms.maxblur.value = opts.dof.maxblur ?? 0.006;
      bokeh.uniforms.nearClip.value = camera.near;
      bokeh.uniforms.farClip.value = camera.far;
      bokeh.uniforms.aspect.value = camera.aspect;
    } else bokeh.enabled = false;
    renderer.toneMapping = toneMaps[opts.toneMapping || 'aces'];
    renderer.toneMappingExposure = opts.exposure ?? 1;
    const g = opts.grade || {};
    const u = grade.uniforms;
    u.vignette.value = g.vignette ?? 0.28;
    u.tone.value = g.tone ?? 0.5;
    u.contrast.value = g.contrast ?? 1.04;
    u.saturation.value = g.saturation ?? 1.0;
    u.lift.value = g.lift ?? 0.0;
    u.flash.value = g.flash ?? 0.0;
    u.aberration.value = g.aberration ?? 0.0;
    if (g.flashColor) u.flashColor.value.set(g.flashColor);
    else u.flashColor.value.setRGB(1, 0.93, 0.78);
    composer.render();
  }

  /** Clears the screen (a shot with no 3D, DOM only). */
  function clear(color = 0x0b1322) {
    renderer.setRenderTarget(null);
    renderer.setClearColor(color, 1);
    renderer.clear();
  }

  return { renderer, composer, render, clear, passes: { renderPass, bokeh, bloom, output, grade } };
}
