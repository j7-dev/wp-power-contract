@ignore @command
Feature: 感謝頁前重導向至合約

  結帳完成後，在跳轉感謝頁面前，將 URL 改為合約模板頁面，讓用戶先簽合約再看感謝頁。

  Background:
    Given 系統中有以下用戶：
      | userId | name   | email              | role     |
      | 2      | 王小明 | wang@example.com   | customer |
    And WooCommerce 已啟用
    And 系統中有以下合約模板：
      | templateId | title    | status  |
      | 100        | 租賃合約 | publish |
    And 系統中有以下 WooCommerce 訂單：
      | orderId | customer | total |
      | 500     | 王小明   | 50000 |
    And 外掛設定如下：
      | key                             | value |
      | display_contract_after_checkout | true  |
      | chosen_contract_template        | 100   |

  Rule: 前置（狀態）- display_contract_after_checkout 必須為 true

    Example: 設定關閉時不改變感謝頁 URL
      Given 外掛設定 "display_contract_after_checkout" 為 false
      When 訂單 #500 結帳完成，系統計算感謝頁 URL
      Then 回傳原始的感謝頁 URL，不改變

  Rule: 前置（狀態）- 訂單 meta is_signed 不可為 yes

    Example: 訂單已簽約時不重導向
      Given 訂單 #500 的 meta "is_signed" 為 "yes"
      When 訂單 #500 結帳完成，系統計算感謝頁 URL
      Then 回傳原始的感謝頁 URL，不改變

  Rule: 前置（狀態）- chosen_contract_template 必須已設定

    Example: 未設定合約模板時不重導向
      Given 外掛設定 "chosen_contract_template" 為空
      When 訂單 #500 結帳完成，系統計算感謝頁 URL
      Then 回傳原始的感謝頁 URL，不改變

  Rule: 後置（狀態）- 應回傳合約模板頁面 URL 帶有 redirect=thankyou 和 order_id

    Example: 成功將感謝頁 URL 改為合約頁面
      Given 訂單 #500 的 meta "is_signed" 不為 "yes"
      When 訂單 #500 結帳完成，系統計算感謝頁 URL
      Then 回傳的 URL 指向合約模板 #100 的 permalink
      And URL 帶有 "redirect=thankyou" 參數
      And URL 帶有 "order_id=500" 參數

  Rule: 前置（狀態）- 重導向條件可透過 filter 自訂

    Example: 透過 power_contract_redirect_before_thankyou_condition filter 禁止重導向
      Given 有外部程式透過 filter "power_contract_redirect_before_thankyou_condition" 回傳 false
      When 訂單 #500 結帳完成，系統計算感謝頁 URL
      Then 回傳原始的感謝頁 URL，不改變
