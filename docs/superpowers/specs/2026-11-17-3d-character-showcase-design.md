# 3D Character Showcase — Design Spec

Ngày: 2026-11-17
Trạng thái: chờ user duyệt
Hướng đã chốt: A — Three.js thuần + Vite/TypeScript

## 1. Mục tiêu

Trang web trưng bày 2 nhân vật 3D tĩnh (`anime_girl_3d_model_v1.glb`, `cow_girl_3d_model.glb`) với chất lượng hình ảnh "dark cinematic studio", tương tác xoay/zoom mượt trên cả desktop lẫn điện thoại, deploy công khai trên Vercel.

Tiêu chí thành công:

- Mở link trên điện thoại thật, model hiện đầy đủ, xoay/zoom bằng cảm ứng, không giật, không tràn bộ nhớ.
- Desktop 1440×900: khung hình cân, ánh sáng có chiều sâu, UI tối giản không "AI slop".
- Chuyển đổi 2 nhân vật mượt, có trạng thái loading rõ ràng.
- Asset gốc không bị sửa; pipeline tối ưu chạy lại được.

## 2. Ngoài phạm vi (YAGNI)

- AR / xem trong phòng (đã loại ở bước chọn hướng).
- Animation, rig, điều khiển biểu cảm (model không có skeleton/animation).
- Upload model, quản trị, đa ngôn ngữ, tài khoản.
- Post-processing nặng (bloom/SSAO composer) — hạ tầng điện thoại không cần thiết.
- Âm thanh.

## 3. Kiến trúc & stack

- Vite + TypeScript (strict), three.js (bản tương thích exporter r180, GLTFLoader + OrbitControls + RoomEnvironment).
- Không React, không state library. UI overlay là DOM/CSS thuần.
- Module:

| File | Trách nhiệm |
|---|---|
| `src/main.ts` | khởi tạo app, vòng đời, nối scene ↔ UI |
| `src/scene.ts` | renderer, camera, đèn, bệ, environment, resize |
| `src/character.ts` | tải GLB, chuẩn hoá scale/vị trí, dispose, fit camera |
| `src/ui.ts` | overlay: chuyển nhân vật, nút điều khiển, loading, hint |
| `src/config.ts` | hằng số màu/ánh sáng + config riêng từng nhân vật |
| `scripts/optimize.mjs` | pipeline gltf-transform (một lần, tái chạy được) |

- Dữ liệu nhân vật khai báo tập trung:

```ts
type CharacterDef = {
  id: string; name: string; file: string; index: string;
  exposure: number; envIntensity: number; cameraPadding: number;
};
```

## 4. Pipeline tối ưu asset (bắt buộc)

Hiện trạng mỗi file: ~945k–977k tam giác, 3 texture 4096² (baseColor, metallicRoughness, normal), 31–33 MB. VRAM ước tính >200 MB/model nếu giữ nguyên — quá tải trên điện thoại tầm trung.

Pipeline `scripts/optimize.mjs` (dùng `@gltf-transform/core|functions|extensions`, `meshoptimizer`, `sharp`):

1. `dedup` + `prune` + `weld`.
2. `simplify` (meshoptimizer, ratio ~0.35, error ~0.001, lockBorder) → mục tiêu ~330–380k tam giác.
3. `textureCompress`: resize cạnh dài về 2048, WebP quality ~90 (normal map quality cao hơn).
4. `compress` Meshopt (EXT_meshopt_compression).
5. Ghi ra `public/models/`, in báo cáo kích thước/tam giác trước–sau.

Ràng buộc:

- Không ghi đè file gốc trong thư mục gốc.
- Nếu simplify gây lỗi thị giác ở silhouette/mặt, hạ ratio xuống 0.5 hoặc giảm error; kiểm tra bằng screenshot trước khi chốt.
- Mục tiêu dung lượng: mỗi GLB ≤ 15 MB (kỳ vọng 8–12 MB).
- `GLTFLoader.setMeshoptDecoder(...)` bắt buộc trong runtime.
- Material sanity: nếu model render tối bất thường do `metallicFactor: 1` + texture MR của Tripo, fallback bỏ `metallicRoughnessTexture`, đặt `roughness ≈ 0.85`, `metalness = 0` và ghi chú trong code/config.

## 5. Sân khấu & ánh sáng

Palette (UI + scene):

