@ignore
Feature: 建立合約（客戶簽署合約）

  客戶在合約模板前端頁面填寫欄位、簽名後送出，透過 AJAX 建立一筆合約紀錄。

  Background:
    Given 系統中有以下用戶：
      | userId | name   | email              | role     |
      | 1      | Admin  | admin@example.com  | admin    |
      | 2      | 王小明 | wang@example.com   | customer |
    And 系統中有以下合約模板：
      | templateId | title      | status  | seal_url                        |
      | 100        | 租賃合約   | publish | https://example.com/seal.png    |
    And 外掛設定如下：
      | key                    | value              |
      | emails                 | admin@example.com  |
      | ajax_signed_title      | 已收到您的合約簽屬 |
      | ajax_signed_description| 審閱需要3~5天      |

  # ========== 前置（參數）==========

  Rule: 前置（參數）- nonce 必須有效
    Example: nonce 無效時回傳錯誤
      Given 用戶 "王小明" 在合約模板 "租賃合約" 的前端頁面
      When 用戶送出合約，但 nonce 為無效值
      Then 系統回傳錯誤：
        | title                         | description                        |
        | OOPS! 合約簽屬中發生錯誤!     | nonce 錯誤或過期，請重新整理頁面   |
      And 不會建立任何合約紀錄

  Rule: 前置（參數）- contract_template_id 為必填
    Example: 缺少 contract_template_id 時回傳錯誤
      Given 用戶 "王小明" 在合約模板前端頁面
      When 用戶送出合約，但未帶 contract_template_id
      Then 系統回傳錯誤：
        | code       | message                                       |
        | sign_error | Missing required params: contract_template_id  |

  # ========== 後置（狀態）==========

  Rule: 後置（狀態）- 合約建立後狀態為 pending
    Example: 成功簽署合約
      Given 用戶 "王小明" 在合約模板 "租賃合約" 的前端頁面
      When 用戶填寫以下欄位並送出：
        | name            | value            |
        | user_name       | 王小明           |
        | user_phone      | 0912345678       |
        | user_address    | 台北市信義區     |
        | contract_amount | 50000            |
      And 用戶已完成簽名
      And 系統截圖合約頁面
      Then 系統建立一筆合約：
        | 屬性               | 值                                     |
        | post_type          | contract                               |
        | post_status        | pending                                |
        | post_author        | 2                                      |
        | contract_template_id | 100                                  |
        | user_name          | 王小明                                 |
      And 截圖上傳成功，screenshot_url 存入 post_meta
      And 用戶 IP 存入 client_ip post_meta

  Rule: 後置（狀態）- 觸發 power_contract_contract_created action
    Example: 合約建立後觸發 hook
      Given 用戶 "王小明" 成功簽署合約
      Then 系統觸發 action "power_contract_contract_created"，帶有新合約 ID 與參數
      And 系統寄送通知信至 "admin@example.com"

  Rule: 後置（狀態）- 有 order_id 時更新訂單 is_signed meta
    Example: 帶有訂單 ID 的合約簽署
      Given 系統中有以下 WooCommerce 訂單：
        | orderId | customer | total  |
        | 500     | 王小明   | 50000  |
      And 用戶 "王小明" 在合約模板 "租賃合約" 的前端頁面，URL 帶有 order_id=500 和 redirect=thankyou
      When 用戶填寫欄位並送出
      Then 系統建立合約，post_meta 包含 _order_id=500
      And 訂單 #500 的 meta "is_signed" 更新為 "yes"
      And 系統回傳 redirect_url 指向訂單的感謝頁面

  Rule: 後置（狀態）- 訪客也可簽署合約
    Example: 未登入用戶簽署合約
      Given 一位未登入的訪客在合約模板 "租賃合約" 的前端頁面
      When 訪客填寫以下欄位並送出：
        | name      | value      |
        | user_name | 匿名用戶   |
      Then 系統建立合約，post_author 為 0
      And post_title 包含 "匿名用戶" 且不包含 "user_id"
