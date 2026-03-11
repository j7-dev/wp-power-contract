# power-contract — 專案開發指引

## 專案概述

Power Contract 是一個 WordPress Plugin，提供線上合約簽署與後台審批工作流程。使用者可在前台填寫合約欄位（簽名、印章、日期）並送出，後台管理員可審批或拒絕合約，整合 WooCommerce 訂單流程觸發簽約。

前後端透過 WordPress AJAX 與短碼機制溝通，前端不直接連線資料庫。

## 技術棧總覽

- **PHP 後端**：WordPress Plugin（PHP 8.0+）、WooCommerce 整合、自訂 CPT 與狀態、AJAX 簽約
- **前端**：Vite + TypeScript + Tailwind CSS + DaisyUI（非 SPA 框架）
- **簽名功能**：`signature_pad ^5.0.4`（手寫簽名）+ `html2canvas-pro ^1.5.8`（截圖存檔）
- **代碼品質**：PHPStan Level 6、PHPCS（WordPress-Core）、ESLint + Prettier

## 溝通與註解風格

- 所有程式碼註解使用繁體中文，技術名詞與程式碼維持英文
- 文字域（Text Domain）：`power_contract`
- 所有 PHP 類別宣告為 `final`，使用 `SingletonTrait` 確保單例

## Git 工作流程

- Commit message 格式：Conventional Commits（feat/fix/chore/docs/refactor）
- 說明文字使用繁體中文
- 發佈流程：`pnpm release`（release-it 自動版本管理）

## 通用架構決策

- 自訂文章類型：`contract_template`（合約模板）、`contract`（合約記錄）
- 合約自訂狀態：`pending`（審核中）、`approved`（已核准）、`rejected`（已拒絕）
- 合約生命週期透過 WordPress Action Hooks 對外暴露（`power_contract_contract_*`）
- 所有用戶輸入使用 WordPress sanitize 函數清理，輸出使用 escape 函數跳脫

## 全域建置指令

```bash
composer install          # 安裝 PHP 依賴
pnpm install              # 安裝 Node 依賴
pnpm dev                  # Vite 開發伺服器
pnpm build                # 建置前端資源到 js/dist/
vendor/bin/phpcs          # PHP 代碼風格檢查
vendor/bin/phpstan analyse # PHPStan 靜態分析
```
