import { gsap } from 'gsap';
import * as THREE from 'three';

import { ParsedResume } from '../resume-studio/resume-parser';

const TEX_W = 1024;
const TEX_H = Math.round(TEX_W / 1.586);

export class Resume3dTextureFactory {
  private shimmerTween?: gsap.core.Tween;

  destroy(): void {
    this.shimmerTween?.kill();
  }

  createFrontTexture(profile: ParsedResume): THREE.CanvasTexture {
    const { ctx, canvas } = this.createCanvas();

    const background = ctx.createLinearGradient(0, 0, TEX_W, TEX_H);
    background.addColorStop(0, '#0f172a');
    background.addColorStop(1, '#1a2744');
    ctx.fillStyle = background;
    this.fillRoundRect(ctx, 0, 0, TEX_W, TEX_H, 32);

    ctx.globalAlpha = 0.07;
    ctx.fillStyle = '#4ade80';
    for (let x = TEX_W - 190; x < TEX_W - 30; x += 22) {
      for (let y = 28; y < 190; y += 22) {
        ctx.beginPath();
        ctx.arc(x, y, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    const accent = ctx.createLinearGradient(0, 0, 0, TEX_H);
    accent.addColorStop(0, '#22c55e');
    accent.addColorStop(1, '#16a34a');
    ctx.fillStyle = accent;
    this.fillRoundRect(ctx, 0, 0, 9, TEX_H, 4);

    const leftPadding = 48;

    ctx.fillStyle = '#f8fafc';
    ctx.font = `bold ${Math.round(TEX_H * 0.145)}px Inter, "Helvetica Neue", sans-serif`;
    ctx.fillText(profile.name, leftPadding, Math.round(TEX_H * 0.265));

    ctx.fillStyle = '#4ade80';
    ctx.font = `500 ${Math.round(TEX_H * 0.08)}px Inter, "Helvetica Neue", sans-serif`;
    ctx.fillText(profile.title, leftPadding, Math.round(TEX_H * 0.385));

    ctx.strokeStyle = '#1e3a5f';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(leftPadding, Math.round(TEX_H * 0.46));
    ctx.lineTo(TEX_W - leftPadding, Math.round(TEX_H * 0.46));
    ctx.stroke();

    ctx.fillStyle = '#475569';
    ctx.font = `600 ${Math.round(TEX_H * 0.057)}px Inter, "Helvetica Neue", sans-serif`;
    ctx.fillText('SKILLS', leftPadding, Math.round(TEX_H * 0.565));

    ctx.font = `500 ${Math.round(TEX_H * 0.062)}px Inter, "Helvetica Neue", sans-serif`;
    const pillHeight = Math.round(TEX_H * 0.105);
    const pillPaddingX = 18;
    const rowGap = Math.round(TEX_H * 0.03);
    const maxRows = 2;
    const skillsToRender = [
      'Python',
      'Java',
      'TypeScript',
      'React',
      'Node.js',
      'SQL',
      'AWS',
      'Kubernetes',
      'System Design',
      'Distributed Systems',
      'Microservices',
      'CI/CD',
      'Data Engineering',
      'AI/ML',
    ];

    let x = leftPadding;
    let row = 0;
    const baseY = Math.round(TEX_H * 0.655);

    for (const skill of skillsToRender) {
      const textWidth = ctx.measureText(skill).width;
      const pillWidth = textWidth + pillPaddingX * 2;
      if (x + pillWidth > TEX_W - leftPadding) {
        row += 1;
        if (row >= maxRows) {
          break;
        }
        x = leftPadding;
      }

      const y = baseY + row * (pillHeight + rowGap);

      ctx.fillStyle = '#0d2a1a';
      this.fillRoundRect(ctx, x, y - pillHeight * 0.78, pillWidth, pillHeight, pillHeight / 2);
      ctx.strokeStyle = '#22c55e55';
      ctx.lineWidth = 1.2;
      this.strokeRoundRect(ctx, x, y - pillHeight * 0.78, pillWidth, pillHeight, pillHeight / 2);
      ctx.fillStyle = '#4ade80';
      ctx.fillText(skill, x + pillPaddingX, y - pillHeight * 0.78 + pillHeight * 0.67);

      x += pillWidth + 10;
    }

    ctx.fillStyle = '#334155';
    ctx.font = `${Math.round(TEX_H * 0.056)}px "Courier New", monospace`;
    const cleanedLocation = profile.location.replace(/location\s*[:\-]?\s*/i, '').trim();
    if (cleanedLocation) {
      ctx.fillText(`⌖  ${cleanedLocation}`, leftPadding, Math.round(TEX_H * 0.9));
    }
    if (profile.email) {
      const emailWidth = ctx.measureText(profile.email).width;
      ctx.fillText(profile.email, TEX_W - leftPadding - emailWidth, Math.round(TEX_H * 0.9));
    }

    return new THREE.CanvasTexture(canvas);
  }

  createBackTexture(profile: ParsedResume): THREE.CanvasTexture {
    const { ctx, canvas } = this.createCanvas();

    const background = ctx.createLinearGradient(TEX_W, TEX_H, 0, 0);
    background.addColorStop(0, '#0f172a');
    background.addColorStop(1, '#1a2032');
    ctx.fillStyle = background;
    this.fillRoundRect(ctx, 0, 0, TEX_W, TEX_H, 32);

    const accent = ctx.createLinearGradient(0, TEX_H, 0, 0);
    accent.addColorStop(0, '#22c55e');
    accent.addColorStop(1, '#16a34a');
    ctx.fillStyle = accent;
    this.fillRoundRect(ctx, TEX_W - 9, 0, 9, TEX_H, 4);

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.round(TEX_H * 0.24)}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('hire me', TEX_W / 2, TEX_H / 2);

    return new THREE.CanvasTexture(canvas);
  }

  createShimmerTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    gradient.addColorStop(0, 'rgba(255,255,255,0)');
    gradient.addColorStop(0.42, 'rgba(255,255,255,0)');
    gradient.addColorStop(0.5, 'rgba(255,255,255,0.85)');
    gradient.addColorStop(0.58, 'rgba(255,255,255,0)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.repeat.set(1.6, 1);
    texture.offset.set(-1, 0);
    texture.center.set(0.5, 0.5);
    texture.rotation = -Math.PI / 9;

    this.shimmerTween = gsap.to(texture.offset, {
      x: 1,
      duration: 3.4,
      repeat: -1,
      ease: 'none',
    });

    return texture;
  }

  private createCanvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
    const canvas = document.createElement('canvas');
    canvas.width = TEX_W;
    canvas.height = TEX_H;
    const ctx = canvas.getContext('2d')!;
    return { canvas, ctx };
  }

  private fillRoundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
  ): void {
    this.buildRoundRectPath(ctx, x, y, w, h, r);
    ctx.fill();
  }

  private strokeRoundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
  ): void {
    this.buildRoundRectPath(ctx, x, y, w, h, r);
    ctx.stroke();
  }

  private buildRoundRectPath(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
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
}