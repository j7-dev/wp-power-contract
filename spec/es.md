# Event Storming: Power Contract

> WordPress 線上簽合約 & 審批外掛。管理員可建立合約模板（含自訂欄位、公司章、簽名板），將模板連結提供給客戶線上填寫簽署；簽署後系統自動截圖存檔、寄送通知信，管理員可在後台審核（核准 / 拒絕）。可選擇性整合 WooCommerce，在結帳前或感謝頁前插入合約流程。
> **版本:** 0.0.10 | **文件日期:** 2026-03-12

---

## Actors

- **Admin** [人]: WordPress 管理員，建立合約模板、審核合約、管理設定（見 `specs/actors/Admin.md`）
- **Customer** [人]: 前端用戶（可為訪客），瀏覽合約模板、填寫欄位、簽名並送出合約（見 `specs/actors/Customer.md`）
- **System** [系統]: 監聽合約狀態變更並觸發 action hook，自動寄送通知信（見 `specs/actors/System.md`）
- **WooCommerce** [外部系統]: 提供結帳流程、訂單資料，與合約流程整合（見 `specs/actors/WooCommerce.md`）

---

## Activities

- `activities/合約簽署流程.activity` — 端到端合約簽署、審核、查看流程
- `activities/WooCommerce結帳整合流程.activity` — WooCommerce 結帳前/後重導向至合約

---

## Aggregates

### ContractTemplate（合約模板）

> Custom Post Type: `contract_template`，管理員用來定義合約的版面、欄位與公司章

| 屬性 | 說明 |
|------|------|
| `ID` | WordPress post ID |
| `post_title` | 合約模板名稱 |
| `post_content` | 合約模板內容（支援 shortcode：`pct_input`、`pct_seal`、`pct_signature`、`pct_date`、`pct_ip`） |
| `post_status` | publish / draft |
| `seal_url` | 公司章圖片 URL（post_meta） |

### Contract（合約）

> Custom Post Type: `contract`，客戶填寫簽署後產生的合約紀錄

| 屬性 | 說明 |
|------|------|
| `ID` | WordPress post ID |
| `post_title` | 自動產生：`{模板名稱} 合約 - {用戶姓名} 對應 user_id: #{user_id}` |
| `post_status` | `pending`（待審核）/ `approved`（已核准）/ `rejected`（已拒絕） |
| `post_author` | 簽署者的 user_id（訪客為 0） |
| `contract_template_id` | 來源合約模板 ID（post_meta） |
| `user_name` | 簽署者姓名（post_meta） |
| `user_address` | 簽署者地址（post_meta，選填） |
| `user_identity` | 簽署者身分證字號（post_meta，選填） |
| `user_phone` | 簽署者手機號碼（post_meta，選填） |
| `contract_amount` | 合約金額（post_meta，選填） |
| `signature` | 簽名圖片 base64（post_meta） |
| `screenshot_url` | 合約截圖 URL（post_meta） |
| `client_ip` | 簽署時的客戶端 IP（post_meta） |
| `_order_id` | 關聯的 WooCommerce 訂單 ID（post_meta，選填） |
| `_redirect` | 簽署後重導向目標：checkout / thankyou（post_meta，選填） |

### Settings（外掛設定）

> `wp_options` key: `power_contract_settings`

| 屬性 | 說明 |
|------|------|
| `ajax_signed_title` | 簽署完成 Modal 標題 |
| `ajax_signed_description` | 簽署完成 Modal 描述（支援 HTML） |
| `ajax_signed_btn_text` | 簽署完成 Modal 按鈕文字（空白則隱藏按鈕） |
| `ajax_signed_btn_link` | 簽署完成 Modal 按鈕連結 |
| `display_order_info` | 是否自動顯示訂單資訊填入欄位（bool） |
| `display_contract_before_checkout` | 是否在結帳前顯示合約（bool） |
| `display_contract_after_checkout` | 是否在結帳後、感謝頁前顯示合約（bool） |
| `emails` | 合約簽署後通知信收件人列表（string[]） |
| `chosen_contract_template` | WooCommerce 結帳流程使用的合約模板 ID |

---

## Commands

### CreateContract（建立合約 / 簽署合約）

