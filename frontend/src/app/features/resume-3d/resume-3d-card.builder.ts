import * as THREE from 'three';

import { ParsedResume } from '../resume-studio/resume-parser';
import { Resume3dTextureFactory } from './resume-3d-texture.factory';

export const CARD_W = 3.4;
export const CARD_H = CARD_W / 1.586;

export type Resume3dResources = {
  textures: THREE.CanvasTexture[];
  materials: THREE.Material[];
  geometries: THREE.BufferGeometry[];
};

export class Resume3dCardBuilder {
  private readonly textureFactory = new Resume3dTextureFactory();

  constructor(private readonly resources: Resume3dResources) {}

  destroy(): void {
    this.textureFactory.destroy();
  }

  buildCard(profile: ParsedResume): THREE.Group {
    const group = new THREE.Group();

    const frontGeometry = new THREE.PlaneGeometry(CARD_W, CARD_H);
    const backGeometry = new THREE.PlaneGeometry(CARD_W, CARD_H);
    this.resources.geometries.push(frontGeometry, backGeometry);

    const frontTexture = this.textureFactory.createFrontTexture(profile);
    const backTexture = this.textureFactory.createBackTexture(profile);
    this.resources.textures.push(frontTexture, backTexture);

    const frontMaterial = new THREE.MeshBasicMaterial({
      map: frontTexture,
      side: THREE.FrontSide,
    });
    const backMaterial = new THREE.MeshBasicMaterial({
      map: backTexture,
      side: THREE.FrontSide,
    });
    this.resources.materials.push(frontMaterial, backMaterial);

    const frontMesh = new THREE.Mesh(frontGeometry, frontMaterial);
    frontMesh.position.z = 0.01;
    frontMesh.renderOrder = 2;

    const backMesh = new THREE.Mesh(backGeometry, backMaterial);
    backMesh.rotation.y = Math.PI;
    backMesh.position.z = -0.01;
    backMesh.renderOrder = 2;

    const edgeGeometry = new THREE.BoxGeometry(CARD_W, CARD_H, 0.018);
    const edgeMaterial = new THREE.MeshBasicMaterial({ color: '#0f172a' });
    this.resources.geometries.push(edgeGeometry);
    this.resources.materials.push(edgeMaterial);
    const edge = new THREE.Mesh(edgeGeometry, edgeMaterial);
    edge.renderOrder = 1;

    const shimmerTexture = this.textureFactory.createShimmerTexture();
    this.resources.textures.push(shimmerTexture);
    const shimmerMaterial = new THREE.MeshBasicMaterial({
      map: shimmerTexture,
      transparent: true,
      side: THREE.FrontSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.26,
    });
    this.resources.materials.push(shimmerMaterial);

    const shimmerFront = new THREE.Mesh(new THREE.PlaneGeometry(CARD_W, CARD_H), shimmerMaterial);
    shimmerFront.position.z = 0.016;
    shimmerFront.renderOrder = 3;
    const shimmerBack = new THREE.Mesh(new THREE.PlaneGeometry(CARD_W, CARD_H), shimmerMaterial);
    shimmerBack.rotation.y = Math.PI;
    shimmerBack.position.z = -0.016;
    shimmerBack.renderOrder = 3;
    this.resources.geometries.push(
      shimmerFront.geometry as THREE.BufferGeometry,
      shimmerBack.geometry as THREE.BufferGeometry,
    );

    group.add(frontMesh, backMesh, edge, shimmerFront, shimmerBack);
    return group;
  }

  buildStarfield(): THREE.Points {
    const count = 180;
    const positions = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      positions[index * 3 + 0] = (Math.random() - 0.5) * 22;
      positions[index * 3 + 1] = (Math.random() - 0.5) * 14;
      positions[index * 3 + 2] = (Math.random() - 0.5) * 8 - 4;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.resources.geometries.push(geometry);

    const material = new THREE.PointsMaterial({
      color: 0x7fffb0,
      size: 0.04,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.55,
    });
    this.resources.materials.push(material);
    return new THREE.Points(geometry, material);
  }
}