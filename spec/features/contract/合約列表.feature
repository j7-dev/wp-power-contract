@ignore @query
Feature: 合約列表

  管理員在合約列表頁面查看所有合約及其狀態、簽署者姓名、關聯訂單。

  Background:
    Given 系統中有以下用戶：
      | userId | name  | email             | role  |
      | 1      | Admin | admin@example.com | admin |
    And 系統中有以下合約：
      | contractId | title                | status   | user_name | _order_id |
      | 201        | 租賃合約 合約 - 張三 | pending  | 張三      | 500       |
      | 202        | 租賃合約 合約 - 李四 | approved | 李四      |           |
      | 203        | 租賃合約 合約 - 王五 | rejected | 王五      | 501       |

  Rule: 前置（狀態）- 當前用戶必須為管理員

    Example: 管理員可查看合約列表頁面
      Given 管理員 "Admin" 已登入後台
      When 管理員進入合約列表頁面
      Then 頁面顯示所有合約

  Rule: 後置（回應）- 列表應包含 Title、name、Status、Date 自訂欄位

    Example: 列表顯示名稱與狀態欄位
      Given 管理員在合約列表頁面
      Then 列表包含以下欄位：
        | 欄位名稱 |
        | Title    |
        | name     |
        | Status   |
        | Date     |

  Rule: 後置（回應）- 狀態應以色彩標籤顯示

    Example: 不同狀態顯示對應顏色標籤
      Given 管理員在合約列表頁面
      Then 合約 #201 的狀態標籤為黃色底（pending）
      And 合約 #202 的狀態標籤為藍色底（approved）
      And 合約 #203 的狀態標籤為紅色底（rejected）

  Rule: 後置（回應）- WooCommerce 啟用時應顯示 Order ID 欄位

    Example: WooCommerce 啟用時列表包含 Order ID 欄位
      Given WooCommerce 已啟用
      And 管理員在合約列表頁面
      Then 列表包含 "Order ID" 欄位
      And 合約 #201 的 Order ID 欄位顯示 "#500" 連結
      And 合約 #202 的 Order ID 欄位為空

  Rule: 後置（回應）- WooCommerce 未安裝時不應顯示 Order ID 欄位

    Example: WooCommerce 未安裝時列表無 Order ID 欄位
      Given WooCommerce 未安裝
      When 管理員進入合約列表頁面
      Then 列表不包含 "Order ID" 欄位