- **Actor**: Customer（透過前端 AJAX）
- **Aggregate**: Contract
- **Predecessors**: 無（第一個動作）
- **觸發方式**: WordPress AJAX `wp_ajax_create_contract` / `wp_ajax_nopriv_create_contract`
- **Feature**: `features/contract/建立合約.feature`
- **參數**:
  - `nonce` (string, 必填) -- WordPress AJAX nonce
  - `contract_template_id` (int, 必填) -- 合約模板 ID
  - `user_name` (string, 選填) -- 簽署者姓名
  - `user_address` (string, 選填) -- 簽署者地址
  - `user_identity` (string, 選填) -- 身分證字號
  - `user_phone` (string, 選填) -- 手機號碼
  - `contract_amount` (string, 選填) -- 合約金額
  - `signature` (string/base64, 選填) -- 簽名圖片
  - `screenshot` (string/base64, 選填) -- 合約頁面截圖
  - `_order_id` (int, 選填) -- 關聯訂單 ID
  - `_redirect` (string, 選填) -- 簽署後重導向：checkout / thankyou
- **Description**:
  - **What**: 客戶在合約模板前端頁面填寫完欄位並簽名後，透過 AJAX 送出建立一筆合約紀錄
  - **Why**: 將客戶的簽署資料持久化為 `contract` CPT，並截圖存檔作為法律憑證
  - **When**: 客戶點擊「送出」按鈕時

#### Rules

- 前置（參數）: `nonce` 必須有效，否則回傳錯誤「OOPS! 合約簽屬中發生錯誤!」
- 前置（參數）: `contract_template_id` 為必填參數
- 後置（狀態）: 建立 `contract` CPT，狀態為 `pending`
- 後置（狀態）: 截圖上傳後，`screenshot_url` 存入 post_meta
- 後置（狀態）: 觸發 `do_action('power_contract_contract_created', $new_contract_id, $args)`
- 後置（狀態）: 如有 `_order_id`，更新訂單 meta `is_signed` = `yes`
- 後置（狀態）: 根據 `_redirect` 參數計算重導向 URL 並回傳給前端
- 後置（狀態）: 訪客（未登入）亦可簽署，post_author 為 0

---

### ApproveContract（核准合約）

- **Actor**: Admin
- **Aggregate**: Contract
- **Predecessors**: CreateContract
- **觸發方式**: `admin_post_approve_contract`（GET 請求）
- **Feature**: `features/contract/核准合約.feature`
- **參數**:
  - `post_id` (int, 必填) -- 合約 ID
- **Description**:
  - **What**: 管理員在合約編輯頁面點擊「Approve」按鈕，將合約狀態改為 `approved`
  - **Why**: 管理員審閱合約內容後確認無誤，核准該合約
  - **When**: 管理員在合約編輯頁面點擊核准按鈕時

#### Rules

- 前置（參數）: post_id 必須對應 post_type 為 contract 的文章
- 後置（狀態）: 合約 `post_status` 變更為 `approved`
- 後置（狀態）: 觸發 `do_action('power_contract_contract_approved', ...)`
- 後置（狀態）: 重導向至合約列表頁

---

### RejectContract（拒絕合約）

- **Actor**: Admin
- **Aggregate**: Contract
- **Predecessors**: CreateContract
- **觸發方式**: `admin_post_reject_contract`（GET 請求）
- **Feature**: `features/contract/拒絕合約.feature`
- **參數**:
  - `post_id` (int, 必填) -- 合約 ID
- **Description**:
  - **What**: 管理員在合約編輯頁面點擊「Reject」按鈕，將合約狀態改為 `rejected`
  - **Why**: 管理員審閱合約後認為不符合要求，拒絕該合約
  - **When**: 管理員在合約編輯頁面點擊拒絕按鈕時

#### Rules

- 前置（參數）: post_id 必須對應 post_type 為 contract 的文章
- 後置（狀態）: 合約 `post_status` 變更為 `rejected`
- 後置（狀態）: 觸發 `do_action('power_contract_contract_rejected', ...)`
- 後置（狀態）: 重導向至合約列表頁

---

### BulkChangeContractStatus（批量變更合約狀態）

- **Actor**: Admin
- **Aggregate**: Contract
- **Predecessors**: CreateContract
- **觸發方式**: WordPress 合約列表頁 Bulk Actions
- **Feature**: `features/contract/批量變更合約狀態.feature`
- **參數**:
  - `action` (string, 必填) -- `change-to-pending` / `change-to-approved` / `change-to-rejected`
  - `post_ids` (int[], 必填) -- 要變更的合約 ID 陣列
