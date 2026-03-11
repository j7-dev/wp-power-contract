@ignore
Feature: 訂單中查看合約

  管理員在 WooCommerce 訂單列表頁面查看訂單關聯的合約，支援傳統與 HPOS 兩種訂單列表。

  Background:
    Given 系統中有以下用戶：
      | userId | name   | email              | role  |
      | 1      | Admin  | admin@example.com  | admin |
    And WooCommerce 已啟用
    And 系統中有以下 WooCommerce 訂單：
      | orderId | customer | total  |
      | 500     | 張三     | 30000  |
      | 501     | 李四     | 20000  |
    And 系統中有以下合約：
      | contractId | title                | _order_id |
      | 201        | 合約 - 張三          | 500       |
      | 202        | 合約 - 張三(二)      | 500       |
      | 203        | 合約 - 李四          | 501       |

  # ========== 前置（參數）==========

  Rule: 前置（狀態）- WooCommerce 必須已啟用
    Example: WooCommerce 未安裝時不顯示合約欄位
      Given WooCommerce 未安裝
      When 管理員進入訂單列表頁面
      Then 訂單列表不包含 "Contract" 欄位

  # ========== 後置（回應）==========

  Rule: 後置（回應）- 訂單列表顯示關聯合約
    Example: 訂單有多筆關聯合約
      Given 管理員 "Admin" 在 WooCommerce 訂單列表頁面
      Then 訂單 #500 的 "Contract" 欄位顯示 "#201" 和 "#202" 連結
      And 訂單 #501 的 "Contract" 欄位顯示 "#203" 連結
      And 每個合約 ID 連結指向對應的合約編輯頁面

  Rule: 後置（回應）- 訂單無關聯合約時欄位為空
    Example: 訂單沒有合約
      Given 系統中有 WooCommerce 訂單 #502，無關聯合約
      Then 訂單 #502 的 "Contract" 欄位為空
