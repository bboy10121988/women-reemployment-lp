# 報名表單後端

Google Apps Script 網頁應用程式，接收落地頁的報名 POST 並寫入試算表。

- 腳本專案 `1fW57KhgRvBHtzIUjDkhJyG1_X03FwMDgk7XJw7kbZTnHyKJW_6pfxM-W`
- 編輯器 https://script.google.com/home/projects/1fW57KhgRvBHtzIUjDkhJyG1_X03FwMDgk7XJw7kbZTnHyKJW_6pfxM-W/edit
- 端點 https://script.google.com/macros/s/AKfycbxBxHWznIrvXBnC1VlpmR65OETp-6opxiJ9U_DiMBtlXgxQAjx4R9zsT7Islk531JHVVA/exec
- 試算表 https://docs.google.com/spreadsheets/d/11J7WufKxG6Mjo4uRq5NE4RQxK7H8ifdOl4dLHk_uBKM/edit
- 部署設定 存取權「任何人」、執行身分「部署者 textsence.ai@gmail.com」

`Code.gs` 為部署中程式碼的同步副本。改完要重新建立版本與部署才會生效。

## 行為

- 驗證姓名、手機、場次、投保狀況四個必填欄位，手機須符合 09 開頭十碼。
- 同一手機號碼五分鐘內重複送出視為誤觸，回傳成功但不重複寫入。
- 手機號碼前置單引號寫入，避免試算表吃掉前導零。
- 以 LockService 序列化寫入，避免同時送出造成覆蓋。
- 任何失敗都寫入「錯誤紀錄」分頁。前端讀不到後端例外，沒有這個分頁問題會完全隱形。

## 前端配合

落地頁必須讀到回應中的 `ok: true` 才顯示報名成功。不可改用 `no-cors`，
那會讓 403 之類的失敗看起來像成功，報名資料靜靜消失。