- **Description**:
  - **What**: 管理員在合約列表頁勾選多筆合約，批量變更狀態
  - **Why**: 提升管理效率，不需逐筆進入編輯頁面操作
  - **When**: 管理員在列表頁選取 Bulk Action 並套用時

#### Rules

- 前置（參數）: `action` 必須為合法的批量操作之一
- 後置（狀態）: 所有選取的合約 `post_status` 變更為對應狀態
- 後置（狀態）: 各合約觸發 `transition_post_status` hook
- 後置（狀態）: 顯示變更成功的提示訊息

---

### SendContractEmail（寄送合約通知信）

- **Actor**: System（由 `power_contract_contract_created` hook 觸發）
- **Aggregate**: Contract, Settings
- **Predecessors**: CreateContract
- **觸發方式**: `add_action('power_contract_contract_created', ...)`
- **Feature**: `features/contract/寄送合約通知信.feature`
- **參數**:
  - `new_contract_id` (int) -- 新建合約 ID
  - `args` (array) -- 合約建立時的參數
- **Description**:
  - **What**: 合約建立後自動寄送通知 email 給 Settings 中設定的收件人
  - **Why**: 讓管理員即時收到新合約通知，能儘快進行審核
  - **When**: 合約建立完成後立即觸發

#### Rules

- 前置（狀態）: Settings 中 `emails` 欄位需有至少一個有效 email
- 後置（狀態）: 寄送 HTML 格式的 email，包含合約資料與「前往審核」連結
- 後置（狀態）: email 主旨為「有新的合約待審核 #{contract_id}」

---

### SaveContractTemplateSeal（儲存合約模板公司章）

- **Actor**: Admin
- **Aggregate**: ContractTemplate
- **Predecessors**: 無
- **觸發方式**: `save_post_contract_template` hook（傳統編輯器）/ `rest_insert_contract_template` hook（區塊編輯器）
- **Feature**: `features/contract-template/儲存合約模板公司章.feature`
- **參數**:
  - `seal` (file, 選填) -- 上傳的公司章圖片檔案（傳統編輯器）
  - `meta.seal_url` (string, 選填) -- 公司章圖片 URL（區塊編輯器）
- **Description**:
  - **What**: 管理員在合約模板編輯頁面上傳或更新公司章圖片
  - **Why**: 每個合約模板可搭配不同的公司章圖片
  - **When**: 管理員儲存合約模板時

#### Rules

- 前置（參數）: nonce 驗證（`seal_nonce`）必須通過
- 前置（狀態）: 當前用戶必須有 `edit_post` 權限
- 後置（狀態）: `seal_url` post_meta 更新為上傳圖片的 URL

---

### UpdateSettings（更新外掛設定）

- **Actor**: Admin
- **Aggregate**: Settings
- **Predecessors**: 無
- **觸發方式**: WordPress Settings API（`options.php` 表單提交）
- **Feature**: `features/settings/更新外掛設定.feature`
- **參數**:
  - `power_contract_settings` (array) -- 包含所有設定欄位
- **Description**:
  - **What**: 管理員在設定頁面修改外掛設定並儲存
  - **Why**: 自訂簽署完成的提示訊息、WooCommerce 整合行為、通知信收件人等
  - **When**: 管理員在設定頁面點擊儲存按鈕時

#### Rules

- 前置（狀態）: 當前用戶必須有 `manage_options` 權限
- 後置（狀態）: `wp_options` 中 `power_contract_settings` 更新
- 後置（回應）: WooCommerce 未安裝時 Woocommerce 分頁顯示為 disabled

---

### RedirectBeforeCheckout（結帳前重導向至合約）

- **Actor**: WooCommerce（`template_redirect` hook）
- **Aggregate**: Settings
- **Predecessors**: 無
- **觸發方式**: `add_action('template_redirect', ...)`
- **Feature**: `features/woocommerce/結帳前重導向至合約.feature`
- **參數**: 無（從 Settings 和 URL 參數讀取）
- **Description**:
  - **What**: 當用戶進入結帳頁面時，若設定啟用且尚未簽約，自動重導向至合約模板頁面
  - **Why**: 確保用戶在結帳前先完成合約簽署
  - **When**: 用戶訪問結帳頁面，且 `display_contract_before_checkout` 為 true，且 URL 不含 `is_signed=yes`

