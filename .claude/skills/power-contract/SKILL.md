---
name: power-contract
description: Power Contract — WordPress 線上簽合約 & 審批外掛開發指引。CPT 合約模板/合約、Shortcode 欄位系統、SignaturePad 簽署流程、WooCommerce 結帳整合。使用 /power-contract 觸發。
---

# Power Contract SKILL

## Quick Facts
- **Plugin:** Power Contract v0.0.12
- **Namespace:** `J7\PowerContract`
- **PHP:** 8.0+ | **WP:** 5.7+
- **Frontend:** jQuery + TypeScript + Vite 5
- **Required Plugin:** Powerhouse (wp-powerhouse)

## Architecture Map

```
plugin.php → Plugin (Singleton + PluginTrait)
  └── Bootstrap
       ├── Admin\Settings (Shoelace UI, 3 tabs)
       ├── Resources\ContractTemplate\Init (CPT registration)
       ├── Resources\Contract\Init (CPT + metabox)
       ├── Resources\Contract\Ajax (AJAX create_contract)
       ├── Resources\Contract\LifeCycle (status transitions)
       ├── Email\Email (approval notifications)
       ├── Shortcodes\Shortcodes (5 shortcodes)
       └── Woocommerce\ (conditional, only when WC active)
            ├── Admin\Orders (order list column)
            └── FrontEnd\{Checkout, MyAccount}
```

## Two CPTs

### contract_template (Public)
- Block Editor compatible (show_in_rest: true)
- 管理者在編輯器中嵌入 shortcode 建立模板
- Post meta: `seal_url`（公司章）

### contract (Private)
- Custom statuses: pending → approved / rejected
- 用戶簽署後建立，關聯 template + 可選關聯 WC order
- Post meta: contract_template_id, screenshot_url, signature, user_*, client_ip, _order_id

## Shortcode System
合約模板的核心——在 Block Editor 中嵌入以下 shortcode：

| Shortcode | Render | 前台行為 |
|-----------|--------|---------|
| `[pct_input name="user_name"]` | `<input>` | 用戶填寫 |
| `[pct_seal]` | `<img>` | 顯示公司章 |
| `[pct_signature]` | `<canvas>` + Modal | 用戶簽名 |
| `[pct_date]` | `<span>` | 顯示日期（ROC/AD） |
| `[pct_ip]` | `<span>` | 顯示 IP |

## End-to-End Signing Flow
1. 用戶訪問 contract_template single page
2. 點「繼續」→ 欄位解鎖為可編輯
3. 填寫所有欄位 + 簽名
4. html2canvas 截圖 → AJAX POST create_contract
5. 後端：建立 contract CPT + 上傳截圖 + 觸發 hook
6. 前端：顯示成功 Modal（內容從 Settings 讀取）

## WooCommerce Integration (Optional)
- **Before checkout**: 攔截結帳，重導至合約模板
- **After checkout**: 修改 thank-you URL，先簽約再顯示感謝頁
- **Auto-fill**: `power_contract_input_args` filter 帶入訂單 user_name/address/phone/amount
- **Order link**: 合約 `_order_id` meta ↔ 訂單 `is_signed` meta

## Settings (wp_options: power_contract_settings)
三個分頁:
1. **General**: 簽署成功 Modal 文案
2. **WooCommerce**: 結帳流程選項、模板選擇
3. **Email**: 審核通知收件人

## Key Hooks
- `power_contract_contract_created` — 合約建立後
- `power_contract_contract_{pending|approved|rejected}` — 狀態轉換
- `power_contract_input_args` — 動態修改輸入欄位參數
- `power_contract_redirect_before_checkout_condition` — 結帳重導條件

## Development
```bash
pnpm dev          # Vite dev server
pnpm build        # Build → js/dist/
pnpm lint         # ESLint + PHPCBF
pnpm bootstrap    # composer install
```

## Dependencies
- PHP: `j7-dev/wp-plugin-trait` v0.2.10
- JS: signature_pad, html2canvas-pro, tailwindcss, daisyui
- Required WP Plugin: Powerhouse