- Nền: `#0A0B0D` → vignette về `#050506` ở rìa (CSS gradient + grain SVG rất nhẹ).
- Ink: `#EDE9E2`; phụ: `#8C8A85`; hairline: `rgba(237,233,226,0.14)`.
- Accent duy nhất: amber `#D9A05B` (chỉ cho trạng thái active, vòng bệ, focus ring).

Scene:

- Renderer: `alpha: true` (nền do CSS), ACES Filmic tone mapping, exposure mặc định 1.0–1.2 (chỉnh theo từng model), `outputColorSpace = SRGB`; antialias bật trên desktop, tắt trên mobile (DPR 2 bù lại, tiết kiệm GPU).
- Environment: `RoomEnvironment` qua PMREM, `environmentIntensity ≈ 0.35` để giữ tương phản cinematic.
- Đèn: key SpotLight ấm `#FFF1E0` (trên phải trước), fill DirectionalLight lạnh `#9FB6D6` (trái, cường độ thấp), rim SpotLight trắng phía sau để tách silhouette khỏi nền.
- Bệ: đĩa tròn nhám `#141518` (roughness 0.9, metalness 0) cao ~0.06, đường kính ~2.4× bán kính bbox; vòng accent mảnh trên mép, phát sáng rất nhẹ.
- Bóng: blob shadow mềm dưới chân + shadow thật từ key light (PCFSoft; 2048 desktop / 1024 mobile) đổ lên mặt bệ qua `ShadowMaterial`.
- Model được chuẩn hoá: height 1.75 đơn vị, tâm X/Z về 0, đáy đặt trên mặt bệ.
- Không fog, không composer. Grain/vignette làm bằng CSS để rẻ GPU.

## 6. Camera & tương tác

- `PerspectiveCamera` fov 35. Fit theo bbox cả chiều dọc lẫn ngang (tính cả aspect), padding 1.6 desktop / 1.9 mobile.
- Góc mặc định: hơi cao hơn tầm mắt, nhìn xuống nhẹ (polar ~78–80°), target ở ~55% chiều cao model.
- `OrbitControls`: damping 0.06, `enablePan = false`, min/max distance theo bbox (0.45×–2.2× khoảng cách fit), polar kẹp sao cho không xuống dưới sàn và không lộ đỉnh đầu từ trên xuống.
- Auto-rotate chậm (turntable), mặc định bật trên desktop, tắt trên mobile (tiết kiệm pin); nút toggle.
- Cảm ứng: 1 ngón xoay, 2 ngón pinch zoom; `touch-action: none` trên canvas; chặn scroll/zoom trang.
- Nút Reset trả camera + auto-rotate về trạng thái mặc định.
- Fullscreen cho wrapper (hỗ trợ cả `webkitRequestFullscreen`).
- `prefers-reduced-motion`: tắt auto-rotate và fade.

## 7. UI/UX

Ngôn ngữ microcopy: tiếng Anh editorial (SHOWCASE / DRAG TO ROTATE / SCROLL TO ZOOM / PINCH); tên nhân vật mặc định "Anime Girl", "Cow Girl" (đổi được trong `config.ts`).

- Font: display/body "Be Vietnam Pro" self-host (subset vietnamese + latin), số/nhãn mono dùng "JetBrains Mono"; fallback system-ui.
- Top-left: wordmark nhỏ in hoa, letter-spacing rộng, hairline dưới.
- Top-right: 3 nút icon SVG nét mảnh (auto-rotate, reset, fullscreen) — label text trên desktop, icon-only + `aria-label` trên mobile.
- Bottom-left: index "01 / 02" mono, tên nhân vật cỡ lớn (28–40px, line-height ~1), dòng phụ nhỏ "STATIC CHARACTER · 2026".
- Bottom-right (desktop) / bottom bar (mobile): switcher 2 nhân vật, phân cách hairline, active có tick + màu ink, không dùng card bo tròn.
- Hint "DRAG TO ROTATE …" ở đáy giữa, mờ dần sau lần tương tác đầu.
- Loading: overlay tối với % mono + đường tiến trình 1px accent; khi đổi nhân vật dùng veil tối 250ms thay vì fade object.
- Không: gradient tím, glassmorphism, card bo góc, emoji icon.
- Safe areas: dùng `env(safe-area-inset-*)`; layout `100dvh`.
- A11y: canvas `role="img"` + `aria-label` mô tả nhân vật và thao tác; focus-visible ring accent; text phụ đạt ≥4.5:1.

