# System

## 描述

Power Contract 外掛的內部系統角色。監聽合約生命週期事件（狀態變更），觸發對應的 WordPress action hook。負責合約建立後的自動通知信寄送。

## 關鍵屬性

- 監聽 `transition_post_status` hook 觸發生命週期事件
- 觸發 `power_contract_contract_created` action
- 觸發 `power_contract_contract_pending` action
- 觸發 `power_contract_contract_approved` action
- 觸發 `power_contract_contract_rejected` action
- 合約建立後自動寄送通知信（`wp_mail`）給設定中的收件人
