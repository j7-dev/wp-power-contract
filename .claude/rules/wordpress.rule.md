---
globs: "**/*.php"
---

# WordPress / PHP 開發規則

## 語言與風格
- PHP 8.0+，每個檔案開頭 `declare(strict_types=1)`
- 遵循 WPCS 編碼標準（`phpcs.xml`）
- Namespace: `J7\PowerContract`，PSR-4 autoloading（`inc/classes/`）
- 每個類別檔案開頭加 `class_exists()` guard

## Singleton Pattern
- 所有服務類別使用 `\J7\WpUtils\Traits\SingletonTrait`
- 存取: `ClassName::instance()`，禁止 `new ClassName()`
- 主 Plugin 類別額外使用 `PluginTrait`

## CPT 架構
- `contract_template`: public CPT，支援 Block Editor（show_in_rest: true）
- `contract`: private CPT，自訂狀態（pending / approved / rejected）
- 狀態轉換透過 `transition_post_status` hook 監聽

## AJAX 處理
- 使用 `wp_ajax_` / `wp_ajax_nopriv_` hooks
- 必須驗證 nonce: `power_contract`
- 所有輸入 `sanitize_text_field()`（base64 資料除外）
- 錯誤回傳 `wp_send_json_error()`，成功回傳 `wp_send_json_success()`

## Settings 系統
- Option key: `power_contract_settings`（wp_options 單一記錄）
- 使用 `SettingsDTO` 封裝，型別安全存取
- Admin UI 使用 Shoelace Web Components（CDN）
- 分頁: General / WooCommerce / Email

## Lifecycle Hooks
- `power_contract_contract_created` — 合約建立（$contract_id, $args）
- `power_contract_contract_{status}` — 狀態轉換（$new_status, $old_status, $post）
- 自訂 filter: `power_contract_input_args`, `power_contract_*_args`

## WooCommerce 整合
- 條件載入: 僅在 WooCommerce 啟用時載入 `Woocommerce\` 模組
- HPOS 雙 hook 支援: `manage_edit-shop_order_columns` + `woocommerce_shop_order_list_table_columns`
- 訂單 meta 使用 `update_post_meta()` / HPOS `$order->update_meta_data()`

## Template 系統
- Template 路徑: `inc/templates/`
- Settings 頁面: `inc/templates/pages/settings/`
- 前台模板: `inc/templates/single-contract_template.php`

## 安全性
- Admin POST actions 必須驗證 nonce 和 capability
- 合約截圖上傳至 WordPress Media Library（`wp_upload_bits`）
- 敏感資料（signature base64）不做 sanitize，但做長度驗證