## 8. Hiệu năng & điện thoại

- DPR = `min(devicePixelRatio, 2)`; shadow map 1024 trên mobile.
- Chỉ giữ 1 model active: model cũ được dispose toàn bộ geometry/texture/material trước khi gắn model mới.
- Prefetch GLB còn lại bằng `requestIdleCallback` trên desktop; bỏ qua khi `navigator.connection.saveData`.
- Tạm dừng render loop khi tab ẩn (`visibilitychange`), resume khi hiện.
- `powerPreference: 'high-performance'`, `anisotropy = min(4, max)`.
- Mục tiêu: desktop 60fps ở 1440×900; mobile ≥30fps ở 390×844 (đo bằng harness, không hứa con số trên thiết bị lạ).

## 9. Xử lý lỗi

- Không có WebGL2: hiện fallback tĩnh trong DOM (tiêu đề + hướng dẫn + poster), không crash.
- Load GLB lỗi: toast lỗi + nút "Retry"; giữ UI điều khiển vô hiệu hoá.
- `webglcontextlost`: chặn default, hiện overlay "Đang khôi phục…", khôi phục khi context restored; nếu fail thì yêu cầu reload.
- Fetch model thiếu (404): log rõ tên file, không treo loading.

## 10. Kiểm thử & nghiệm thu

Tự động (Playwright headless Chromium, harness tạm sẵn có):

1. `tsc --noEmit` + `vite build` sạch.
2. Screenshot 1440×900 và 390×844 (deviceScaleFactor 2, touch) sau khi model load xong; kiểm tra canvas không trống bằng sampling pixel.
3. Click switcher → screenshot nhân vật 2; toggle auto-rotate, reset (assert trạng thái); nút fullscreen tồn tại và gọi API không lỗi (headless không hỗ trợ fullscreen thật).
4. Thu thập console errors (phải rỗng), thời gian load, `renderer.info` (triangles, textures).
5. Kiểm tra reduced-motion (emulate) → auto-rotate tắt.

Nghiệm thu thủ công:

- User xem bộ screenshot desktop + mobile tại checkpoint trước khi deploy (user đánh giá bằng hình, không bằng mô tả).
- Sau deploy, user mở link trên điện thoại thật xác nhận cảm ứng.

Tiêu chí chặn deploy: build sạch, console không lỗi, canvas render đúng cả 2 nhân vật, screenshot đã được user duyệt.

## 11. Deploy

- Vercel CLI qua `npm exec --yes --package=vercel@latest -- vercel ...` (shim global đang hỏng).
- Nếu chưa đăng nhập: chạy device-flow login, user tự authorize trong trình duyệt.
- Static build Vite (`dist`), `vercel.json`: cache `immutable` cho `/models/*` và `/assets/*` (hashed).
- Project name đề xuất: `character-showcase`; trả link `*.vercel.app`.

## 12. Git & quy ước

- Thư mục chưa phải git repo. Kế hoạch sẽ có bước `git init` (được nêu rõ để user duyệt); không tạo remote/push nếu user không yêu cầu.
- Commit tiếng Việt theo conventional commits, một commit mỗi task (sau khi task được review).
- `.gitignore`: `node_modules`, `dist`, `.vercel`, file tạm.

## 13. Rủi ro & giảm thiểu

| Rủi ro | Giảm thiểu |
|---|---|
| Simplify làm méo mặt/tóc | So sánh screenshot trước/sau; nâng ratio/error nếu cần |
| Texture MR của Tripo làm model tối/sai chất liệu | Material sanity fallback (mục 4) |
| 10–15 MB GLB tải chậm 4G | Nén Meshopt + WebP; loading progress; HTTP cache immutable |
| Safari iOS giật do DPR/VRAM | DPR clamp 2, shadow 1024, dispose model cũ |
| OrbitControls lộ dưới sàn / lộ đỉnh | Kẹp polar, giới hạn distance |
| Vercel CLI shim hỏng | Dùng `npm exec --package=vercel@latest` |

## 14. Điểm mở

- Tên hiển thị: mặc định "Anime Girl" / "Cow Girl" — user có thể đổi bất kỳ lúc nào trong `src/config.ts`.
- Microcopy tiếng Anh; nếu user muốn tiếng Việt, đổi trong `ui.ts` (không ảnh hưởng kiến trúc).