#### Rules

- 前置（狀態）: `display_contract_before_checkout` 設定必須為 true
- 前置（狀態）: 當前頁面必須是結帳頁面（`is_checkout()`）
- 前置（狀態）: URL 參數 `is_signed` 不能為 `yes`（避免無限迴圈）
- 前置（狀態）: `chosen_contract_template` 必須已設定
- 後置（狀態）: 重導向至合約模板頁面，URL 帶 `redirect=checkout`
- 前置（狀態）: 可透過 `power_contract_redirect_before_checkout_condition` filter 自訂條件
- 後置（狀態）: 可透過 `power_contract_chosen_contract_template` filter 覆寫模板 ID

---

### RedirectBeforeThankyou（感謝頁前重導向至合約）

- **Actor**: WooCommerce（`woocommerce_get_checkout_order_received_url` filter）
- **Aggregate**: Settings
- **Predecessors**: 無
- **觸發方式**: `add_filter('woocommerce_get_checkout_order_received_url', ...)`
- **Feature**: `features/woocommerce/感謝頁前重導向至合約.feature`
- **參數**:
  - `order` (WC_Order) -- 當前訂單
- **Description**:
  - **What**: 結帳完成後，在跳轉感謝頁面前，將 URL 改為合約模板頁面
  - **Why**: 確保用戶在結帳後、進入感謝頁前先完成合約簽署
  - **When**: 訂單完成付款後，`display_contract_after_checkout` 為 true，且訂單 meta `is_signed` 不為 `yes`

#### Rules

- 前置（狀態）: `display_contract_after_checkout` 設定必須為 true
- 前置（狀態）: 訂單 meta `is_signed` 不能為 `yes`
- 前置（狀態）: `chosen_contract_template` 必須已設定
- 後置（狀態）: 回傳修改後的 URL，帶有 `redirect=thankyou` 和 `order_id`
- 前置（狀態）: 可透過 `power_contract_redirect_before_thankyou_condition` filter 自訂條件

---

## Read Models

### ViewContractDetail（查看合約詳情）

- **Actor**: Admin
- **Aggregates**: Contract, (WooCommerce Order)
- **Feature**: `features/contract/查看合約詳情.feature`
- **回傳欄位**:
  - `contract_template_id` -- 來源模板 ID
  - `signature` -- 簽名圖片
  - `user_name` -- 簽署者姓名
  - `user_address` -- 簽署者地址
  - `user_identity` -- 身分證字號
  - `user_phone` -- 手機號碼
  - `contract_amount` -- 合約金額
  - `client_ip` -- 簽署時 IP
  - `screenshot_url` -- 合約截圖
  - `signed_at` -- 簽署時間
  - `relation_order_id` -- 關聯訂單（若有 WooCommerce）
  - `customer_name` / `customer_email` / `customer_phone` / `customer_address` -- 訂單客戶資料
- **Description**: 管理員在合約編輯頁面查看合約的所有欄位資料、簽名、截圖、IP 及關聯訂單資訊

#### Rules

- 前置（狀態）: 當前用戶必須有編輯合約的權限
- 後置（回應）: 隱藏 `_edit_lock`、`_thumbnail_id`、`_order_id` 等系統欄位
- 後置（回應）: 欄位名稱經過 i18n 翻譯顯示
- 後置（回應）: 側邊欄 Approval metabox 顯示 Approve/Reject 按鈕，依狀態 disabled

---

### ListContracts（合約列表）

- **Actor**: Admin
- **Aggregates**: Contract
- **Feature**: `features/contract/合約列表.feature`
- **回傳欄位**:
  - `title` -- 合約標題
  - `user_name` -- 簽署者姓名
  - `status` -- 合約狀態（pending / approved / rejected）
  - `order_id` -- 關聯訂單 ID（若 WooCommerce 啟用）
  - `date` -- 建立日期
- **Description**: 管理員在合約列表頁面查看所有合約及其狀態

#### Rules

- 後置（回應）: 狀態以色彩標籤顯示（pending 黃色、approved 藍色、rejected 紅色）
- 後置（回應）: 訂單 ID 欄位僅在 WooCommerce 啟用時顯示
- 後置（回應）: 訂單 ID 顯示為連結，可點擊至訂單編輯頁面

---

### ViewContractInOrder（訂單中查看合約）

