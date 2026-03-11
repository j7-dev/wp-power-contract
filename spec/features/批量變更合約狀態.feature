@ignore
Feature: 批量變更合約狀態

  管理員在合約列表頁勾選多筆合約，透過 Bulk Actions 批量變更狀態。

  Background:
    Given 系統中有以下用戶：
      | userId | name   | email              | role  |
      | 1      | Admin  | admin@example.com  | admin |
    And 系統中有以下合約：
      | contractId | title                    | status   |
      | 201        | 租賃合約 合約 - 張三     | pending  |
      | 202        | 租賃合約 合約 - 李四     | pending  |
      | 203        | 租賃合約 合約 - 王五     | approved |

  # ========== 前置（參數）==========

  Rule: 前置（參數）- action 必須為合法的批量操作
    Example: 執行 change-to-approved 批量操作
      Given 管理員 "Admin" 已登入後台
      When 管理員在合約列表勾選合約 #201 和 #202
      And 選擇 Bulk Action "Change to Approved"
      Then 合約 #201 和 #202 的 post_status 皆變更為 "approved"

  # ========== 後置（狀態）==========

  Rule: 後置（狀態）- 批量變更為 pending
    Example: 批量將合約改為待審核
      Given 管理員在合約列表勾選合約 #203
      When 選擇 Bulk Action "Change to Pending"
      Then 合約 #203 的 post_status 變更為 "pending"
      And 頁面顯示提示訊息 "1 contract changed to Pending."

  Rule: 後置（狀態）- 批量變更為 approved
    Example: 批量核准合約
      Given 管理員在合約列表勾選合約 #201 和 #202
      When 選擇 Bulk Action "Change to Approved"
      Then 合約 #201 和 #202 的 post_status 皆變更為 "approved"
      And 頁面顯示提示訊息 "2 contracts changed to Approved."

  Rule: 後置（狀態）- 批量變更為 rejected
    Example: 批量拒絕合約
      Given 管理員在合約列表勾選合約 #201 和 #202
      When 選擇 Bulk Action "Change to Rejected"
      Then 合約 #201 和 #202 的 post_status 皆變更為 "rejected"
