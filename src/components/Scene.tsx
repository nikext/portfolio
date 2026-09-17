"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { FXAAPass } from "three/examples/jsm/postprocessing/FXAAPass.js";
import { GPUComputationRenderer } from "three/examples/jsm/misc/GPUComputationRenderer.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { nodes as nodeData, type GraphNode } from "@/data/nodes";
import * as glsl from "./scene/shaders";
import styles from "./Scene.module.css";

type Hover = { node: GraphNode; x: number; y: number } | null;
type Focus = { node: GraphNode; idx: number } | null;

type Props = {
  className?: string;
  /** "full" animates everything, "calm" slows it, "off" renders a still frame. */
  motion?: "full" | "calm" | "off";
  /** Scales the particle count (1 = 31k on desktop, 9k on phones). */
  density?: number;
};

const cssVar = (name: string, fallback: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const easeOut = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);
const elastic = (t: number) => {
  t = clamp01(t);
  if (t === 0 || t === 1) return t;
  return Math.pow(2, -9 * t) * Math.sin((t * 9 - 0.75) * ((2 * Math.PI) / 3)) + 1;
};

/** Topology shared by the simulation, the edge tubes and the highlight logic. */
function buildGraph() {
  const cols = new Map<number, number[]>();
  nodeData.forEach((n, i) => {
    const k = Math.round(n.x);
    cols.set(k, [...(cols.get(k) ?? []), i]);
  });
  const colKeys = [...cols.keys()].sort((a, b) => a - b);
  const colOf = new Array<number>(nodeData.length).fill(0);
  colKeys.forEach((k, c) => cols.get(k)!.forEach((i) => (colOf[i] = c)));
  const edges: [number, number][] = [];
  for (let c = 0; c < colKeys.length - 1; c++) {
    for (const a of cols.get(colKeys[c])!) for (const b of cols.get(colKeys[c + 1])!) edges.push([a, b]);
  }
  return { edges, colOf, colCount: colKeys.length };
}

/**
 * Hero scene: the AI-ops pipeline from data/nodes, rendered as glowing nodes
 * joined by pulsing tubes, with a GPU particle field streaming through it
 * (sources on the left, outputs on the right). Drag to orbit, hover for a
 * tooltip, click a node to focus it — the particles whirl around whatever is
 * focused. The whole three.js lifecycle lives in one effect; React only owns
 * the overlays.
 */
