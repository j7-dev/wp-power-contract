# WooCommerce

## 描述

外部系統角色。提供電商結帳流程、訂單管理功能。Power Contract 可選擇性與 WooCommerce 整合，在結帳前或感謝頁前插入合約簽署流程，並在訂單列表/我的帳號中顯示關聯合約。

## 關鍵屬性

- 提供 `template_redirect` hook 用於結帳前重導向
- 提供 `woocommerce_get_checkout_order_received_url` filter 用於感謝頁前重導向
- 提供訂單資料（客戶姓名、Email、電話、地址）可自動帶入合約欄位
- 訂單列表支援自訂欄位顯示關聯合約
- 我的帳號 > 訂單詳情頁面可顯示合約截圖與狀態
- WooCommerce 為選配，外掛在未安裝 WooCommerce 時仍可獨立運作
