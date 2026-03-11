@ignore
Feature: 查看合約詳情

  管理員在合約編輯頁面查看合約的所有欄位資料、簽名、截圖、IP 及關聯訂單資訊。

  Background:
    Given 系統中有以下用戶：
      | userId | name   | email              | role     |
      | 1      | Admin  | admin@example.com  | admin    |
      | 2      | 王小明 | wang@example.com   | customer |
    And 系統中有以下合約：
      | contractId | title                  | status  | user_name | user_phone | signature    | screenshot_url                  | client_ip   | contract_template_id |
      | 200        | 租賃合約 合約 - 王小明 | pending | 王小明    | 0912345678 | data:image/… | https://example.com/screen.png  | 192.168.1.1 | 100                  |

  # ========== 前置（參數）==========

  Rule: 前置（狀態）- 必須有編輯合約的權限
    Example: 管理員可查看合約詳情
      Given 管理員 "Admin" 已登入後台
      When 管理員進入合約 #200 的編輯頁面
      Then 頁面顯示合約 metabox

  # ========== 後置（回應）==========

  Rule: 後置（回應）- 顯示合約欄位資料
    Example: 合約 metabox 呈現所有欄位
      Given 管理員 "Admin" 在合約 #200 的編輯頁面
      Then metabox 以表格顯示以下欄位：
        | 欄位名稱（i18n） | 值                               |
        | Contract Template Id | 100                          |
        | User Name        | 王小明                           |
        | User Phone       | 0912345678                       |
        | Signature        | （簽名圖片）                     |
        | Signed Contract  | （合約截圖連結）                 |
        | Signed At        | （簽署日期時間）                 |
      And 不顯示 _edit_lock 欄位
      And 不顯示 _thumbnail_id 欄位
      And 不顯示 _order_id 欄位（以 relation_order_id 連結取代）

  Rule: 後置（回應）- 有關聯訂單時顯示訂單資訊
    Example: 合約關聯 WooCommerce 訂單
      Given 合約 #200 的 _order_id 為 500
      And 系統中有 WooCommerce 訂單 #500
      When 管理員查看合約 #200
      Then metabox 額外顯示以下欄位：
        | 欄位名稱            | 值            |
        | relation_order_id   | #500（連結）  |
        | customer_name       | 訂單姓名      |
        | customer_email      | 訂單 email    |
        | customer_phone      | 訂單電話      |
        | customer_address    | 訂單地址      |

  Rule: 後置（回應）- 側邊欄顯示審核按鈕
    Example: 合約待審核時顯示 Approve 和 Reject 按鈕
      Given 合約 #200 狀態為 "pending"
      When 管理員查看合約 #200
      Then 側邊欄的 Approval metabox 顯示：
        | 按鈕     | 狀態    |
        | Reject   | 可點擊  |
        | Approve  | 可點擊  |

    Example: 合約已核准時 Approve 按鈕停用
      Given 合約 #200 狀態為 "approved"
      When 管理員查看合約 #200
      Then 側邊欄的 Approve 按鈕顯示為 disabled
      And Reject 按鈕仍可點擊
