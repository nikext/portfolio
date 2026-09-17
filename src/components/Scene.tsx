"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { nodes as nodeData, type GraphNode } from "@/data/nodes";
import styles from "./Scene.module.css";

type Hover = { node: GraphNode; x: number; y: number } | null;
type Focus = { node: GraphNode; idx: number } | null;

type Props = {
  className?: string;
  /** "full" animates everything, "calm" slows it, "off" renders a still frame. */
  motion?: "full" | "calm" | "off";
  /** Scales particle and packet counts. */
  density?: number;
};

const cssVar = (name: string, fallback: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;

/**
 * Hero scene: a wireframe graph of the AI-ops pipeline described in data/nodes.
 * Drag to orbit, hover for a tooltip, click a node to focus it. The whole
 * three.js lifecycle lives in one effect; React only owns the overlays.
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

    {

      const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const still = motion === "off" || calm;
      const speed = motion === "calm" ? 0.45 : 1;
      const accentHex = cssVar("--accent", "#e8543f");
      const accent = new THREE.Color(accentHex);
      const ink = new THREE.Color(0xc7cbd0);

      const scene = new THREE.Scene();
      scene.fog = new THREE.Fog(0x15171a, 20, 48);
      const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
      const camHome = new THREE.Vector3(0, 2.2, 26);
      camera.position.copy(camHome);
      const camGoal = camHome.clone();
      const lookGoal = new THREE.Vector3();
      const lookNow = new THREE.Vector3();

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setClearColor(0x000000, 0);
      renderer.domElement.style.display = "block";
      el.appendChild(renderer.domElement);

      const labelLayer = document.createElement("div");
      labelLayer.style.cssText = "position:absolute;inset:0;pointer-events:none;overflow:hidden";
      el.appendChild(labelLayer);

      const world = new THREE.Group();
      scene.add(world);

      // floor grid + sweeping scan bar
      const grid = new THREE.GridHelper(64, 44, 0x2a2e33, 0x21252a);
      grid.position.y = -6.6;
      (grid.material as THREE.Material).transparent = true;
      (grid.material as THREE.Material).opacity = 0.3;
      world.add(grid);

      const scanMat = new THREE.MeshBasicMaterial({
        color: accent.clone(), transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const scan = new THREE.Mesh(new THREE.PlaneGeometry(64, 0.5), scanMat);
      scan.rotation.x = -Math.PI / 2;
      scan.position.y = -6.55;
      world.add(scan);

      // soft radial glow texture, shared by sprites and packets
      const gc = document.createElement("canvas");
      gc.width = gc.height = 128;
      const gx = gc.getContext("2d")!;
      const gr = gx.createRadialGradient(64, 64, 0, 64, 64, 64);
      gr.addColorStop(0, "rgba(255,255,255,1)");
      gr.addColorStop(0.35, "rgba(255,255,255,.35)");
      gr.addColorStop(1, "rgba(255,255,255,0)");
      gx.fillStyle = gr;
      gx.fillRect(0, 0, 128, 128);
      const glowTex = new THREE.CanvasTexture(gc);

      // nodes
      type NodeMesh = THREE.Mesh & {
        userData: {
          i: number; n: GraphNode; isModel: boolean; base: number;
          wire: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
          glow: THREE.Sprite; label: HTMLDivElement; lw?: number; lh?: number;
        };
      };
      const coreMat = new THREE.MeshBasicMaterial({ color: 0x1c1f23 });
      const nodeMeshes: NodeMesh[] = [];
      nodeData.forEach((n, i) => {
        const isModel = n.kind === "model";
        const rad = isModel ? 1.05 : 0.7;
        const g = isModel ? new THREE.IcosahedronGeometry(rad, 1) : new THREE.OctahedronGeometry(rad, 0);
        const core = new THREE.Mesh(g, coreMat) as unknown as NodeMesh;
        const wire = new THREE.Mesh(
          g,
          new THREE.MeshBasicMaterial({
            color: isModel ? accent.clone() : ink.clone(), wireframe: true, transparent: true, opacity: isModel ? 1 : 0.8,
          }),
        );
        core.add(wire);
        const glow = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: glowTex, color: isModel ? accent.clone() : new THREE.Color(0x6f767d),
            transparent: true, opacity: isModel ? 0.5 : 0.16, blending: THREE.AdditiveBlending, depthWrite: false,
          }),
        );
        glow.scale.setScalar(isModel ? 5.6 : 3);
        core.add(glow);
        core.position.set(n.x, n.y, n.z);

        const label = document.createElement("div");
        label.textContent = n.name;
        label.style.cssText =
          "position:absolute;left:0;top:0;font-family:var(--mono);font-size:10px;letter-spacing:.08em;color:#8b9096;white-space:nowrap;transform:translate(-50%,-50%);transition:color .25s ease,opacity .25s ease;will-change:transform,opacity";
        labelLayer.appendChild(label);

        core.userData = { i, n, isModel, base: isModel ? 1 : 0.8, wire, glow, label };
        world.add(core);
        nodeMeshes.push(core);
      });

      // edges: fully connect adjacent columns (grouped by rounded x)
      const cols = new Map<number, number[]>();
      nodeData.forEach((n, i) => {
        const k = Math.round(n.x);
        cols.set(k, [...(cols.get(k) ?? []), i]);
      });
      const colKeys = [...cols.keys()].sort((a, b) => a - b);
      const edges: [number, number][] = [];
      for (let c = 0; c < colKeys.length - 1; c++) {
        for (const a of cols.get(colKeys[c])!) for (const b of cols.get(colKeys[c + 1])!) edges.push([a, b]);
      }
      const pos: number[] = [], col: number[] = [];
      edges.forEach(([a, b]) => {
        const A = nodeData[a], B = nodeData[b];
        pos.push(A.x, A.y, A.z, B.x, B.y, B.z);
        col.push(0.44, 0.47, 0.5, 0.44, 0.47, 0.5);
      });
      const eg = new THREE.BufferGeometry();
      eg.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      eg.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
      const lines = new THREE.LineSegments(eg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.6 }));
      world.add(lines);

      let hoverIdx = -1, focusIdx = -1;

      const paintEdges = (idx: number) => {
        const c = eg.attributes.color.array as Float32Array;
        edges.forEach(([a, b], k) => {
          const on = idx >= 0 && (a === idx || b === idx);
          const dim = idx >= 0 && !on;
          const v = on ? [accent.r, accent.g, accent.b] : dim ? [0.2, 0.21, 0.22] : [0.44, 0.47, 0.5];
          for (let s = 0; s < 2; s++) {
            c[k * 6 + s * 3] = v[0];
            c[k * 6 + s * 3 + 1] = v[1];
            c[k * 6 + s * 3 + 2] = v[2];
          }
        });
        eg.attributes.color.needsUpdate = true;
        const near = new Set<number>();
        if (idx >= 0) {
          near.add(idx);
          edges.forEach(([a, b]) => { if (a === idx) near.add(b); if (b === idx) near.add(a); });
        }
        nodeMeshes.forEach((m, i) => {
          const on = idx < 0 || near.has(i);
          m.userData.label.style.opacity = on ? "1" : "0.22";
          m.userData.label.style.color = idx === i ? accentHex : "#8b9096";
          m.userData.wire.material.opacity = on ? m.userData.base : m.userData.base * 0.3;
        });
      };

      // packets travelling along edges
      const packetCount = Math.max(20, Math.round(edges.length * 0.75 * density));
      const pk = new Float32Array(packetCount * 3);
      const pkEdge: number[] = [], pkT: number[] = [], pkSpd: number[] = [];
      for (let i = 0; i < packetCount; i++) {
        pkEdge.push((Math.random() * edges.length) | 0);
        pkT.push(Math.random());
        pkSpd.push(0.16 + Math.random() * 0.3);
      }
      const pg = new THREE.BufferGeometry();
      pg.setAttribute("position", new THREE.BufferAttribute(pk, 3));
      const packetMat = new THREE.PointsMaterial({
        map: glowTex, color: accent.clone(), size: 0.34, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false,
      });
      world.add(new THREE.Points(pg, packetMat));

      // slow-falling star field behind everything
      const fieldCount = Math.round(1500 * density);
      const fp = new Float32Array(fieldCount * 3);
      const fv: number[] = [];
      for (let i = 0; i < fieldCount; i++) {
        fp[i * 3] = (Math.random() - 0.5) * 48;
        fp[i * 3 + 1] = (Math.random() - 0.5) * 24;
        fp[i * 3 + 2] = -6 - Math.random() * 24;
        fv.push(0.9 + Math.random() * 2.6);
      }
      const fg = new THREE.BufferGeometry();
      fg.setAttribute("position", new THREE.BufferAttribute(fp, 3));
      world.add(new THREE.Points(fg, new THREE.PointsMaterial({ color: 0x565c63, size: 0.06, transparent: true, opacity: 0.7 })));

      // interaction state
      const drag = { on: false, px: 0, py: 0, moved: 0 };
      const target = { rx: -0.12, ry: -0.42 };
      const cur = { rx: -0.12, ry: -0.42 };
      const par = { x: 0, y: 0, tx: 0, ty: 0 };
      let idle = 0;
      let lastPt = { x: 0, y: 0 };
      let heroProgress = 0;
      const ray = new THREE.Raycaster();
      const ptr = new THREE.Vector2(-2, -2);
      const tmp = new THREE.Vector3();

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
      };
      const up = () => {
        if (drag.on && drag.moved < 5) setFocusIdx(hoverIdx >= 0 ? (hoverIdx === focusIdx ? -1 : hoverIdx) : -1);
        drag.on = false;
        renderer.domElement.style.cursor = hoverIdx >= 0 ? "pointer" : "grab";
      };
      const move = (e: PointerEvent) => {
        const r = rect();
        ptr.x = ((e.clientX - r.left) / r.width) * 2 - 1;
        ptr.y = -((e.clientY - r.top) / r.height) * 2 + 1;
        par.tx = ptr.x; par.ty = ptr.y;
        lastPt = { x: e.clientX - r.left, y: e.clientY - r.top };
        if (drag.on) {
          drag.moved += Math.abs(e.clientX - drag.px) + Math.abs(e.clientY - drag.py);
          target.ry += (e.clientX - drag.px) * 0.005;
          target.rx = Math.max(-0.7, Math.min(0.7, target.rx + (e.clientY - drag.py) * 0.004));
          drag.px = e.clientX; drag.py = e.clientY;
          idle = 0;
        }
      };
      const leave = () => { ptr.set(-2, -2); par.tx = 0; par.ty = 0; drag.on = false; };
      const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setFocusIdx(-1); };
      const onScroll = () => { heroProgress = Math.min(1, window.scrollY / Math.max(1, window.innerHeight)); };
      el.addEventListener("pointerdown", down);
      window.addEventListener("pointerup", up);
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
        camera.aspect = w / h;
        // pull the camera back on narrow / portrait viewports so the graph fits
        camHome.z = w < 760 ? 36 : w / h < 1 ? 32 : 26;
        if (focusIdx < 0) camGoal.copy(camHome);
        camera.updateProjectionMatrix();
        computeExcl();
      };
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(el);

      let raf = 0, t0 = performance.now(), visible = true;
      const io = new IntersectionObserver((es) => { visible = es[0].isIntersecting; }, { threshold: 0 });
      io.observe(el);

      const tick = () => {
        raf = requestAnimationFrame(tick);
        if (!visible) return;
        const now = performance.now();
        const dt = Math.min(0.05, (now - t0) / 1000);
        t0 = now;
        idle += dt;
        const hp = heroProgress;

        if (!still) {
          if (idle > 2.4 && !drag.on && focusIdx < 0) target.ry += dt * 0.035;
          cur.rx += (target.rx - cur.rx) * 0.06;
          cur.ry += (target.ry - cur.ry) * 0.06;
          par.x += (par.tx - par.x) * 0.05;
          par.y += (par.ty - par.y) * 0.05;
          world.rotation.x = cur.rx + par.y * 0.05;
          world.rotation.y = cur.ry + par.x * 0.08;
          world.position.y = hp * 4;
          world.position.z = -hp * 8;

          const arr = pg.attributes.position.array as Float32Array;
          for (let i = 0; i < packetCount; i++) {
            pkT[i] += pkSpd[i] * dt * speed;
            if (pkT[i] > 1) { pkT[i] = 0; pkEdge[i] = (Math.random() * edges.length) | 0; }
            const [a, b] = edges[pkEdge[i]];
            const A = nodeData[a], B = nodeData[b], tt = pkT[i];
            arr[i * 3] = A.x + (B.x - A.x) * tt;
            arr[i * 3 + 1] = A.y + (B.y - A.y) * tt + Math.sin(tt * Math.PI) * 0.35;
            arr[i * 3 + 2] = A.z + (B.z - A.z) * tt;
          }
          pg.attributes.position.needsUpdate = true;

          const fa = fg.attributes.position.array as Float32Array;
          for (let i = 0; i < fieldCount; i++) {
            fa[i * 3 + 1] -= fv[i] * dt * speed;
            if (fa[i * 3 + 1] < -12) fa[i * 3 + 1] = 12;
          }
          fg.attributes.position.needsUpdate = true;

          scan.position.z = (((now / 1000) * 3 * speed) % 64) - 32;

          nodeMeshes.forEach((m, i) => {
            m.rotation.y += dt * (m.userData.isModel ? 0.35 : 0.14);
            m.rotation.x += dt * 0.05;
            const p = 0.5 + 0.5 * Math.sin(now / 900 + i);
            m.userData.glow.material.opacity = (m.userData.isModel ? 0.42 : 0.14) * (0.65 + p * 0.5);
          });
        }

        if (focusIdx >= 0) {
          nodeMeshes[focusIdx].getWorldPosition(tmp);
          camGoal.set(tmp.x * 0.55, tmp.y * 0.6 + 1.6, 13.5);
          lookGoal.copy(tmp).multiplyScalar(0.75);
        }
        camera.position.lerp(camGoal, 0.055);
        lookNow.lerp(lookGoal, 0.06);
        camera.lookAt(lookNow);

        ray.setFromCamera(ptr, camera);
        const hit = ray.intersectObjects(nodeMeshes, false)[0];
        const idx = hit ? (hit.object as NodeMesh).userData.i : -1;
        if (idx !== hoverIdx) {
          hoverIdx = idx;
          nodeMeshes.forEach((m) => m.scale.setScalar(1));
          if (idx >= 0) nodeMeshes[idx].scale.setScalar(1.4);
          if (focusIdx < 0) paintEdges(idx);
          renderer.domElement.style.cursor = idx >= 0 ? "pointer" : drag.on ? "grabbing" : "grab";
          setHover(idx >= 0 ? { node: nodeData[idx], x: lastPt.x, y: lastPt.y } : null);
        } else if (idx >= 0) {
          setHover((h) => (h && (Math.abs(lastPt.x - h.x) > 6 || Math.abs(lastPt.y - h.y) > 6) ? { ...h, x: lastPt.x, y: lastPt.y } : h));
        }

        // project labels to screen space
        const w = el.clientWidth, h = el.clientHeight;
        nodeMeshes.forEach((m) => {
          m.getWorldPosition(tmp);
          const d = tmp.distanceTo(camera.position);
          tmp.project(camera);
          const sx = (tmp.x * 0.5 + 0.5) * w;
          const sy = (-tmp.y * 0.5 + 0.5) * h - (m.userData.isModel ? 32 : 24);
          const lb = m.userData.label;
          if (!m.userData.lw && lb.offsetWidth) { m.userData.lw = lb.offsetWidth; m.userData.lh = lb.offsetHeight || 12; }
          const lw = (m.userData.lw || 80) / 2 + 4, lh = (m.userData.lh || 12) / 2 + 3;
          const clash = zones.some((q) => sx + lw > q.x1 && sx - lw < q.x2 && sy + lh > q.y1 && sy - lh < q.y2);
          const vis = tmp.z < 1 && hp < 0.75 && !clash;
          lb.style.transform = `translate(${sx}px,${sy}px) translate(-50%,-50%)`;
          lb.style.visibility = vis ? "visible" : "hidden";
          if (vis && focusIdx < 0 && hoverIdx < 0) lb.style.opacity = String(Math.max(0.18, Math.min(0.9, 1.6 - d / 26)) * (1 - hp));
        });
        renderer.domElement.style.opacity = String(Math.max(0, 1 - hp * 0.9));

        renderer.render(scene, camera);
      };
      paintEdges(-1);
      tick();

      cleanup = () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        io.disconnect();
        window.clearTimeout(exclTimer);
        el.removeEventListener("pointerdown", down);
        window.removeEventListener("pointerup", up);
        el.removeEventListener("pointermove", move);
        el.removeEventListener("pointerleave", leave);
        window.removeEventListener("keydown", onKey);
        window.removeEventListener("scroll", onScroll);
        renderer.dispose();
        glowTex.dispose();
        renderer.domElement.remove();
        labelLayer.remove();
      };
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
