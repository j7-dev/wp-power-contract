@ignore
Feature: 核准合約

  管理員在合約編輯頁面點擊「Approve」按鈕，將合約狀態改為 approved。

  Background:
    Given 系統中有以下用戶：
      | userId | name   | email              | role     |
      | 1      | Admin  | admin@example.com  | admin    |
      | 2      | 王小明 | wang@example.com   | customer |
    And 系統中有以下合約：
      | contractId | title                     | status  | post_author |
      | 200        | 租賃合約 合約 - 王小明    | pending | 2           |

  # ========== 前置（參數）==========

  Rule: 前置（參數）- post_id 必須為有效的合約
    Example: post_id 對應的文章不是 contract 類型
      Given 管理員 "Admin" 已登入後台
      When 管理員對一篇 post_type 為 "post" 的文章執行核准操作
      Then 系統不會變更該文章的狀態
      And 重導向至合約列表頁

  # ========== 後置（狀態）==========

  Rule: 後置（狀態）- 合約狀態變更為 approved
    Example: 成功核准合約
      Given 管理員 "Admin" 已登入後台
      And 合約 #200 狀態為 "pending"
      When 管理員點擊合約 #200 的「Approve」按鈕
      Then 合約 #200 的 post_status 變更為 "approved"
      And 系統觸發 action "power_contract_contract_approved"
      And 管理員被重導向至 "/wp-admin/edit.php?post_type=contract"

  Rule: 後置（狀態）- 已核准的合約再次核准不會出錯
    Example: 對已核准的合約再次核准
      Given 合約 #200 狀態為 "approved"
      When 管理員點擊合約 #200 的「Approve」按鈕
      Then 合約 #200 的 post_status 維持為 "approved"
      And 管理員被重導向至合約列表頁
