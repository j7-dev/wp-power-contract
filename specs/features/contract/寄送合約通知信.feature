@ignore @command
Feature: 寄送合約通知信

  合約建立後，系統自動寄送通知 email 給設定中的收件人，讓管理員即時知道有新合約待審核。

  Background:
    Given 系統中有以下用戶：
      | userId | name   | email              | role     |
      | 1      | Admin  | admin@example.com  | admin    |
      | 2      | 王小明 | wang@example.com   | customer |
    And 系統中有以下合約模板：
      | templateId | title    | status  |
      | 100        | 租賃合約 | publish |
    And 外掛設定如下：
      | key    | value                            |
      | emails | admin@example.com,hr@example.com |

  Rule: 前置（狀態）- emails 設定必須有至少一個有效 email

    Example: 有設定收件人時系統寄送通知信
      Given 用戶 "王小明" 成功簽署合約 #300
      Then 系統寄送 email 至 "admin@example.com" 和 "hr@example.com"
      And email 主旨為 "有新的合約待審核 #300"
      And email 格式為 HTML，Content-Type 為 "text/html; charset=UTF-8"

  Rule: 後置（狀態）- email 內容應包含合約詳細資料與審核連結

    Example: 通知信內容包含合約欄位與審核連結
      Given 用戶 "王小明" 簽署合約時填寫了以下欄位：
        | name       | value      |
        | user_name  | 王小明     |
        | user_phone | 0912345678 |
      When 合約 #300 建立完成
      Then 寄出的 email body 包含「前往審核」連結，指向合約 #300 的編輯頁面
      And email body 包含合約 metabox 渲染的欄位資料