- **Actor**: Admin
- **Aggregates**: Contract, WooCommerce Order
- **Feature**: `features/woocommerce/訂單中查看合約.feature`
- **回傳欄位**:
  - `contract_id` -- 合約 ID（可點擊連結至合約編輯頁面）
- **Description**: 管理員在 WooCommerce 訂單列表頁面查看訂單關聯的合約

#### Rules

- 前置（狀態）: WooCommerce 必須已啟用
- 後置（回應）: 顯示所有與該訂單關聯的合約 ID 連結
- 後置（回應）: 支援傳統訂單列表與 HPOS 新版訂單列表

---

### ViewContractInMyAccount（我的帳號中查看合約）

- **Actor**: Customer
- **Aggregates**: Contract, WooCommerce Order
- **Feature**: `features/woocommerce/我的帳號查看合約.feature`
- **回傳欄位**:
  - `screenshot_url` -- 合約截圖
  - `post_status` -- 合約狀態（附色彩標籤：已審核/審核中/已拒絕）
- **Description**: 客戶在 WooCommerce 我的帳號 > 訂單詳情頁面查看該訂單關聯的合約截圖與審核狀態

#### Rules

- 前置（狀態）: WooCommerce 必須已啟用
- 後置（回應）: 以合約截圖縮圖 + 狀態標籤方式呈現
- 後置（回應）: 訂單無關聯合約時不顯示合約區塊

---

### SignedModal（簽署完成顯示 Modal）

- **Actor**: Customer
- **Aggregates**: Settings
- **Feature**: `features/contract/簽署完成顯示Modal.feature`
- **回傳欄位**:
  - `ajax_signed_title` -- Modal 標題
  - `ajax_signed_description` -- Modal 描述
  - `ajax_signed_btn_text` -- 按鈕文字
  - `ajax_signed_btn_link` -- 按鈕連結
  - `redirect_url` -- 自動跳轉 URL
- **Description**: 客戶簽署合約後，前端顯示簽署完成 Modal

#### Rules

- 後置（回應）: 成功時顯示成功區塊，失敗時顯示錯誤區塊
- 後置（回應）: 有 redirect_url 時 3 秒後自動跳轉
- 後置（回應）: ajax_signed_btn_text 為空時隱藏按鈕

---

## Hooks（供外部擴展）

### Actions

| Hook 名稱 | 觸發時機 | 參數 |
|-----------|---------|------|
| `power_contract_contract_created` | 合約建立完成後 | `$new_contract_id`, `$args` |
| `power_contract_contract_pending` | 合約狀態變為 pending 後 | `$new_status`, `$old_status`, `$post` |
| `power_contract_contract_approved` | 合約狀態變為 approved 後 | `$new_status`, `$old_status`, `$post` |
| `power_contract_contract_rejected` | 合約狀態變為 rejected 後 | `$new_status`, `$old_status`, `$post` |

### Filters

| Filter 名稱 | 用途 | 參數 |
|-------------|------|------|
| `power_contract_input_args` | 自訂 pct_input shortcode 的參數（如自動帶入訂單資訊） | `$args` |
| `power_contract_seal_args` | 自訂 pct_seal shortcode 的參數 | `$args` |
| `power_contract_signature_args` | 自訂 pct_signature shortcode 的參數 | `$args` |
| `power_contract_redirect_before_checkout_condition` | 自訂結帳前重導向條件 | `$condition` |
| `power_contract_redirect_before_thankyou_condition` | 自訂感謝頁前重導向條件 | `$condition`, `$order` |
| `power_contract_chosen_contract_template` | 覆寫結帳流程使用的合約模板 ID | `$template_id` |

---

## Shortcodes

| Shortcode | 說明 | 參數 |
|-----------|------|------|
| `[pct_input name="..." width="..." placeholder="..."]` | 合約輸入框（姓名、地址、身分證、電話、金額等） | `name`, `width`, `placeholder`, `style`, `class`, `id`, `type`, `value` |
| `[pct_seal]` | 顯示公司章圖片（從合約模板的 seal_url meta 讀取） | `style`, `class`, `id` |
| `[pct_signature]` | 簽名板（點擊開啟全螢幕畫布簽名） | `style`, `class`, `id` |
| `[pct_date format="..." base="tw\|ad"]` | 顯示日期（預設中華民國格式） | `format`, `base` |
| `[pct_ip]` | 顯示用戶的 IP 位址 | 無 |
