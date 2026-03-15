@ignore @command
Feature: 結帳前重導向至合約

  當用戶進入 WooCommerce 結帳頁面時，若設定啟用且尚未簽約，自動重導向至合約模板頁面。

  Background:
    Given 系統中有以下用戶：
      | userId | name   | email              | role     |
      | 2      | 王小明 | wang@example.com   | customer |
    And WooCommerce 已啟用
    And 系統中有以下合約模板：
      | templateId | title    | status  |
      | 100        | 租賃合約 | publish |
    And 外掛設定如下：
      | key                              | value |
      | display_contract_before_checkout | true  |
      | chosen_contract_template         | 100   |

  Rule: 前置（狀態）- display_contract_before_checkout 必須為 true

    Example: 設定關閉時不重導向
      Given 外掛設定 "display_contract_before_checkout" 為 false
      When 用戶 "王小明" 進入結帳頁面
      Then 用戶正常停留在結帳頁面，不重導向

  Rule: 前置（狀態）- 當前頁面必須為結帳頁面

    Example: 不在結帳頁面時不重導向
      Given 外掛設定 "display_contract_before_checkout" 為 true
      When 用戶 "王小明" 進入商品頁面
      Then 不觸發任何重導向

  Rule: 前置（狀態）- URL 參數 is_signed 不可為 yes

    Example: URL 帶有 is_signed=yes 時不重導向
      Given 用戶 "王小明" 進入結帳頁面，URL 帶有 "is_signed=yes"
      Then 用戶正常停留在結帳頁面，不重導向

  Rule: 後置（狀態）- 應重導向至合約模板頁面並帶有 redirect=checkout 參數

    Example: 成功重導向至合約簽署頁面
      Given 用戶 "王小明" 進入結帳頁面
      And URL 不帶有 "is_signed=yes"
      When template_redirect hook 觸發
      Then 用戶被重導向至合約模板頁面
      And 重導向 URL 為 "/contract_template/100" 並帶有 "redirect=checkout"

  Rule: 後置（狀態）- chosen_contract_template 可透過 filter 覆寫

    Example: 透過 power_contract_chosen_contract_template filter 覆寫模板 ID
      Given 外掛設定 "chosen_contract_template" 為 100
      And 有外部程式透過 filter "power_contract_chosen_contract_template" 回傳 200
      When 用戶 "王小明" 進入結帳頁面
      Then 重導向 URL 使用合約模板 ID 200

  Rule: 前置（狀態）- 重導向條件可透過 filter 自訂

    Example: 透過 power_contract_redirect_before_checkout_condition filter 禁止重導向
      Given 有外部程式透過 filter "power_contract_redirect_before_checkout_condition" 回傳 false
      When 用戶 "王小明" 進入結帳頁面
      Then 用戶正常停留在結帳頁面，不重導向