export default function Scene({ className, motion = "full", density = 1 }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const focusFn = useRef<(idx: number) => void>(() => {});
  const [hover, setHover] = useState<Hover>(null);
  const [focus, setFocus] = useState<Focus>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let cleanup = () => {};

    try {
      const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const still = motion === "off" || calm;
      const speed = motion === "calm" ? 0.45 : 1;
      const mobile = window.innerWidth < 760 || window.matchMedia("(pointer: coarse)").matches;
      const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1 : 1.5);

      const accentHex = cssVar("--accent", "#e8543f");
      const accent = new THREE.Color(accentHex);
      const ink = new THREE.Color("#c7cbd0");
      const bg = new THREE.Color(cssVar("--bg", "#15171a"));
      const { edges, colOf, colCount } = buildGraph();
      const EDGES = edges.length;

      /* ------------------------------------------------------------ renderer */
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
      const camHome = new THREE.Vector3(0, 2.2, 26);
      const camStart = new THREE.Vector3(0, 7, 46);
      camera.position.copy(still ? camHome : camStart);
      const camGoal = camHome.clone();
      const lookGoal = new THREE.Vector3();
      const lookNow = new THREE.Vector3();

      const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: "high-performance" });
      renderer.setPixelRatio(dpr);
      renderer.setClearColor(bg, 1);
      renderer.toneMapping = THREE.NoToneMapping;
      renderer.domElement.style.cssText = "display:block;width:100%;height:100%";
      el.appendChild(renderer.domElement);

      const labelLayer = document.createElement("div");
      labelLayer.style.cssText = "position:absolute;inset:0;pointer-events:none;overflow:hidden";
      el.appendChild(labelLayer);

      const uTime = { value: 0 };
      const world = new THREE.Group();
      scene.add(world);

      /* ------------------------------------------------------------- nebula */
      const nebulaMat = new THREE.ShaderMaterial({
        uniforms: {
          uTime, uAspect: { value: 1 }, uOffset: { value: new THREE.Vector2() },
          uBg: { value: bg }, uTint: { value: new THREE.Color("#212831") }, uAccent: { value: accent },
        },
        vertexShader: glsl.nebulaVert, fragmentShader: glsl.nebulaFrag, depthTest: false, depthWrite: false,
      });
      const nebula = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), nebulaMat);
      nebula.frustumCulled = false;
      nebula.renderOrder = -10;
      scene.add(nebula);

      /* -------------------------------------------------------------- stars */
      const starCount = 700;
      const sp = new Float32Array(starCount * 3);
      const sph = new Float32Array(starCount);
      for (let i = 0; i < starCount; i++) {
        sp[i * 3] = (Math.random() - 0.5) * 90;
        sp[i * 3 + 1] = (Math.random() - 0.5) * 44;
        sp[i * 3 + 2] = -14 - Math.random() * 30;
        sph[i] = Math.random();
      }
      const starGeo = new THREE.BufferGeometry();
      starGeo.setAttribute("position", new THREE.BufferAttribute(sp, 3));
      starGeo.setAttribute("aPhase", new THREE.BufferAttribute(sph, 1));
      const starMat = new THREE.ShaderMaterial({
        uniforms: { uTime, uSize: { value: 60 * dpr }, uColor: { value: new THREE.Color("#8d96a3") } },
        vertexShader: glsl.starsVert, fragmentShader: glsl.starsFrag,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      });
      world.add(new THREE.Points(starGeo, starMat));

      /* -------------------------------------------------------------- floor */
      const floorMat = new THREE.ShaderMaterial({
        uniforms: { uTime, uScan: { value: 0 }, uLine: { value: new THREE.Color("#2c3138") }, uAccent: { value: accent } },
        vertexShader: glsl.floorVert, fragmentShader: glsl.floorFrag,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      });
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(110, 110, 56, 56), floorMat);
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = -6.8;
      world.add(floor);

      /* -------------------------------------------------------------- nodes */
      type Node = {
        i: number; n: GraphNode; isModel: boolean; group: THREE.Group; hit: THREE.Mesh;
        coreMat: THREE.ShaderMaterial; wireMat: THREE.MeshBasicMaterial; rings: THREE.Mesh[];
        label: HTMLDivElement; lw?: number; lh?: number;
        scale: number; scaleTarget: number; hot: number; hotTarget: number;
      };
      const nodeList: Node[] = [];
      const hitMeshes: THREE.Mesh[] = [];
      const ringGeoA = new THREE.TorusGeometry(1, 0.012, 6, 80);
      const ringGeoB = new THREE.TorusGeometry(1, 0.009, 6, 96);
      nodeData.forEach((n, i) => {
        const isModel = n.kind === "model";
        const rad = isModel ? 0.78 : 0.5;
        const group = new THREE.Group();
        group.position.set(n.x, n.y, n.z);
        group.scale.setScalar(still ? 1 : 0.0001);

        const coreMat = new THREE.ShaderMaterial({
          uniforms: {
            uTime, uGlow: { value: isModel ? accent.clone() : ink.clone() }, uHot: { value: 0 },
            uSeed: { value: Math.random() * 10 }, uStrength: { value: isModel ? 1.15 : 0.85 },
          },
          vertexShader: glsl.nodeVert, fragmentShader: glsl.nodeFrag,
        });
        const core = new THREE.Mesh(new THREE.SphereGeometry(rad, 40, 28), coreMat);
        group.add(core);

        const wireMat = new THREE.MeshBasicMaterial({
          color: isModel ? accent.clone() : ink.clone(), wireframe: true, transparent: true,
          opacity: isModel ? 0.3 : 0.16, blending: THREE.AdditiveBlending, depthWrite: false,
        });
        const wire = new THREE.Mesh(new THREE.IcosahedronGeometry(rad * 1.55, 1), wireMat);
        group.add(wire);

        const rings: THREE.Mesh[] = [];
        const ringCount = isModel ? 2 : 1;
        for (let r = 0; r < ringCount; r++) {
          const ring = new THREE.Mesh(
            r === 0 ? ringGeoA : ringGeoB,
            new THREE.MeshBasicMaterial({
              color: isModel ? accent.clone() : ink.clone(), transparent: true,
              opacity: isModel ? 0.7 : 0.3, blending: THREE.AdditiveBlending, depthWrite: false,
            }),
          );
          ring.scale.setScalar(rad * (r === 0 ? 2.2 : 2.9));
          ring.rotation.set(1.15 + r * 0.9, 0.35 - r * 1.1, r * 0.4);
          group.add(ring);
          rings.push(ring);
        }

        const hit = new THREE.Mesh(new THREE.SphereGeometry(rad * 1.9, 10, 8), new THREE.MeshBasicMaterial());
        hit.visible = false;
        group.add(hit);

        const label = document.createElement("div");
        label.textContent = n.name;
        label.style.cssText =
          "position:absolute;left:0;top:0;font-family:var(--mono);font-size:10px;letter-spacing:.08em;color:#8b9096;white-space:nowrap;transform:translate(-50%,-50%);transition:color .25s ease,opacity .25s ease;will-change:transform,opacity;text-shadow:0 1px 8px rgba(21,23,26,.9)";
        labelLayer.appendChild(label);

        const node: Node = {
          i, n, isModel, group, hit, coreMat, wireMat, rings, label,
          scale: still ? 1 : 0, scaleTarget: 1, hot: 0, hotTarget: 0,
        };
        hit.userData.i = i;
        world.add(group);
        nodeList.push(node);
        hitMeshes.push(hit);
      });

      /* -------------------------------------------------------------- edges */
      const up = new THREE.Vector3(0, 1, 0);
      const edgeParts: THREE.BufferGeometry[] = [];
      const edgeA: THREE.Vector3[] = [], edgeB: THREE.Vector3[] = [];
      edges.forEach(([a, b], k) => {
        const A = new THREE.Vector3(nodeData[a].x, nodeData[a].y, nodeData[a].z);
        const B = new THREE.Vector3(nodeData[b].x, nodeData[b].y, nodeData[b].z);
        edgeA.push(A); edgeB.push(B);
        const dir = B.clone().sub(A);
        const len = dir.length();
        const g = new THREE.CylinderGeometry(0.03, 0.03, len, 6, 1, true);
        const count = g.attributes.position.count;
        g.setAttribute("aEdge", new THREE.Float32BufferAttribute(new Array(count).fill(k), 1));
        g.setAttribute("aCol", new THREE.Float32BufferAttribute(new Array(count).fill(colOf[a]), 1));
        g.setAttribute("aSeed", new THREE.Float32BufferAttribute(new Array(count).fill(Math.random()), 1));
        const q = new THREE.Quaternion().setFromUnitVectors(up, dir.clone().normalize());
        g.applyMatrix4(new THREE.Matrix4().compose(A.clone().add(B).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)));
        edgeParts.push(g);
      });
      const edgeGeo = mergeGeometries(edgeParts, false) ?? new THREE.BufferGeometry();
      edgeParts.forEach((g) => g.dispose());
      const edgeState = new Float32Array(EDGES);
      const edgeMat = new THREE.ShaderMaterial({
        uniforms: { uTime, uState: { value: edgeState }, uReveal: { value: still ? 99 : 0 }, uAccent: { value: accent }, uInk: { value: new THREE.Color("#8b9096") } },
        vertexShader: glsl.edgeVert(EDGES), fragmentShader: glsl.edgeFrag,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      });
      world.add(new THREE.Mesh(edgeGeo, edgeMat));

      /* ---------------------------------------------------------- particles */
      const simSize = Math.min(512, Math.max(32, Math.round((mobile ? 96 : 176) * Math.sqrt(density))));
      const gpu = new GPUComputationRenderer(simSize, simSize, renderer);
      const pos0 = gpu.createTexture();
      const vel0 = gpu.createTexture();
      {
        const pa = pos0.image.data as Float32Array, va = vel0.image.data as Float32Array;
        for (let i = 0; i < simSize * simSize; i++) {
          const seed = Math.random();
          pa[i * 4] = (Math.random() - 0.5) * 42;
          pa[i * 4 + 1] = (Math.random() - 0.5) * 24;
          pa[i * 4 + 2] = (Math.random() - 0.5) * 22;
          pa[i * 4 + 3] = Math.random() * (7 + seed * 9);
          va[i * 4] = (Math.random() - 0.5) * 0.4;
          va[i * 4 + 1] = (Math.random() - 0.5) * 0.4;
          va[i * 4 + 2] = (Math.random() - 0.5) * 0.4;
          va[i * 4 + 3] = seed;
        }
      }
      const velVar = gpu.addVariable("textureVelocity", glsl.simVelocity(EDGES), vel0);
      const posVar = gpu.addVariable("texturePosition", glsl.simPosition(EDGES), pos0);
      gpu.setVariableDependencies(velVar, [velVar, posVar]);
      gpu.setVariableDependencies(posVar, [velVar, posVar]);
      const simU = {
        uTime, uDt: { value: 0 }, uPull: { value: 0 }, uFlow: { value: 0 }, uCurl: { value: 2.4 }, uDamp: { value: 0.9 },
        uPointer: { value: new THREE.Vector3(0, 0, -999) }, uPointerOn: { value: 0 },
        uFocus: { value: new THREE.Vector4(0, 0, 0, 0) }, uEdgeA: { value: edgeA }, uEdgeB: { value: edgeB },
      };
      Object.assign(velVar.material.uniforms, simU);
      Object.assign(posVar.material.uniforms, { uTime, uDt: simU.uDt, uForm: { value: 0 }, uEdgeA: simU.uEdgeA, uEdgeB: simU.uEdgeB });
      const simError = gpu.init();
      let particlesOn = !simError;
      if (simError) console.warn("[scene] particle simulation unavailable:", simError);

      const dotMat = new THREE.ShaderMaterial({
        uniforms: {
          uPos: { value: null }, uVel: { value: null }, uSize: { value: (mobile ? 58 : 66) * dpr }, uFade: { value: 1 },
          uCold: { value: new THREE.Color("#5c6e82") }, uAccent: { value: accent },
        },
        vertexShader: glsl.dotsVert, fragmentShader: glsl.dotsFrag,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      });
      const dotGeo = new THREE.BufferGeometry();
      {
        const n = simSize * simSize;
        const ref = new Float32Array(n * 2);
        for (let y = 0; y < simSize; y++) for (let x = 0; x < simSize; x++) {
          const i = y * simSize + x;
          ref[i * 2] = (x + 0.5) / simSize;
          ref[i * 2 + 1] = (y + 0.5) / simSize;
        }
        dotGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
        dotGeo.setAttribute("aRef", new THREE.BufferAttribute(ref, 2));
      }
      const dots = new THREE.Points(dotGeo, dotMat);
      dots.frustumCulled = false;
      dots.visible = particlesOn;
      world.add(dots);

      /* ------------------------------------------------------- post-process */
      const composer = new EffectComposer(renderer);
      composer.setPixelRatio(dpr);
      composer.addPass(new RenderPass(scene, camera));
      const bloom = new UnrealBloomPass(new THREE.Vector2(2, 2), mobile ? 0.3 : 0.38, 0.5, 0.6);
      if (mobile) {
        // phones: run the bloom mips at half the framebuffer size
        const setSize = bloom.setSize.bind(bloom);
        bloom.setSize = (w: number, h: number) => setSize(Math.round(w / 2), Math.round(h / 2));
      }
      composer.addPass(bloom);
      composer.addPass(new OutputPass());
      if (!mobile) composer.addPass(new FXAAPass());
      const post = new ShaderPass({
        uniforms: { tDiffuse: { value: null }, uTime, uAberr: { value: mobile ? 0.004 : 0.007 }, uGrain: { value: 0.022 }, uRes: { value: new THREE.Vector2(1, 1) } },
        vertexShader: glsl.postVert, fragmentShader: glsl.postFrag,
      });
      composer.addPass(post);

      /* --------------------------------------------------------- interaction */
      let hoverIdx = -1, focusIdx = -1;
      const drag = { on: false, px: 0, py: 0, moved: 0 };
      const target = { rx: -0.1, ry: -0.38 };
      const cur = { rx: -0.1, ry: -0.38 };
      const par = { x: 0, y: 0, tx: 0, ty: 0 };
      let idle = 0;
      let lastPt = { x: 0, y: 0 };
      let heroProgress = 0;
      let dirtyFrames = 120;
      const wake = () => { dirtyFrames = 120; };
      const ray = new THREE.Raycaster();
      const ptr = new THREE.Vector2(-2, -2);
      let ptrInside = false;
      const ptrPlane = new THREE.Plane();
      const ptrHit = new THREE.Vector3();
      const ptrPrev = new THREE.Vector3();
      let ptrSpeed = 0;
      const tmp = new THREE.Vector3();
      const tmp2 = new THREE.Vector3();

      const paintEdges = (idx: number) => {
        const near = new Set<number>();
        if (idx >= 0) {
          near.add(idx);
          edges.forEach(([a, b]) => { if (a === idx) near.add(b); if (b === idx) near.add(a); });
        }
        edges.forEach(([a, b], k) => {
          const on = idx >= 0 && (a === idx || b === idx);
          edgeState[k] = on ? 1 : idx >= 0 ? -1 : 0;
        });
        nodeList.forEach((m, i) => {
          const on = idx < 0 || near.has(i);
          m.label.style.opacity = on ? "1" : "0.22";
          m.label.style.color = idx === i ? accentHex : "#8b9096";
          m.hotTarget = idx === i ? 1 : idx >= 0 && near.has(i) ? 0.3 : 0;
          m.wireMat.opacity = (m.isModel ? 0.3 : 0.16) * (on ? 1 : 0.3);
        });
        wake();
      };

      const setFocusIdx = (idx: number) => {
        focusIdx = idx;
        paintEdges(idx >= 0 ? idx : hoverIdx);
        if (idx < 0) {
          camGoal.copy(camHome);
          lookGoal.set(0, 0, 0);
          setFocus(null);
          return;
        }
        setFocus({ node: nodeData[idx], idx });
      };
      focusFn.current = setFocusIdx;

      const rect = () => renderer.domElement.getBoundingClientRect();
      const down = (e: PointerEvent) => {
        drag.on = true; drag.moved = 0; drag.px = e.clientX; drag.py = e.clientY;
        renderer.domElement.style.cursor = "grabbing";
        wake();
      };
      const pointerUp = () => {
        if (drag.on && drag.moved < 5) setFocusIdx(hoverIdx >= 0 ? (hoverIdx === focusIdx ? -1 : hoverIdx) : -1);
        drag.on = false;
        renderer.domElement.style.cursor = hoverIdx >= 0 ? "pointer" : "grab";
        wake();
      };
      const move = (e: PointerEvent) => {
        const r = rect();
        ptr.x = ((e.clientX - r.left) / r.width) * 2 - 1;
        ptr.y = -((e.clientY - r.top) / r.height) * 2 + 1;
        ptrInside = true;
        par.tx = ptr.x; par.ty = ptr.y;
        lastPt = { x: e.clientX - r.left, y: e.clientY - r.top };
        if (drag.on) {
          drag.moved += Math.abs(e.clientX - drag.px) + Math.abs(e.clientY - drag.py);
          target.ry += (e.clientX - drag.px) * 0.005;
          target.rx = Math.max(-0.7, Math.min(0.7, target.rx + (e.clientY - drag.py) * 0.004));
          drag.px = e.clientX; drag.py = e.clientY;
          idle = 0;
        }
        wake();
      };
      const leave = () => { ptr.set(-2, -2); ptrInside = false; par.tx = 0; par.ty = 0; drag.on = false; wake(); };
      const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setFocusIdx(-1); };
      const onScroll = () => { heroProgress = Math.min(1, window.scrollY / Math.max(1, window.innerHeight)); wake(); };
      el.addEventListener("pointerdown", down);
      window.addEventListener("pointerup", pointerUp);
      el.addEventListener("pointermove", move);
      el.addEventListener("pointerleave", leave);
      window.addEventListener("keydown", onKey);
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();

      // keep labels clear of the hero copy
      type Zone = { x1: number; y1: number; x2: number; y2: number };
      let zones: Zone[] = [];
      const computeExcl = () => {
        const hostR = el.getBoundingClientRect();
        const els = el.parentElement?.querySelectorAll<HTMLElement>("[data-hero-copy]") ?? [];
        const out: Zone[] = [];
        els.forEach((e) => {
          const r = e.getBoundingClientRect();
          if (!r.width || !r.height) return;
          out.push({ x1: r.left - hostR.left - 10, y1: r.top - hostR.top - 8, x2: r.right - hostR.left + 10, y2: r.bottom - hostR.top + 8 });
        });
        zones = out;
      };
      const exclTimer = window.setTimeout(computeExcl, 2400);

      const resize = () => {
        const w = el.clientWidth || 1, h = el.clientHeight || 1;
        renderer.setSize(w, h, false);
        composer.setSize(w, h);
        post.uniforms.uRes.value.set(w * dpr, h * dpr);
        nebulaMat.uniforms.uAspect.value = w / h;
        camera.aspect = w / h;
        // pull the camera back on narrow / portrait viewports so the graph fits
        camHome.z = w < 760 ? 38 : w / h < 1 ? 33 : 26;
        camStart.z = camHome.z + 20;
        if (focusIdx < 0) camGoal.copy(camHome);
        if (still) camera.position.copy(camHome);
        camera.updateProjectionMatrix();
        computeExcl();
        wake();
      };
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(el);

      /* ---------------------------------------------------------------- loop */
      let raf = 0, t0 = performance.now(), visible = true;
      let ready = still, introT = still ? 99 : 0, simTime = 0;
      const io = new IntersectionObserver((es) => { visible = es[0].isIntersecting; }, { threshold: 0 });
      io.observe(el);

      const setSim = (form: number, dt: number) => {
        simU.uDt.value = dt;
        simU.uPull.value = 2.6 * form;
        simU.uFlow.value = 0.25 + 1.55 * form;
        simU.uCurl.value = 2.4 + (0.45 - 2.4) * form;
        simU.uDamp.value = 0.9 + (2.1 - 0.9) * form;
        posVar.material.uniforms.uForm.value = form;
      };

      if (still && particlesOn) {
        // settle the field once so the still frame already shows the pipeline
        setSim(1, 1 / 60);
        for (let i = 0; i < 300; i++) gpu.compute();
      }

      const tick = () => {
        raf = requestAnimationFrame(tick);
        if (!visible) return;
        const now = performance.now();
        const dt = Math.min(0.05, (now - t0) / 1000);
        t0 = now;
        if (still) {
          if (dirtyFrames <= 0) return;
          dirtyFrames--;
        }
        if (!ready && document.documentElement.classList.contains("is-ready")) ready = true;
        if (ready && !still) introT += dt;
        const form = still ? 1 : easeOut(introT / 2.4);
        const hp = heroProgress;
        idle += dt;

        if (!still) {
          simTime += dt * speed;
          uTime.value = simTime;
          if (idle > 2.4 && !drag.on && focusIdx < 0) target.ry += dt * 0.035;
          cur.rx += (target.rx - cur.rx) * 0.06;
          cur.ry += (target.ry - cur.ry) * 0.06;
          par.x += (par.tx - par.x) * 0.05;
          par.y += (par.ty - par.y) * 0.05;
        }
        world.rotation.x = cur.rx + par.y * 0.05;
        world.rotation.y = cur.ry + par.x * 0.08;
        world.position.y = -0.6 + hp * 4;
        world.position.z = -hp * 8;
        world.updateMatrixWorld();
        nebulaMat.uniforms.uOffset.value.set(par.x * 0.05 + cur.ry * 0.15, par.y * 0.04 + hp * 0.3);
        floorMat.uniforms.uScan.value = ((simTime * 3.2) % 90) - 45;

        // pointer in world-local space: intersect the ray with the plane facing the camera through the origin
        ray.setFromCamera(ptr, camera);
        if (ptrInside) {
          camera.getWorldDirection(tmp);
          world.getWorldPosition(tmp2);
          ptrPlane.setFromNormalAndCoplanarPoint(tmp, tmp2);
          if (ray.ray.intersectPlane(ptrPlane, ptrHit)) {
            world.worldToLocal(ptrHit);
            const v = ptrHit.distanceTo(ptrPrev) / Math.max(dt, 1e-3);
            ptrSpeed += (Math.min(v, 40) - ptrSpeed) * 0.2;
            ptrPrev.copy(ptrHit);
            simU.uPointer.value.copy(ptrHit);
          }
        } else {
          ptrSpeed *= 0.9;
        }
        const ptrGoal = ptrInside ? Math.min(1.5, 0.3 + ptrSpeed * 0.06) : 0;
        simU.uPointerOn.value += (ptrGoal - simU.uPointerOn.value) * 0.12;

        const fw = simU.uFocus.value;
        fw.w += ((focusIdx >= 0 ? 1 : 0) - fw.w) * 0.05;
        if (focusIdx >= 0) {
          const n = nodeData[focusIdx];
          fw.x += (n.x - fw.x) * 0.1; fw.y += (n.y - fw.y) * 0.1; fw.z += (n.z - fw.z) * 0.1;
        }

        if (particlesOn && !still) {
          setSim(form, dt * speed);
          try {
            gpu.compute();
          } catch (err) {
            console.warn("[scene] particle simulation stopped:", err);
            particlesOn = false;
            dots.visible = false;
          }
        }
        if (particlesOn) {
          dotMat.uniforms.uPos.value = gpu.getCurrentRenderTarget(posVar).texture;
          dotMat.uniforms.uVel.value = gpu.getCurrentRenderTarget(velVar).texture;
          dotMat.uniforms.uFade.value = (0.25 + 0.75 * form) * (1 - 0.45 * fw.w);
        }

        edgeMat.uniforms.uReveal.value = still ? 99 : clamp01((introT - 0.55) / 1.9) * (colCount + 0.4);

        nodeList.forEach((m, i) => {
          const intro = still ? 1 : elastic((introT - 0.3 - colOf[i] * 0.16) / 1.1);
          const want = (i === focusIdx ? 1.45 : i === hoverIdx ? 1.3 : 1) * m.scaleTarget;
          m.scale += (want - m.scale) * 0.12;
          m.group.scale.setScalar(Math.max(0.0001, m.scale * intro));
          m.hot += (m.hotTarget - m.hot) * 0.1;
          m.coreMat.uniforms.uHot.value = m.hot + (m.isModel ? 0.15 + 0.15 * Math.sin(simTime * 1.4 + i) : 0);
          if (!still) {
            m.rings.forEach((r, k) => {
              r.rotation.z += dt * (0.25 + k * 0.2) * (m.isModel ? 1.6 : 1);
              r.rotation.x += dt * 0.08 * (k + 1);
            });
            m.group.children[1].rotation.y += dt * (m.isModel ? 0.35 : 0.14);
            m.group.children[1].rotation.x += dt * 0.05;
          }
        });

        if (focusIdx >= 0) {
          nodeList[focusIdx].group.getWorldPosition(tmp);
          camGoal.set(tmp.x * 0.55, tmp.y * 0.6 + 1.6, 15.5);
          lookGoal.copy(tmp).multiplyScalar(0.75);
        }
        camera.position.lerp(camGoal, still ? 1 : introT < 3.5 ? 0.03 : 0.055);
        lookNow.lerp(lookGoal, still ? 1 : 0.06);
        camera.lookAt(lookNow);

        const hit = ray.intersectObjects(hitMeshes, false)[0];
        const idx = hit ? (hit.object.userData.i as number) : -1;
        if (idx !== hoverIdx) {
          hoverIdx = idx;
          if (focusIdx < 0) paintEdges(idx);
          renderer.domElement.style.cursor = idx >= 0 ? "pointer" : drag.on ? "grabbing" : "grab";
          setHover(idx >= 0 ? { node: nodeData[idx], x: lastPt.x, y: lastPt.y } : null);
        } else if (idx >= 0) {
          setHover((h) => (h && (Math.abs(lastPt.x - h.x) > 6 || Math.abs(lastPt.y - h.y) > 6) ? { ...h, x: lastPt.x, y: lastPt.y } : h));
        }

        // project labels to screen space
        const w = el.clientWidth, h = el.clientHeight;
        nodeList.forEach((m) => {
          m.group.getWorldPosition(tmp);
          const d = tmp.distanceTo(camera.position);
          tmp.project(camera);
          const sx = (tmp.x * 0.5 + 0.5) * w;
          const sy = (-tmp.y * 0.5 + 0.5) * h - (m.isModel ? 34 : 26);
          const lb = m.label;
          if (!m.lw && lb.offsetWidth) { m.lw = lb.offsetWidth; m.lh = lb.offsetHeight || 12; }
          const lw = (m.lw || 80) / 2 + 4, lh = (m.lh || 12) / 2 + 3;
          const clash = zones.some((q) => sx + lw > q.x1 && sx - lw < q.x2 && sy + lh > q.y1 && sy - lh < q.y2);
          const vis = tmp.z < 1 && hp < 0.75 && !clash && form > 0.6;
          lb.style.transform = `translate(${sx}px,${sy}px) translate(-50%,-50%)`;
          lb.style.visibility = vis ? "visible" : "hidden";
          if (vis && focusIdx < 0 && hoverIdx < 0) lb.style.opacity = String(Math.max(0.18, Math.min(0.9, 1.6 - d / 26)) * (1 - hp) * form);
        });
        renderer.domElement.style.opacity = String(Math.max(0, 1 - hp * 0.9));

        composer.render();
      };
      paintEdges(-1);
      tick();

      cleanup = () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        io.disconnect();
        window.clearTimeout(exclTimer);
        el.removeEventListener("pointerdown", down);
        window.removeEventListener("pointerup", pointerUp);
        el.removeEventListener("pointermove", move);
        el.removeEventListener("pointerleave", leave);
        window.removeEventListener("keydown", onKey);
        window.removeEventListener("scroll", onScroll);
        scene.traverse((o) => {
          const mesh = o as THREE.Mesh;
          if (mesh.geometry) mesh.geometry.dispose();
          const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
          if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
          else mat?.dispose();
        });
        ringGeoA.dispose();
        ringGeoB.dispose();
        gpu.dispose();
        bloom.dispose();
        composer.dispose();
        renderer.dispose();
        renderer.domElement.remove();
        labelLayer.remove();
      };
    } catch (err) {
      console.error("[scene] hero scene failed to start:", err);
      cleanup();
      el.replaceChildren();
    }

    return () => {
      cleanup();
    };
  }, [motion, density]);

  return (
    <>
      <div ref={host} className={`${styles.host} ${className ?? ""}`} data-scene aria-hidden="true">
        {hover && !focus && (
          <div className={styles.tip} style={{ left: hover.x, top: hover.y }}>
            <div className={styles.kind}>{hover.node.kind}</div>
            <div className={styles.tipName}>{hover.node.name}</div>
          </div>
        )}
      </div>
      {focus && (
        <div className={styles.card} role="dialog" aria-label={focus.node.name}>
          <div className={styles.bar} />
          <div className={styles.body}>
            <div className={styles.cardKind}>
              {focus.node.kind} · node {String(focus.idx + 1).padStart(2, "0")}
            </div>
            <div className={styles.cardName}>{focus.node.name}</div>
            <div className={styles.meta}>{focus.node.meta}</div>
          </div>
          <button className={styles.esc} onClick={() => focusFn.current(-1)} aria-label="Close">
            esc
          </button>
        </div>
      )}
    </>
  );
}
