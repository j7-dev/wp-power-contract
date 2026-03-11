@ignore
Feature: 結帳前重導向至合約

  當用戶進入 WooCommerce 結帳頁面時，若設定啟用且尚未簽約，自動重導向至合約模板頁面。

  Background:
    Given 系統中有以下用戶：
      | userId | name   | email              | role     |
      | 1      | Admin  | admin@example.com  | admin    |
      | 2      | 王小明 | wang@example.com   | customer |
    And WooCommerce 已啟用
    And 系統中有以下合約模板：
      | templateId | title    | status  |
      | 100        | 租賃合約 | publish |
    And 外掛設定如下：
      | key                               | value |
      | display_contract_before_checkout  | true  |
      | chosen_contract_template          | 100   |

  # ========== 前置（參數）==========

  Rule: 前置（狀態）- display_contract_before_checkout 必須為 true
    Example: 設定關閉時不重導向
      Given 外掛設定 "display_contract_before_checkout" 為 false
      When 用戶 "王小明" 進入結帳頁面
      Then 用戶正常停留在結帳頁面，不重導向

  Rule: 前置（狀態）- 必須在結帳頁面
    Example: 不在結帳頁面時不重導向
      Given 外掛設定 "display_contract_before_checkout" 為 true
      When 用戶 "王小明" 進入商品頁面
      Then 不觸發任何重導向

  Rule: 前置（狀態）- 已簽約則不重導向
    Example: URL 帶有 is_signed=yes 時不重導向
      Given 用戶 "王小明" 進入結帳頁面，URL 帶有 "is_signed=yes"
      Then 用戶正常停留在結帳頁面，不重導向

  # ========== 後置（狀態）==========

  Rule: 後置（狀態）- 重導向至合約模板頁面
    Example: 成功重導向至合約簽署頁面
      Given 用戶 "王小明" 進入結帳頁面
      And URL 不帶有 "is_signed=yes"
      When template_redirect hook 觸發
      Then 用戶被重導向至合約模板頁面
      And 重導向 URL 為 "/contract_template/100" 並帶有 "redirect=checkout"
