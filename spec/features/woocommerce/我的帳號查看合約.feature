@ignore @query
Feature: 我的帳號查看合約

  客戶在 WooCommerce 我的帳號 > 訂單詳情頁面查看該訂單關聯的合約截圖與審核狀態。

  Background:
    Given 系統中有以下用戶：
      | userId | name   | email              | role     |
      | 2      | 王小明 | wang@example.com   | customer |
    And WooCommerce 已啟用
    And 系統中有以下 WooCommerce 訂單：
      | orderId | customer | total |
      | 500     | 王小明   | 50000 |
    And 系統中有以下合約：
      | contractId | title             | status   | _order_id | screenshot_url                  |
      | 201        | 合約 - 王小明     | approved | 500       | https://example.com/screen1.png |
      | 202        | 合約 - 王小明(二) | pending  | 500       | https://example.com/screen2.png |

  Rule: 前置（狀態）- WooCommerce 必須已啟用

    Example: WooCommerce 未安裝時不顯示合約區塊
      Given WooCommerce 未安裝
      Then 我的帳號訂單詳情頁面不顯示合約區塊

  Rule: 後置（回應）- 訂單詳情頁應顯示合約截圖縮圖與狀態標籤

    Example: 訂單有多筆合約時顯示截圖與狀態
      Given 用戶 "王小明" 在我的帳號 > 訂單 #500 的詳情頁面
      Then 頁面顯示「合約」區塊
      And 顯示 2 張合約截圖縮圖
      And 合約 #201 的縮圖右上角顯示藍色「已審核」標籤
      And 合約 #202 的縮圖右上角顯示黃色「審核中」標籤
      And 每張縮圖可點擊開啟原圖

  Rule: 後置（回應）- 訂單無合約時不應顯示合約區塊

    Example: 訂單沒有關聯合約時不顯示區塊
      Given 系統中有 WooCommerce 訂單 #502，無關聯合約
      When 用戶 "王小明" 在我的帳號 > 訂單 #502 的詳情頁面
      Then 頁面不顯示「合約」區塊

  Rule: 後置（回應）- 合約狀態標籤應包含 approved、pending、rejected 三種

    Example: 已拒絕的合約顯示紅色標籤
      Given 系統中有以下合約：
        | contractId | title         | status   | _order_id | screenshot_url                  |
        | 203        | 合約 - 王小明 | rejected | 500       | https://example.com/screen3.png |
      When 用戶 "王小明" 在我的帳號 > 訂單 #500 的詳情頁面
      Then 合約 #203 的縮圖右上角顯示紅色「已拒絕」標籤
