import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { gsap } from 'gsap';
import * as THREE from 'three';

@Component({
  standalone: true,
  template: `
    <section class="mt-8 rounded-2xl border border-brand-200/70 bg-white/70 p-6 shadow-sm backdrop-blur-sm dark:border-brand-700/60 dark:bg-brand-900/35">
      <h2 class="mb-4 text-2xl font-semibold">3D Interactive Resume</h2>
      <div #canvasHost class="h-[60vh] w-full overflow-hidden rounded-xl"></div>
    </section>
  `
})
export class Resume3dPage implements AfterViewInit, OnDestroy {
  @ViewChild('canvasHost', { static: true }) canvasHost!: ElementRef<HTMLDivElement>;

  private renderer?: THREE.WebGLRenderer;
  private animationFrameId?: number;
  private cardGeometry?: THREE.BoxGeometry;
  private cardMaterial?: THREE.MeshStandardMaterial;
  private rotationTween?: gsap.core.Tween;
  private positionTween?: gsap.core.Tween;

  ngAfterViewInit(): void {
    const host = this.canvasHost.nativeElement;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#d7e6c6');

    const camera = new THREE.PerspectiveCamera(65, host.clientWidth / host.clientHeight, 0.1, 1000);
    camera.position.z = 6;

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(host.clientWidth, host.clientHeight);
    host.appendChild(this.renderer.domElement);

    const light = new THREE.DirectionalLight(0xffffff, 1.2);
    light.position.set(4, 4, 5);
    scene.add(light);

    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambient);

    this.cardGeometry = new THREE.BoxGeometry(1.8, 1.1, 0.1);
    this.cardMaterial = new THREE.MeshStandardMaterial({ color: '#6f9b3d' });
    const card = new THREE.Mesh(this.cardGeometry, this.cardMaterial);
    scene.add(card);

    this.rotationTween = gsap.to(card.rotation, { y: Math.PI * 2, duration: 8, repeat: -1, ease: 'none' });
    this.positionTween = gsap.to(card.position, { y: 0.35, duration: 2.2, repeat: -1, yoyo: true, ease: 'sine.inOut' });

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
    this.cardGeometry?.dispose();
    this.cardMaterial?.dispose();
    this.renderer?.dispose();
  }
}
