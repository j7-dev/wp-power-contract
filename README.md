# Power Contract | 我的 WordPress 外掛
一句話講完 Power Contract :

> WordPress 線上簽合約 & 審批 外掛，您可以創建多個合約模板，帶入多種欄位，把網址丟給您的客人，讓他們線上簽合約。


## 使用流程

<br><br><br>

### 1. 創建合約模板

![image](https://github.com/user-attachments/assets/316d9574-a50f-4457-9629-6365ee29aa42)

 - 下方有可以使用的 shortcode ，點擊複製貼上
 - 右方可以上傳公司合約章，不同合約模板可以搭配不同印章，您有多間公司也OK


#### ❓ 怎麼調整版面 & 公司章位置

 - Power Contract 可以接入各編輯器，像是 `傳統編輯器`、`區塊編輯器`、`Elementor` 等，你可以用你熟悉的工具調整版面
 - Shortcode 都可以設置 `class`、`id`，所以如果你更習慣寫 `css`, `javascript`，也可以自行調整
 - 支持任意 `input name` 名稱，在未衝突的情況都會存入 `post_meta`
 - 如果 input 的 shortcode 手動填入 `value` ，則會變成 `readonly`，且不能編輯


#### ❓ 怎麼調整合約模板版面
你可以複製 `wp-content/plugins/power-contract/inc/templates/single-contract_template.php` 到 `wp-content/themes/{您的佈景主題或子主題}/single-contract_template.php` ，並且修改

`wp-content/plugins/power-contract/inc/templates/single-contract_template.php` 是合約模板的最小可運作模板，建議與專業人士或作者討論如何修改

### 2. 將合約模板網址傳給您的客戶查閱

![image](https://github.com/user-attachments/assets/b6f3bb32-76b1-49d0-a849-9b0d5030249b)

此時欄位是不能編輯的

### 3. 客戶查閱後，開始簽約

點擊`繼續`，欄位都會變成黃底高亮，且可以編輯

![image](https://github.com/user-attachments/assets/7613b18c-ad5c-47a5-9ad0-728163cfc8f0)

![image](https://github.com/user-attachments/assets/cf735c01-feeb-4ddf-9db5-5b132170546d)

如果有未填欄位或者未簽名，會有提示
![image](https://github.com/user-attachments/assets/82f8c036-36fd-484a-885c-4b6d6be25838)

### 4. 客戶送出
![image](https://github.com/user-attachments/assets/fd3d363c-fadc-4384-8373-5c4875076b1a)

預設是沒有按鈕的，客戶簽約完只能關閉視窗

#### ❓ 怎麼調整彈窗訊息以及按鈕

後台設定可以調整訊息以及按鈕文字連結

![image](https://github.com/user-attachments/assets/e7844ec6-c2ce-4c67-b958-ba1d4fc4adfb)


### 5. 管理員審閱合約以及核准合約

![image](https://github.com/user-attachments/assets/a9167b70-cccd-42d2-96e3-61cf8201a7e3)

顯示
1. 合約欄位資料
2. 用戶簽名
3. 用戶簽約當下的 IP 地址
4. 用戶簽約當下的 合約截圖

可以批量核准或批量待審核

![image](https://github.com/user-attachments/assets/6c62e1b6-6a1d-43ee-9fba-e3fa6a379b89)

<br /><br /><br />

<hr />

### ⛏️ 多語系工作仍在進行中

![image](https://github.com/user-attachments/assets/a966a721-feb8-451c-83f7-685ec56282f1)


