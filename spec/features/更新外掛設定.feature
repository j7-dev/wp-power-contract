@ignore
Feature: 更新外掛設定

  管理員在設定頁面修改外掛設定，包含簽署完成提示、WooCommerce 整合選項、通知信收件人。

  Background:
    Given 系統中有以下用戶：
      | userId | name  | email             | role  |
      | 1      | Admin | admin@example.com | admin |

  # ========== 前置（參數）==========

  Rule: 前置（狀態）- 必須有 manage_options 權限
    Example: 無權限的用戶無法存取設定頁面
      Given 一位角色為 "subscriber" 的用戶嘗試存取設定頁面
      Then 系統拒絕存取

  # ========== 後置（狀態）==========

  Rule: 後置（狀態）- General 設定儲存
    Example: 更新簽署完成 Modal 設定
      Given 管理員 "Admin" 在設定頁面的 "General" 分頁
      When 管理員填寫以下設定並儲存：
        | 欄位                     | 值                         |
        | ajax_signed_title        | 感謝您的簽署               |
        | ajax_signed_description  | 我們將盡快審閱您的合約     |
        | ajax_signed_btn_text     | 繼續結帳                   |
        | ajax_signed_btn_link     | https://example.com/checkout |
      Then wp_options 中 "power_contract_settings" 更新為對應值

  Rule: 後置（狀態）- WooCommerce 設定儲存
    Example: 啟用結帳前顯示合約
      Given 管理員 "Admin" 在設定頁面的 "Woocommerce" 分頁
      And WooCommerce 已啟用
      When 管理員勾選以下選項並儲存：
        | 欄位                              | 值   |
        | display_order_info                | true |
        | display_contract_before_checkout  | true |
        | display_contract_after_checkout   | false|
        | chosen_contract_template          | 100  |
      Then wp_options 中 "power_contract_settings" 更新為對應值

  Rule: 後置（狀態）- WooCommerce 未安裝時分頁停用
    Example: WooCommerce 未安裝
      Given WooCommerce 未安裝
      When 管理員 "Admin" 在設定頁面
      Then "Woocommerce" 分頁顯示為 disabled 狀態

  Rule: 後置（狀態）- Email 設定儲存
    Example: 設定多個通知信收件人
      Given 管理員 "Admin" 在設定頁面的 "Email" 分頁
      When 管理員設定以下收件人並儲存：
        | email               |
        | admin@example.com   |
        | hr@example.com      |
        | legal@example.com   |
      Then wp_options 中 "power_contract_settings" 的 emails 欄位包含 3 個 email
