# Power Contract

> **Last synced:** 2026-04-09 | **Version:** 0.0.12 | **PHP Namespace:** `J7\PowerContract`

## 1. What This Plugin Does

WordPress 線上簽合約 & 審批外掛。管理者透過 WordPress 編輯器建立合約模板（含 shortcode 欄位），前台用戶填寫欄位、簽名後送出合約，管理者審核（核准/拒絕）。可選整合 WooCommerce 結帳流程。

**Core capabilities:**
- **合約模板**: Block Editor 建立模板，嵌入 shortcode 欄位（輸入框、簽名、公司章、日期、IP）
- **前台簽署**: 用戶填寫、簽名、html2canvas 截圖一次送出
- **審批流程**: pending → approved / rejected，支援批量操作
- **Email 通知**: 合約建立後自動通知管理者審核
- **WooCommerce 整合**: 結帳前/後重導至合約頁面，自動填入訂單資料

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| PHP | 8.0+, WordPress 5.7+, `declare(strict_types=1)` |
| Frontend | jQuery + TypeScript, Vite 5, TailwindCSS 3, DaisyUI |
| Signing | signature_pad 5, html2canvas-pro 1.5 |
| Admin UI | Shoelace Web Components (CDN v2.18) |
| Build | Vite + `@kucrut/vite-for-wp` |
| Testing | Playwright E2E, PHPStan, PHPCS |
| WP Env | wp-env (WP 6.8, PHP 8.2, port 8892) |

---

## 3. Architecture

```
J7\PowerContract\
├── Plugin                          # Singleton + PluginTrait 入口
├── Bootstrap                       # 初始化所有模組
├── Admin\
│   ├── Settings                    # 設定頁管理
│   ├── SettingsDTO                 # 設定值 DTO
│   └── setting_tabs.php            # 設定分頁（General / WooCommerce / Email）
├── Resources\
│   ├── Contract\
│   │   ├── Init                    # CPT 'contract' 註冊 & metabox
│   │   ├── Ajax                    # AJAX 建立合約
│   │   ├── LifeCycle               # 狀態轉換 hooks
│   │   └── Utils                   # 合約工具函式
│   └── ContractTemplate\
│       └── Init                    # CPT 'contract_template' 註冊
├── Email\Email                     # 合約建立通知信
├── Shortcodes\Shortcodes           # 5 個 shortcode 註冊 & 渲染
├── Utils\Base                      # i18n & 基礎工具
└── Woocommerce\
    ├── Admin\Orders                # 訂單列表合約欄位（HPOS 相容）
    └── FrontEnd\
        ├── Checkout                # 結帳重導邏輯
        └── MyAccount              # 我的帳號合約顯示
```

---

## 4. Custom Post Types

### `contract_template` (合約模板)
- **Public:** true, show_in_rest: true (Block Editor)
- **Supports:** title, editor
- **Menu:** dashicons-media-document, position 6
- **Post Meta:** `seal_url` (公司章圖片)

### `contract` (合約)
- **Public:** false, show_ui: true
- **Supports:** title only
- **Submenu:** 掛在 contract_template 下
- **Custom Statuses:** `pending`（審核中）| `approved`（已審核）| `rejected`（已拒絕）
- **Post Meta:**
  - `contract_template_id`, `screenshot_url`, `signature`
  - `user_name`, `user_address`, `user_identity`, `user_phone`, `contract_amount`
  - `client_ip`, `_order_id`, `_redirect`

---

## 5. Shortcodes

| Shortcode | 用途 | 主要參數 |
|-----------|------|---------|
| `[pct_input]` | 文字輸入欄位 | name, width, placeholder, type, value |
| `[pct_seal]` | 公司章圖片 | style, class |
| `[pct_signature]` | 簽名畫布 + Modal | style, class |
| `[pct_date]` | 日期顯示 | format, base (tw/ad) |
| `[pct_ip]` | 客戶端 IP | — |

---

