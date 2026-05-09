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
import { Resume3dCardBuilder } from './resume-3d-card.builder';
import { ParsedResume } from '../resume-studio/resume-parser';

@Component({
  standalone: true,
  imports: [RouterLink],
  templateUrl: './resume-3d.page.html',
  styleUrl: './resume-3d.page.css',
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
  private isFlipping = false;
  private pointer = { x: 0, y: 0 };
  private onResize?: () => void;
  private onPointerMove?: (e: PointerEvent) => void;
  private onPointerLeave?: () => void;

  // Disposables kept for cleanup
  private readonly textures: THREE.CanvasTexture[] = [];
  private readonly materials: THREE.Material[] = [];
  private readonly geometries: THREE.BufferGeometry[] = [];
  private readonly cardBuilder: Resume3dCardBuilder;

  constructor() {
    this.cardBuilder = new Resume3dCardBuilder({
      textures: this.textures,
      materials: this.materials,
      geometries: this.geometries,
    });
  }

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
    this.cardBuilder.destroy();
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
    scene.add(this.cardBuilder.buildStarfield());

    // Card
    this.cardGroup = this.cardBuilder.buildCard(profile);
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
