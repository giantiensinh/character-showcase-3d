import { mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, dequantize, meshopt, prune, simplify, textureCompress, weld } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const SOURCES = [
  { input: 'anime_girl_3d_model_v1.glb', output: 'anime-girl.glb' },
  { input: 'cow_girl_3d_model.glb', output: 'cow-girl.glb' },
];
const MAX_BYTES = 15 * 1024 * 1024;
const MAX_TRIANGLES = 500_000;

function countTriangles(doc) {
  let tris = 0;
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const indices = prim.getIndices();
      if (indices) tris += indices.getCount() / 3;
      else tris += (prim.getAttribute('POSITION')?.getCount() ?? 0) / 3;
    }
  }
  return Math.round(tris);
}

await MeshoptSimplifier.ready;
await MeshoptEncoder.ready;

// EXT_meshopt_compression cần encoder/decoder đăng ký ở I/O thì mới ghi được file.
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder })
  .setAllowNetwork(false);

for (const { input, output } of SOURCES) {
  const sourcePath = path.join(ROOT, input);
  const targetPath = path.join(ROOT, 'public', 'models', output);
  await mkdir(path.dirname(targetPath), { recursive: true });

  const doc = await io.read(sourcePath);
  const beforeBytes = (await stat(sourcePath)).size;
  const beforeTris = countTriangles(doc);

  await doc.transform(
    dedup(),
    prune(),
    weld(),
    dequantize(),
    simplify({ simplifier: MeshoptSimplifier, ratio: 0.35, error: 0.001, lockBorder: true }),
    textureCompress({
      encoder: sharp,
      targetFormat: 'webp',
      resize: [2048, 2048],
      quality: 90,
      slots: /^(?!normalTexture).*$/,
    }),
    textureCompress({
      encoder: sharp,
      targetFormat: 'webp',
      resize: [2048, 2048],
      quality: 95,
      slots: /normalTexture/,
    }),
    meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
  );

  await io.write(targetPath, doc);

  const afterBytes = (await stat(targetPath)).size;
  const afterTris = countTriangles(doc);
  const textureTypes = doc.getRoot().listTextures().map((texture) => texture.getMimeType()).join(', ');

  console.log(`${input} -> public/models/${output}`);
  console.log(`  size: ${(beforeBytes / 1048576).toFixed(1)} MB -> ${(afterBytes / 1048576).toFixed(1)} MB`);
  console.log(`  triangles: ${beforeTris.toLocaleString('en-US')} -> ${afterTris.toLocaleString('en-US')}`);
  console.log(`  textures: ${textureTypes}`);

  if (afterBytes > MAX_BYTES) throw new Error(`${output} vượt 15 MB`);
  if (afterTris > MAX_TRIANGLES) throw new Error(`${output} vượt 500k tam giác`);
}

console.log('Asset optimization hoàn tất.');