## 6. AJAX & REST Endpoints

**AJAX:**
- `wp_ajax[_nopriv]_create_contract` — 建立合約（需 nonce: `power_contract`）

**Admin POST:**
- `admin_post_approve_contract` — 核准合約
- `admin_post_reject_contract` — 拒絕合約

**REST (WP built-in):**
- `/wp-json/wp/v2/contract_templates` — 模板 CRUD

---

## 7. Hooks

**Actions:**
- `power_contract_contract_created` — 合約建立後觸發
- `power_contract_contract_pending` — 狀態轉為 pending
- `power_contract_contract_approved` — 狀態轉為 approved
- `power_contract_contract_rejected` — 狀態轉為 rejected

**Filters:**
- `power_contract_input_args` — 動態修改 pct_input 參數（自動填入訂單資料）
- `power_contract_seal_args` — 公司章參數
- `power_contract_signature_args` — 簽名畫布參數
- `power_contract_chosen_contract_template` — 覆寫模板選擇
- `power_contract_redirect_before_checkout_condition` — 結帳前重導條件
- `power_contract_redirect_before_thankyou_condition` — 感謝頁前重導條件

---

## 8. Settings

**Option Key:** `power_contract_settings`

| Property | Type | Description |
|----------|------|-------------|
| `ajax_signed_title` | string | 簽署成功 Modal 標題 |
| `ajax_signed_description` | string | Modal 說明文字 |
| `ajax_signed_btn_text` | string | Modal 按鈕文字 |
| `ajax_signed_btn_link` | string | Modal 按鈕連結 |
| `display_order_info` | bool | 自動填入訂單資料 |
| `display_contract_before_checkout` | bool | 結帳前顯示合約 |
| `display_contract_after_checkout` | bool | 結帳後顯示合約 |
| `emails` | array | 審核通知收件人 |
| `chosen_contract_template` | string | 預設模板 ID |

**Settings Tabs:** General / WooCommerce / Email

---

## 9. WooCommerce Integration

- **結帳前重導**: `display_contract_before_checkout` 啟用時攔截結帳流程
- **感謝頁前重導**: `display_contract_after_checkout` 啟用時修改 thank you URL
- **訂單關聯**: 合約 `_order_id` meta 連結到 WC 訂單，訂單 `is_signed` meta
- **Admin 訂單欄位**: 訂單列表顯示合約 ID（支援 legacy CPT + HPOS）
- **我的帳號**: 顯示合約截圖 & 狀態
- **自動填入**: 透過 `power_contract_input_args` filter 帶入 user_name / address / phone / amount

---

## 10. Commands

```bash
# Development
pnpm dev                    # Vite dev server
pnpm build                  # Production build → js/dist/

# Code Quality
pnpm lint                   # ESLint + PHPCBF
pnpm lint:fix               # Auto-fix
vendor/bin/phpstan analyse  # PHPStan

# Release
pnpm release                # Patch release
pnpm release:minor          # Minor release
pnpm zip                    # Create zip
pnpm sync:version           # Sync version across files
pnpm i18n                   # Generate POT file

# Setup
pnpm bootstrap              # composer install
```

---

## 11. Dependencies

**PHP:** `j7-dev/wp-plugin-trait` v0.2.10
**JS (key):** signature_pad, html2canvas-pro, tailwindcss, daisyui, vite

---

## 12. Frontend Signing Flow

1. 用戶在合約模板頁面點擊「繼續」→ 欄位切換為可編輯
2. 填寫所有 `[pct_input]` 欄位
3. 點擊簽名區 → Modal 開啟 SignaturePad
4. 簽名完成 → 驗證所有欄位已填寫
5. html2canvas 截圖整個合約 DOM
6. AJAX POST 送出：欄位值 + signature base64 + screenshot base64
7. 後端建立 contract CPT，上傳截圖到 media library
8. 觸發 `power_contract_contract_created` → Email 通知
9. 前端顯示成功 Modal（文字來自 Settings）
