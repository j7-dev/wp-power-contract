@ignore @query
Feature: 簽署完成顯示Modal

  客戶簽署合約後，前端顯示簽署完成 Modal，包含自訂標題、描述、按鈕。

  Background:
    Given 外掛設定如下：
      | key                     | value                            |
      | ajax_signed_title       | 已經收到您的合約合約簽屬         |
      | ajax_signed_description | 合約審閱需要3~5天，請耐心等候   |
      | ajax_signed_btn_text    | 繼續結帳                         |
      | ajax_signed_btn_link    | https://example.com/checkout     |

  Rule: 後置（回應）- 簽署成功時 Modal 應顯示成功區塊

    Example: AJAX 回傳 sign_success 時顯示成功訊息
      Given 用戶成功簽署合約
      When 前端收到 AJAX 回應 code 為 "sign_success"
      Then Modal 顯示成功區塊
      And 標題為 "已經收到您的合約合約簽屬"
      And 描述為 "合約審閱需要3~5天，請耐心等候"

  Rule: 後置（回應）- 簽署成功且有 redirect_url 時應在 3 秒後自動跳轉

    Example: 有 redirect_url 時 3 秒後自動導向
      Given 用戶成功簽署合約
      When 前端收到 AJAX 回應包含 redirect_url
      Then Modal 顯示成功區塊
      And 3 秒後自動跳轉至 redirect_url

  Rule: 後置（回應）- ajax_signed_btn_text 為空時應隱藏按鈕

    Example: 按鈕文字為空時不顯示按鈕
      Given 外掛設定 "ajax_signed_btn_text" 為空
      When 用戶成功簽署合約
      Then Modal 不顯示操作按鈕

  Rule: 後置（回應）- ajax_signed_btn_text 有值時應顯示按鈕連結

    Example: 按鈕文字有值時顯示為連結按鈕
      Given 外掛設定 "ajax_signed_btn_text" 為 "繼續結帳"
      And 外掛設定 "ajax_signed_btn_link" 為 "https://example.com/checkout"
      When 用戶成功簽署合約
      Then Modal 顯示按鈕文字為 "繼續結帳"
      And 按鈕連結為 "https://example.com/checkout"

  Rule: 後置（回應）- 簽署失敗時 Modal 應顯示錯誤區塊

    Example: AJAX 回傳非 sign_success 時顯示錯誤訊息
      Given 用戶簽署合約失敗
      When 前端收到 AJAX 回應 code 不為 "sign_success"
      Then Modal 顯示錯誤區塊
