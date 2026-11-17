import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import type { CharacterDef } from './config';

const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);

export type LoadOptions = {
  anisotropy: number;
  onProgress?: (fraction: number) => void;
};

export async function loadCharacter(
  def: CharacterDef,
  options: LoadOptions,
): Promise<{ group: THREE.Group; box: THREE.Box3 }> {
  const gltf = await loader.loadAsync(def.file, (event) => {
    if (event.total > 0) options.onProgress?.(Math.min(event.loaded / event.total, 1));
  });

  const group = gltf.scene;
  const box = new THREE.Box3().setFromObject(group);
  const size = box.getSize(new THREE.Vector3());
  const scale = def.height / Math.max(size.y, 0.0001);
  group.scale.setScalar(scale);
  group.updateMatrixWorld(true);

  box.setFromObject(group);
  const center = box.getCenter(new THREE.Vector3());
  group.position.x -= center.x;
  group.position.z -= center.z;
  group.position.y -= box.min.y;
  group.updateMatrixWorld(true);
  box.setFromObject(group);

  group.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = false;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
      if (!(material instanceof THREE.MeshStandardMaterial)) continue;
      const maps = [
        material.map,
        material.normalMap,
        material.metalnessMap,
        material.roughnessMap,
        material.aoMap,
        material.emissiveMap,
      ];
      for (const map of maps) {
        if (map) map.anisotropy = options.anisotropy;
      }
    }
  });

  return { group, box };
}

export function countTriangles(root: THREE.Object3D): number {
  let triangles = 0;
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    const geometry = mesh.geometry;
    triangles += geometry.index ? geometry.index.count / 3 : geometry.attributes.position.count / 3;
  });
  return Math.round(triangles);
}

export function disposeCharacter(root: THREE.Object3D): void {
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry.dispose();
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
      const standard = material as THREE.MeshStandardMaterial;
      const maps = [
        standard.map,
        standard.normalMap,
        standard.metalnessMap,
        standard.roughnessMap,
        standard.aoMap,
        standard.emissiveMap,
      ];
      for (const map of maps) map?.dispose();
      material.dispose();
    }
  });
  root.removeFromParent();
  root.clear();
}
