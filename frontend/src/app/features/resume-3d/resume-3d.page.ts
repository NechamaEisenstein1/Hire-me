import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { gsap } from 'gsap';
import * as THREE from 'three';

import { ApiService } from '../../core/services/api.service';
import {
  ParsedResume,
} from '../resume-studio/resume-parser';

// ── Card proportions (business-card 1.586 : 1) ────────────────────────────────
const CARD_W = 3.4;
const CARD_H = CARD_W / 1.586;
// Canvas texture resolution — high enough to look crisp at 2x DPR
const TEX_W = 1024;
const TEX_H = Math.round(TEX_W / 1.586);

@Component({
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="mx-auto max-w-5xl px-4 py-8 md:px-8">
      <section class="rounded-2xl border border-brand-200/70 bg-white/70 p-6 shadow-sm backdrop-blur-sm dark:border-brand-700/60 dark:bg-brand-900/35">

        <!-- ── Header ── -->
        <div class="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 class="text-2xl font-semibold">3D Interactive Resume</h2>
            <p class="mt-1 text-sm opacity-60">
              @if (loading()) { Loading resume data… }
              @else if (!error()) { Click the card to flip &nbsp;·&nbsp; hover to tilt }
            </p>
          </div>
          <a
            routerLink="/resume-studio"
            class="rounded-lg border border-brand-400 px-3 py-1.5 text-xs font-medium no-underline transition hover:bg-brand-100 dark:border-brand-600 dark:hover:bg-brand-800/60"
          >
            Full Resume →
          </a>
        </div>

        <!-- ── Error ── -->
        @if (error()) {
          <div class="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900 dark:border-red-700 dark:bg-red-900/25 dark:text-red-200">
            {{ error() }}
          </div>
        }

        <!-- ── Loading skeleton ── -->
        @if (loading()) {
          <div class="mt-4 h-[62vh] w-full animate-pulse rounded-xl bg-brand-100 dark:bg-brand-800/40"></div>
        }

        <!-- ── 3D canvas ── -->
        <div
          #canvasHost
          class="mt-4 h-[62vh] w-full cursor-pointer overflow-hidden rounded-xl border border-brand-200/70 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 dark:border-brand-700/60"
          [class.hidden]="loading() || !!error()"
          (click)="flipCard()"
          (keydown.enter)="flipCard()"
          (keydown.space)="flipCard()"
          role="button"
          tabindex="0"
          aria-label="3D resume card — press Enter or Space to flip"
        ></div>

        <!-- ── Flip hint ── -->
        @if (!loading() && !error()) {
          <p class="mt-3 text-center text-xs opacity-40 select-none">
            {{ flipped() ? '← front' : 'back →' }}&nbsp;&nbsp;click to flip
          </p>
        }

      </section>
    </div>
  `,
})
export class Resume3dPage implements AfterViewInit, OnDestroy {
  @ViewChild('canvasHost', { static: true })
  canvasHost!: ElementRef<HTMLDivElement>;

  readonly loading = signal(true);
  readonly error = signal('');
  readonly flipped = signal(false);

  private readonly api = inject(ApiService);

  private renderer?: THREE.WebGLRenderer;
  private animId?: number;
  private cardGroup?: THREE.Group;
  private floatTween?: gsap.core.Tween;
  private flipTween?: gsap.core.Tween;
  private shimmerTween?: gsap.core.Tween;
  private isFlipping = false;
  private pointer = { x: 0, y: 0 };
  private onResize?: () => void;
  private onPointerMove?: (e: PointerEvent) => void;
  private onPointerLeave?: () => void;

  // Disposables kept for cleanup
  private readonly textures: THREE.CanvasTexture[] = [];
  private readonly materials: THREE.Material[] = [];
  private readonly geometries: THREE.BufferGeometry[] = [];

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  async ngAfterViewInit(): Promise<void> {
    if (!this.isWebGLAvailable()) {
      this.error.set(
        'WebGL is not available in this browser. Try enabling hardware acceleration.',
      );
      this.loading.set(false);
      return;
    }

    try {
      const profile = await this.api.get<ParsedResume>('/api/v1/resume-profile');
      this.loading.set(false);
      // Yield one tick so Angular removes the skeleton before we measure the host
      await new Promise<void>((r) => setTimeout(r, 0));
      this.buildScene(profile);
    } catch {
      this.error.set('Could not load resume data — please try again later.');
      this.loading.set(false);
    }
  }

  ngOnDestroy(): void {
    if (this.animId) cancelAnimationFrame(this.animId);
    this.floatTween?.kill();
    this.flipTween?.kill();
    this.shimmerTween?.kill();
    if (this.onResize) globalThis.removeEventListener('resize', this.onResize);
    const host = this.canvasHost.nativeElement;
    if (this.onPointerMove) host.removeEventListener('pointermove', this.onPointerMove);
    if (this.onPointerLeave) host.removeEventListener('pointerleave', this.onPointerLeave);
    this.textures.forEach((t) => t.dispose());
    this.materials.forEach((m) => m.dispose());
    this.geometries.forEach((g) => g.dispose());
    this.renderer?.dispose();
  }

  // ── Public actions ─────────────────────────────────────────────────────────

  flipCard(): void {
    if (this.isFlipping || !this.cardGroup) return;
    this.isFlipping = true;
    this.floatTween?.pause();

    // Reset tilt before flip to avoid a jittery transition between axes.
    gsap.to(this.cardGroup.rotation, {
      x: 0,
      z: 0,
      duration: 0.22,
      ease: 'power1.out',
      overwrite: true,
    });

    const nextFlipped = !this.flipped();
    const targetY = nextFlipped ? Math.PI : 0;

    this.flipTween = gsap.to(this.cardGroup.rotation, {
      y: targetY,
      duration: 0.72,
      ease: 'power2.inOut',
      onComplete: () => {
        this.flipped.set(nextFlipped);
        this.isFlipping = false;
        this.floatTween?.resume();
      },
    });
  }

  // ── Scene ──────────────────────────────────────────────────────────────────

  private buildScene(profile: ParsedResume): void {
    const host = this.canvasHost.nativeElement;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setSize(host.clientWidth, host.clientHeight);
    this.renderer.setClearColor(0x000000, 0); // transparent — CSS bg visible
    host.appendChild(this.renderer.domElement);

    // Scene & camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      48,
      host.clientWidth / host.clientHeight,
      0.1,
      100,
    );
    camera.position.z = 5.8;

    // Soft directional rim
    const rim = new THREE.DirectionalLight(0x7fffb0, 0.55);
    rim.position.set(3, 2, 4);
    scene.add(rim);
    scene.add(new THREE.AmbientLight(0xffffff, 0.9));

    // Background star field
    scene.add(this.buildStarfield());

    // Card
    this.cardGroup = this.buildCard(profile);
    scene.add(this.cardGroup);

    // Idle float
    const floatProxy = { y: 0 };
    this.floatTween = gsap.to(floatProxy, {
      y: 0.11,
      duration: 2.6,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
      onUpdate: () => {
        if (this.cardGroup) this.cardGroup.position.y = floatProxy.y;
      },
    });

    // Pointer parallax
    this.onPointerMove = (e: PointerEvent) => {
      if (this.isFlipping) return;
      const rect = host.getBoundingClientRect();
      this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    };
    this.onPointerLeave = () => {
      this.pointer.x = 0;
      this.pointer.y = 0;
    };
    host.addEventListener('pointermove', this.onPointerMove);
    host.addEventListener('pointerleave', this.onPointerLeave);

    // Resize
    this.onResize = () => {
      const w = Math.max(host.clientWidth, 1);
      const h = Math.max(host.clientHeight, 1);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      this.renderer?.setSize(w, h);
    };
    globalThis.addEventListener('resize', this.onResize);

    // Render loop — smooth lerp tilt
    const render = () => {
      if (this.cardGroup && !this.isFlipping) {
        this.cardGroup.rotation.x +=
          (this.pointer.y * -0.16 - this.cardGroup.rotation.x) * 0.06;
        this.cardGroup.rotation.z +=
          (this.pointer.x * 0.1 - this.cardGroup.rotation.z) * 0.06;
      }
      this.renderer!.render(scene, camera);
      this.animId = requestAnimationFrame(render);
    };
    render();
  }

  // ── Card geometry ──────────────────────────────────────────────────────────

  private buildCard(profile: ParsedResume): THREE.Group {
    const group = new THREE.Group();

    // Shared plane geometry (both sides re-use the same shape, different materials)
    const geomFront = new THREE.PlaneGeometry(CARD_W, CARD_H);
    const geomBack = new THREE.PlaneGeometry(CARD_W, CARD_H);
    this.geometries.push(geomFront, geomBack);

    const frontTex = this.buildFrontTexture(profile);
    const backTex = this.buildBackTexture(profile);
    this.textures.push(frontTex, backTex);

    const frontMat = new THREE.MeshBasicMaterial({
      map: frontTex,
      side: THREE.FrontSide,
    });
    const backMat = new THREE.MeshBasicMaterial({
      map: backTex,
      side: THREE.FrontSide,
    });
    this.materials.push(frontMat, backMat);

    const frontMesh = new THREE.Mesh(geomFront, frontMat);
    frontMesh.position.z = 0.01;
    frontMesh.renderOrder = 2;
    // Back plane faces away when group.rotation.y === 0; visible when === Math.PI
    const backMesh = new THREE.Mesh(geomBack, backMat);
    backMesh.rotation.y = Math.PI;
    backMesh.position.z = -0.01;
    backMesh.renderOrder = 2;

    // Paper-thin edge — gives a satisfying physical feel
    const edgeGeom = new THREE.BoxGeometry(CARD_W, CARD_H, 0.018);
    const edgeMat = new THREE.MeshBasicMaterial({ color: '#0f172a' });
    this.geometries.push(edgeGeom);
    this.materials.push(edgeMat);
    const edge = new THREE.Mesh(edgeGeom, edgeMat);
    edge.renderOrder = 1;

    const shimmerTex = this.buildShimmerTexture();
    this.textures.push(shimmerTex);
    const shimmerMat = new THREE.MeshBasicMaterial({
      map: shimmerTex,
      transparent: true,
      side: THREE.FrontSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.26,
    });
    this.materials.push(shimmerMat);

    const shimmerFront = new THREE.Mesh(new THREE.PlaneGeometry(CARD_W, CARD_H), shimmerMat);
    shimmerFront.position.z = 0.016;
    shimmerFront.renderOrder = 3;
    const shimmerBack = new THREE.Mesh(new THREE.PlaneGeometry(CARD_W, CARD_H), shimmerMat);
    shimmerBack.rotation.y = Math.PI;
    shimmerBack.position.z = -0.016;
    shimmerBack.renderOrder = 3;
    this.geometries.push(
      shimmerFront.geometry as THREE.BufferGeometry,
      shimmerBack.geometry as THREE.BufferGeometry,
    );

    this.shimmerTween = gsap.to(shimmerTex.offset, {
      x: 1,
      duration: 3.4,
      repeat: -1,
      ease: 'none',
    });

    group.add(frontMesh, backMesh, edge, shimmerFront, shimmerBack);
    return group;
  }

  // ── Front canvas texture ───────────────────────────────────────────────────

  private buildFrontTexture(profile: ParsedResume): THREE.CanvasTexture {
    const { ctx, canvas } = this.createCanvas();

    // Gradient background
    const bg = ctx.createLinearGradient(0, 0, TEX_W, TEX_H);
    bg.addColorStop(0, '#0f172a');
    bg.addColorStop(1, '#1a2744');
    ctx.fillStyle = bg;
    this.fillRoundRect(ctx, 0, 0, TEX_W, TEX_H, 32);

    // Dot-grid watermark (top-right)
    ctx.globalAlpha = 0.07;
    ctx.fillStyle = '#4ade80';
    for (let gx = TEX_W - 190; gx < TEX_W - 30; gx += 22) {
      for (let gy = 28; gy < 190; gy += 22) {
        ctx.beginPath();
        ctx.arc(gx, gy, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    // Left accent stripe
    const stripe = ctx.createLinearGradient(0, 0, 0, TEX_H);
    stripe.addColorStop(0, '#22c55e');
    stripe.addColorStop(1, '#16a34a');
    ctx.fillStyle = stripe;
    this.fillRoundRect(ctx, 0, 0, 9, TEX_H, 4);

    const L = 48; // left padding

    // Name
    ctx.fillStyle = '#f8fafc';
    ctx.font = `bold ${Math.round(TEX_H * 0.145)}px Inter, "Helvetica Neue", sans-serif`;
    ctx.fillText(profile.name, L, Math.round(TEX_H * 0.265));

    // Title
    ctx.fillStyle = '#4ade80';
    ctx.font = `500 ${Math.round(TEX_H * 0.08)}px Inter, "Helvetica Neue", sans-serif`;
    ctx.fillText(profile.title, L, Math.round(TEX_H * 0.385));

    // Divider
    ctx.strokeStyle = '#1e3a5f';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(L, Math.round(TEX_H * 0.46));
    ctx.lineTo(TEX_W - L, Math.round(TEX_H * 0.46));
    ctx.stroke();

    // Skills label
    ctx.fillStyle = '#475569';
    ctx.font = `600 ${Math.round(TEX_H * 0.057)}px Inter, "Helvetica Neue", sans-serif`;
    ctx.fillText('SKILLS', L, Math.round(TEX_H * 0.565));

    // Skill pills
    ctx.font = `500 ${Math.round(TEX_H * 0.062)}px Inter, "Helvetica Neue", sans-serif`;
    const pillH = Math.round(TEX_H * 0.105);
    const pillPadX = 18;
    const rowGap = Math.round(TEX_H * 0.03);
    const maxRows = 2;
    const bigTechSkills = [
      'System Design',
      'Distributed Systems',
      'Scalability',
      'Cloud Architecture',
      'Kubernetes',
      'CI/CD',
      'Observability',
      'Performance',
      'Security',
      'Data Modeling',
    ];
    const skillsToRender = [...profile.skills, ...bigTechSkills]
      .filter((skill, index, arr) =>
        arr.findIndex((candidate) => candidate.toLowerCase() === skill.toLowerCase()) === index,
      )
      .slice(0, 14);

    let px = L;
    let currentRow = 0;
    const basePy = Math.round(TEX_H * 0.655);

    for (const skill of skillsToRender) {
      const tw = ctx.measureText(skill).width;
      const pw = tw + pillPadX * 2;
      if (px + pw > TEX_W - L) {
        currentRow += 1;
        if (currentRow >= maxRows) {
          break;
        }
        px = L;
      }

      const py = basePy + currentRow * (pillH + rowGap);

      // Fill
      ctx.fillStyle = '#0d2a1a';
      this.fillRoundRect(ctx, px, py - pillH * 0.78, pw, pillH, pillH / 2);
      // Border
      ctx.strokeStyle = '#22c55e55';
      ctx.lineWidth = 1.2;
      this.strokeRoundRect(ctx, px, py - pillH * 0.78, pw, pillH, pillH / 2);
      // Label
      ctx.fillStyle = '#4ade80';
      ctx.fillText(skill, px + pillPadX, py - pillH * 0.78 + pillH * 0.67);

      px += pw + 10;
    }

    // Bottom meta (location + email)
    ctx.fillStyle = '#334155';
    ctx.font = `${Math.round(TEX_H * 0.056)}px "Courier New", monospace`;
    const cleanedLocation = profile.location
      .replace(/location\s*[:\-]?\s*/i, '')
      .trim();
    if (cleanedLocation) {
      ctx.fillText(`⌖  ${cleanedLocation}`, L, Math.round(TEX_H * 0.9));
    }
    if (profile.email) {
      const emailW = ctx.measureText(profile.email).width;
      ctx.fillText(profile.email, TEX_W - L - emailW, Math.round(TEX_H * 0.9));
    }

    return new THREE.CanvasTexture(canvas);
  }

  // ── Back canvas texture ────────────────────────────────────────────────────

  private buildBackTexture(_profile: ParsedResume): THREE.CanvasTexture {
    const { ctx, canvas } = this.createCanvas();

    // Gradient background (mirrored variant)
    const bg = ctx.createLinearGradient(TEX_W, TEX_H, 0, 0);
    bg.addColorStop(0, '#0f172a');
    bg.addColorStop(1, '#1a2032');
    ctx.fillStyle = bg;
    this.fillRoundRect(ctx, 0, 0, TEX_W, TEX_H, 32);

    // Right accent stripe
    const stripe = ctx.createLinearGradient(0, TEX_H, 0, 0);
    stripe.addColorStop(0, '#22c55e');
    stripe.addColorStop(1, '#16a34a');
    ctx.fillStyle = stripe;
    this.fillRoundRect(ctx, TEX_W - 9, 0, 9, TEX_H, 4);

    // Cute centered "hire me"
    ctx.save();
    ctx.translate(TEX_W / 2, TEX_H / 2);
    ctx.rotate(-0.04);

    const shadowGradient = ctx.createLinearGradient(-260, -40, 260, 40);
    shadowGradient.addColorStop(0, '#22c55e40');
    shadowGradient.addColorStop(1, '#38bdf840');
    ctx.fillStyle = shadowGradient;
    this.fillRoundRect(ctx, -300, -115, 600, 230, 60);

    ctx.fillStyle = '#f8fafc';
    ctx.font = `bold ${Math.round(TEX_H * 0.2)}px Inter, "Helvetica Neue", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('hire me', 0, 0);

    ctx.fillStyle = '#4ade80';
    ctx.beginPath();
    ctx.arc(-250, -120, 5, 0, Math.PI * 2);
    ctx.arc(250, 120, 4, 0, Math.PI * 2);
    ctx.arc(220, -130, 3, 0, Math.PI * 2);
    ctx.arc(-210, 130, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    return new THREE.CanvasTexture(canvas);
  }

  private buildShimmerTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    const grad = ctx.createLinearGradient(0, 0, canvas.width, 0);
    grad.addColorStop(0, 'rgba(255,255,255,0)');
    grad.addColorStop(0.42, 'rgba(255,255,255,0)');
    grad.addColorStop(0.5, 'rgba(255,255,255,0.85)');
    grad.addColorStop(0.58, 'rgba(255,255,255,0)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.repeat.set(1.6, 1);
    tex.offset.set(-1, 0);
    tex.center.set(0.5, 0.5);
    tex.rotation = -Math.PI / 9;
    return tex;
  }

  // ── Star-field particles ───────────────────────────────────────────────────

  private buildStarfield(): THREE.Points {
    const COUNT = 180;
    const positions = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 22;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 14;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 8 - 4; // behind card
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometries.push(geom);

    const mat = new THREE.PointsMaterial({
      color: 0x7fffb0,
      size: 0.04,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.55,
    });
    this.materials.push(mat);
    return new THREE.Points(geom, mat);
  }

  // ── Canvas helpers ─────────────────────────────────────────────────────────

  private createCanvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
    const canvas = document.createElement('canvas');
    canvas.width = TEX_W;
    canvas.height = TEX_H;
    const ctx = canvas.getContext('2d')!;
    return { canvas, ctx };
  }

  private drawWrappedText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number,
    maxLines: number,
  ): void {
    const words = text.split(' ');
    const lines: string[] = [];
    let current = '';

    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (ctx.measureText(next).width <= maxWidth) {
        current = next;
        continue;
      }
      if (current) lines.push(current);
      current = word;
      if (lines.length === maxLines - 1) break;
    }

    if (current && lines.length < maxLines) {
      lines.push(current);
    }

    for (let i = 0; i < lines.length; i += 1) {
      let line = lines[i];
      if (i === maxLines - 1 && line !== text && ctx.measureText(line).width > maxWidth - 18) {
        while (ctx.measureText(`${line}…`).width > maxWidth && line.length > 1) {
          line = line.slice(0, -1);
        }
        line += '…';
      }
      ctx.fillText(line, x, y + i * lineHeight);
    }
  }

  private fillRoundRect(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number, r: number,
  ): void {
    this.buildRoundRectPath(ctx, x, y, w, h, r);
    ctx.fill();
  }

  private strokeRoundRect(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number, r: number,
  ): void {
    this.buildRoundRectPath(ctx, x, y, w, h, r);
    ctx.stroke();
  }

  private buildRoundRectPath(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number, r: number,
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  private isWebGLAvailable(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return !!(
        canvas.getContext('webgl2') ||
        canvas.getContext('webgl') ||
        canvas.getContext('experimental-webgl')
      );
    } catch {
      return false;
    }
  }
}
