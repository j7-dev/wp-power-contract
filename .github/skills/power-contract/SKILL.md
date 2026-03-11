---
name: power-contract
description: "Power Contract — WordPress 線上合約簽署與審批外掛開發指引。包含架構概覽、CPT 設計、短碼系統、WooCommerce 整合與代碼規範。使用 /power-contract 觸發。"
origin: project-analyze
---

# power-contract — 開發指引

> WordPress Plugin，提供線上合約簽署（signature_pad.js + html2canvas-pro）與後台審批工作流程，整合 WooCommerce 訂單與郵件通知。

## When to Activate

當使用者在此專案中：
- 修改 `inc/classes/**/*.php`
- 修改 `inc/templates/**/*.php`
- 新增合約相關功能（CPT、AJAX、短碼、郵件）
- 詢問合約狀態流程、WooCommerce 整合、短碼系統相關問題

## 架構概覽

**技術棧：**
- **語言**: PHP 8.0+（`declare(strict_types=1)`）
- **框架**: WordPress 5.7+、WooCommerce（可選整合）
- **關鍵依賴**: `j7-dev/wp-plugin-trait 0.2.10`（PluginTrait、SingletonTrait）
- **前端**: Vite + TypeScript + Tailwind CSS + DaisyUI（非 SPA）
- **簽名**: `signature_pad ^5.0.4`、`html2canvas-pro ^1.5.8`
- **代碼風格**: PHPCS（WordPress-Core）、PHPStan Level 6

## 目錄結構

```
power-contract/
├── plugin.php                               # 主入口，Plugin 類別（PluginTrait + SingletonTrait）
├── inc/
│   ├── classes/
│   │   ├── Bootstrap.php                    # 初始化所有子模組（單例串接）
│   │   ├── Admin/
│   │   │   ├── Settings.php                 # 後台設定頁面（MENU_SLUG: contract_template_settings）
│   │   │   └── SettingsDTO.php              # 設定 DTO（SETTINGS_KEY: power_contract_settings）
│   │   ├── Email/
│   │   │   └── Email.php                    # 簽約後郵件通知
│   │   ├── Resources/
│   │   │   ├── Contract/
│   │   │   │   ├── Ajax.php                 # AJAX 簽約邏輯（前台送出）
│   │   │   │   ├── Init.php                 # CPT 'contract' 註冊（含自訂狀態、metabox、bulk actions）
│   │   │   │   ├── LifeCycle.php            # 合約生命週期 hooks
│   │   │   │   └── Utils.php               # 合約工具函數
│   │   │   └── ContractTemplate/
│   │   │       └── Init.php                 # CPT 'contract_template' 註冊
│   │   ├── Shortcodes/
│   │   │   └── Shortcodes.php              # 短碼：pct_input/pct_seal/pct_signature/pct_date/pct_ip
│   │   ├── Utils/
│   │   │   └── Base.php                    # 基礎常數定義
│   │   └── Woocommerce/
│   │       ├── Admin/Orders.php            # 訂單列表顯示合約欄位（HPOS 相容）
│   │       └── FrontEnd/
│   │           ├── Checkout.php            # 結帳流程重導向至合約頁
│   │           └── MyAccount.php           # 會員帳戶整合
│   ├── assets/js/admin.js                  # 後台管理 JavaScript
│   └── templates/
│       ├── pages/settings/                 # 設定頁面範本（general/email/woocommerce）
│       └── single-contract_template.php   # 合約模板前台渲染頁
├── js/src/
│   └── main.ts                             # Vite 前端入口（Tailwind + DaisyUI）
└── languages/
    └── power_contract-zh_TW.*              # 繁體中文翻譯
```

## 自訂文章類型（CPT）

| CPT | 說明 | 自訂狀態 |
|-----|------|---------|
| `contract_template` | 合約模板（管理員建立） | 無 |
| `contract` | 合約記錄（用戶簽署） | `pending`、`approved`、`rejected` |

## 短碼系統

合約模板透過短碼嵌入可互動欄位：

| 短碼 | 用途 | 範例 |
|------|------|------|
| `[pct_input]` | 文字輸入框 | 姓名、地址 |
| `[pct_seal]` | 公司印章顯示 | 蓋印 |
| `[pct_signature]` | 手寫簽名板（signature_pad） | 電子簽名 |
| `[pct_date]` | 日期（中華民國/西元格式） | 簽約日期 |
| `[pct_ip]` | 使用者 IP 地址 | 法律記錄 |

## 程式碼模式與慣例

### Singleton 模式

所有類別使用 `SingletonTrait`，Bootstrap 串接初始化：

```php
final class Bootstrap {
    use \J7\WpUtils\Traits\SingletonTrait;

    public function __construct() {
        Contract\Init::get_instance();
        Contract\Ajax::get_instance();
        Contract\LifeCycle::get_instance();
        ContractTemplate\Init::get_instance();
        Shortcodes\Shortcodes::get_instance();
        Admin\Settings::get_instance();
        Email\Email::get_instance();
    }
}
```

### 生命週期 Hooks

```php
// 合約相關 Action Hooks（供其他外掛監聽）
do_action( 'power_contract_contract_created', $contract_id );
do_action( 'power_contract_contract_pending', $contract_id );
do_action( 'power_contract_contract_approved', $contract_id );
do_action( 'power_contract_contract_rejected', $contract_id );

// 短碼欄位參數過濾
apply_filters( 'power_contract_input_args', $args, $shortcode_name );
```

### WooCommerce HPOS 相容

```php
// 同時支援傳統 CPT 和 HPOS（High-Performance Order Storage）
$order = wc_get_order( $order_id );
// 勿直接使用 get_post_meta，改用 $order->get_meta()
```

## 命名慣例

| 類型 | 慣例 | 範例 |
|------|------|------|
| PHP Namespace | PascalCase | `J7\PowerContract\Resources\Contract` |
| PHP 類別 | PascalCase（必須 final） | `final class Init` |
| CPT | snake_case | `contract_template` |
| Meta key | _前綴 snake_case | `_contract_customer_id` |
| 短碼 | 前綴_名稱 | `pct_signature` |
| Action Hook | 外掛名_事件 | `power_contract_contract_approved` |
| Text Domain | snake_case | `power_contract` |

## 開發規範

1. 所有類別必須宣告為 `final`，使用 `SingletonTrait`
2. 所有使用者輸入使用 WordPress sanitize 函數清理（`sanitize_text_field`、`sanitize_email`）
3. 所有輸出使用 escape 函數（`esc_html()`、`esc_attr()`、`esc_url()`）
4. PHPStan Level 6 必須通過，`declare(strict_types=1)` 必須在所有 PHP 檔案頂部
5. 排除目錄：`js/`、`vendor/`、`node_modules/`、`release/`（phpcs 不檢查）
6. 短陣列語法 `[]`，不使用 `array()`

## 常用指令

```bash
composer install           # 安裝 PHP 依賴
pnpm install               # 安裝 Node 依賴
pnpm dev                   # Vite 開發伺服器
pnpm build                 # 建置到 js/dist/
vendor/bin/phpcs           # PHP 代碼風格檢查
vendor/bin/phpstan analyse # PHPStan 靜態分析（Level 6）
pnpm release               # 發佈 patch 版本
```

## 相關 SKILL

- `wordpress-master` — WordPress Plugin 開發通用指引
- `wordpress-reviewer` — PHP 代碼審查規範
- `wp-rest-api` — WordPress REST API 設計規範
