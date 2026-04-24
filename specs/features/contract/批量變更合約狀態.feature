@ignore @command
Feature: 批量變更合約狀態

  管理員在合約列表頁勾選多筆合約，透過 Bulk Actions 批量變更狀態。

  Background:
    Given 系統中有以下用戶：
      | userId | name  | email             | role  |
      | 1      | Admin | admin@example.com | admin |
    And 系統中有以下合約：
      | contractId | title                | status   |
      | 201        | 租賃合約 合約 - 張三 | pending  |
      | 202        | 租賃合約 合約 - 李四 | pending  |
      | 203        | 租賃合約 合約 - 王五 | approved |

  Rule: 前置（參數）- action 必須為 change-to-pending、change-to-approved 或 change-to-rejected 之一

    Example: 執行合法的 change-to-approved 批量操作後合約狀態變更
      Given 管理員 "Admin" 已登入後台
      When 管理員在合約列表勾選合約 #201 和 #202
      And 選擇 Bulk Action "Change to Approved"
      Then 合約 #201 和 #202 的 post_status 皆變更為 "approved"

  Rule: 後置（狀態）- 批量變更為 pending 後應顯示成功提示

    Example: 批量將合約改為待審核後顯示提示訊息
      Given 管理員在合約列表勾選合約 #203
      When 選擇 Bulk Action "Change to Pending"
      Then 合約 #203 的 post_status 變更為 "pending"
      And 頁面顯示提示訊息 "1 contract changed to Pending."

  Rule: 後置（狀態）- 批量變更為 approved 後應顯示成功提示

    Example: 批量核准多筆合約後顯示提示訊息
      Given 管理員在合約列表勾選合約 #201 和 #202
      When 選擇 Bulk Action "Change to Approved"
      Then 合約 #201 和 #202 的 post_status 皆變更為 "approved"
      And 頁面顯示提示訊息 "2 contracts changed to Approved."

  Rule: 後置（狀態）- 批量變更為 rejected 後合約狀態應變更

    Example: 批量拒絕合約後狀態變更為 rejected
      Given 管理員在合約列表勾選合約 #201 和 #202
      When 選擇 Bulk Action "Change to Rejected"
      Then 合約 #201 和 #202 的 post_status 皆變更為 "rejected"
