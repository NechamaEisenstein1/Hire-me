import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, signal } from '@angular/core';
import { gsap } from 'gsap';
import * as THREE from 'three';

@Component({
  standalone: true,
  template: `
    <div class="mx-auto max-w-5xl px-4 py-8 md:px-8">
    <section class="rounded-2xl border border-brand-200/70 bg-white/70 p-6 shadow-sm backdrop-blur-sm dark:border-brand-700/60 dark:bg-brand-900/35">
      <h2 class="mb-4 text-2xl font-semibold">3D Interactive Resume</h2>
      <p class="mb-4 text-sm opacity-80">Drag your mouse over the scene to tilt the card and verify the interaction is alive.</p>

      @if (statusMessage()) {
        <div class="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-600 dark:bg-amber-900/25 dark:text-amber-100">
          {{ statusMessage() }}
        </div>
      }

      <div #canvasHost class="mt-4 h-[60vh] w-full overflow-hidden rounded-xl border border-brand-200/70 bg-gradient-to-br from-brand-100 via-brand-50 to-emerald-50 dark:border-brand-700/60 dark:from-brand-900/60 dark:via-brand-900/20 dark:to-emerald-900/30"></div>
    </section>
    </div>
  `
})
export class Resume3dPage implements AfterViewInit, OnDestroy {
  @ViewChild('canvasHost', { static: true }) canvasHost!: ElementRef<HTMLDivElement>;

  readonly statusMessage = signal('');

  private renderer?: THREE.WebGLRenderer;
  private animationFrameId?: number;
  private cardGeometry?: THREE.BoxGeometry;
  private cardMaterial?: THREE.MeshStandardMaterial;
  private rotationTween?: gsap.core.Tween;
  private positionTween?: gsap.core.Tween;
  private handleResize?: () => void;
  private handlePointerMove?: (event: PointerEvent) => void;
  private sceneMesh?: THREE.Mesh;

  ngAfterViewInit(): void {
    const host = this.canvasHost.nativeElement;

    if (!this.isWebGLAvailable()) {
      this.statusMessage.set('WebGL is unavailable on this browser/device, so the 3D scene cannot be rendered here.');
      return;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#d7e6c6');

    const camera = new THREE.PerspectiveCamera(65, host.clientWidth / host.clientHeight, 0.1, 1000);
    camera.position.z = 6;

    try {
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
      this.renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 2));
      this.renderer.setSize(host.clientWidth, host.clientHeight);
      host.appendChild(this.renderer.domElement);
    } catch {
      this.statusMessage.set('Unable to initialize the 3D renderer in this environment.');
      return;
    }

    const light = new THREE.DirectionalLight(0xffffff, 1.2);
    light.position.set(4, 4, 5);
    scene.add(light);

    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambient);

    this.cardGeometry = new THREE.BoxGeometry(1.8, 1.1, 0.1);
    this.cardMaterial = new THREE.MeshStandardMaterial({ color: '#6f9b3d' });
    const card = new THREE.Mesh(this.cardGeometry, this.cardMaterial);
    this.sceneMesh = card;
    scene.add(card);

    this.rotationTween = gsap.to(card.rotation, { y: Math.PI * 2, duration: 8, repeat: -1, ease: 'none' });
    this.positionTween = gsap.to(card.position, { y: 0.35, duration: 2.2, repeat: -1, yoyo: true, ease: 'sine.inOut' });

    this.handlePointerMove = (event: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
      card.rotation.x = y * -0.25;
      card.rotation.z = x * 0.15;
    };
    host.addEventListener('pointermove', this.handlePointerMove);

    this.handleResize = () => {
      if (!this.renderer) {
        return;
      }

      const width = Math.max(host.clientWidth, 1);
      const height = Math.max(host.clientHeight, 1);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    };
    globalThis.addEventListener('resize', this.handleResize);

    const render = () => {
      this.renderer?.render(scene, camera);
      this.animationFrameId = requestAnimationFrame(render);
    };

    render();
  }

  ngOnDestroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.rotationTween?.kill();
    this.positionTween?.kill();
    if (this.handleResize) {
      globalThis.removeEventListener('resize', this.handleResize);
    }
    if (this.handlePointerMove) {
      this.canvasHost.nativeElement.removeEventListener('pointermove', this.handlePointerMove);
    }
    // Dispose geometry and material once via their direct references.
    this.cardGeometry?.dispose();
    this.cardMaterial?.dispose();
    this.renderer?.dispose();
  }

  private isWebGLAvailable(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return Boolean(
        canvas.getContext('webgl') ||
        canvas.getContext('experimental-webgl')
      );
    } catch {
      return false;
    }
  }
}
