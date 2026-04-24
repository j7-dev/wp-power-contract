---
globs: "js/src/**/*.{ts,tsx,scss,css}"
---

# Frontend 開發規則

## 技術棧
- jQuery + TypeScript（非 React SPA）
- Build: Vite 5 + `@kucrut/vite-for-wp`
- 入口: `js/src/main.ts` → `js/dist/index.js`
- CSS: TailwindCSS 3 + DaisyUI + SCSS

## 簽署流程架構
1. 頁面載入: 所有 `[pct_input]` 欄位預設 readonly
2. 點擊「繼續」: 切換 `.can_edit` / `.cant_edit` class，欄位變可編輯
3. 點擊簽名區: 開啟 DaisyUI Modal，初始化 SignaturePad
4. 簽名完成: 驗證所有必填欄位 + signature 非空
5. html2canvas 截圖合約 DOM → base64 PNG
6. jQuery $.post AJAX 送出所有資料

## CSS Class 命名
- 外掛前綴: `pct__` 或 `pc-`
- 編輯狀態: `.can_edit` / `.cant_edit`
- SignaturePad 容器: `#pct__signaturePad`

## 全域變數
- `window.signature_pad_custom_data` — 由 `wp_localize_script` 注入
  - `ajax_url`, `nonce`, `contract_template_id`
  - `redirect_to`, `order_id`

## 重要注意事項
- 不使用 React（雖然 package.json 有 React 依賴，但主 entry 是 jQuery）
- Admin 端使用 Shoelace Web Components（CDN 載入，非 npm）
- DaisyUI Modal 用於簽名彈窗
- html2canvas-pro 取代 html2canvas（支援更好的 CSS 渲染）
