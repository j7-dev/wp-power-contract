@ignore @command
Feature: 儲存合約模板公司章

  管理員在合約模板編輯頁面上傳公司章圖片，每個模板可搭配不同的公司章。

  Background:
    Given 系統中有以下用戶：
      | userId | name  | email             | role  |
      | 1      | Admin | admin@example.com | admin |
    And 系統中有以下合約模板：
      | templateId | title    | status  | seal_url |
      | 100        | 租賃合約 | publish |          |

  Rule: 前置（參數）- seal_nonce 必須有效

    Example: nonce 驗證失敗時不儲存公司章
      Given 管理員 "Admin" 在合約模板 #100 的編輯頁面
      When 管理員上傳公司章圖片，但 seal_nonce 無效
      Then 系統不會更新 seal_url

  Rule: 前置（狀態）- 當前用戶必須有 edit_post 權限

    Example: 無 edit_post 權限的用戶無法上傳公司章
      Given 一位角色為 "subscriber" 的用戶嘗試儲存合約模板
      Then 系統不會更新 seal_url

  Rule: 後置（狀態）- 傳統編輯器上傳公司章後 seal_url 應更新為圖片 URL

    Example: 成功上傳公司章（傳統編輯器）後 seal_url 更新
      Given 管理員 "Admin" 在合約模板 #100 的編輯頁面
      When 管理員在「Seal Image」區塊上傳 "company_seal.png"
      And 點擊儲存
      Then 合約模板 #100 的 seal_url post_meta 更新為上傳圖片的 URL

  Rule: 後置（狀態）- 區塊編輯器儲存公司章 URL 後 seal_url 應更新

    Example: 成功儲存公司章 URL（區塊編輯器）後 meta 更新
      Given 管理員 "Admin" 使用區塊編輯器編輯合約模板 #100
      When REST API 請求包含 meta.seal_url 為 "https://example.com/new_seal.png"
      Then 合約模板 #100 的 seal_url post_meta 更新為 "https://example.com/new_seal.png"
