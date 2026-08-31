# Intercom Canvas Kit App — Sheets (custom HTML/CSS) + WhatsApp handoff

Custom Messenger App cho Intercom, dùng **Canvas Kit Sheets** (iframe với
HTML/CSS/JS tự code hoàn toàn) để khớp chính xác với thiết kế của bạn — nền
teal, icon avatar tròn, chevron, nút WhatsApp xanh lá... không bị giới hạn
bởi các component có sẵn của Canvas Kit nữa.

## Luồng hoạt động

1. **Màn hình 1** (`/initialize`, hiện ngay khi Home mở) — vẫn dùng Content
   Component đơn giản: "Hi there 👋 / How can we help? / [Send us a message]".
   Nút này có action **type `sheet`** (không phải `submit`) → bấm vào sẽ mở
   1 iframe (Sheet).
2. **`/sheet`** — trả về 1 trang HTML đầy đủ (xem `sheet-template.js`), chứa:
   - Màn hình **Welcome** (chọn Existing/New Customer) — style teal khớp mockup
   - Màn hình **WhatsApp handoff** — chuyển đổi bằng JS thuần trong cùng
     iframe, không cần gọi lại server
3. **`/submit-sheet`** — được gọi khi trang HTML trong Sheet gọi
   `INTERCOM_MESSENGER_SHEET_LIBRARY.submitSheet(...)`:
   - `action: "back"` → đóng Sheet, quay về Màn hình 1 (Hi there)
   - `action: "new_customer_whatsapp"` → đóng Sheet, hiện thông báo cảm ơn
     (WhatsApp đã được mở ở tab mới từ trước đó, ngay trong file HTML)

   Nút **"Existing Customer"** và **"Continue on Intercom"** KHÔNG dùng
   `submitSheet` — vì đóng Sheet luôn bị Messenger điều hướng về Home (giới
   hạn platform). Thay vào đó, chúng gửi `window.top.postMessage(...)` để
   trang chủ (ví dụ `intercom-frontend/index.html`) tự gọi
   `Intercom("showNewMessage")` — API chính thức mở đúng màn composer thật,
   trong khi vẫn ở lại đúng conversation.

> **Vì sao đổi sang Sheets?** Cách cũ (Content Components: text/list/button)
> không cho phép tùy chỉnh màu nền, icon, bo góc... Sheets cho toàn quyền
> kiểm soát HTML/CSS/JS, đổi lại phức tạp hơn một chút về mặt kỹ thuật.

---

## 1. Chuẩn bị

- Node.js >= 18
- Tài khoản Vercel (đã liên kết GitHub)
- Tài khoản Intercom Developer Hub
- Số WhatsApp Business đã kích hoạt

---

## 2. Chạy thử local

```bash
npm install
cp .env.example .env
# điền WHATSAPP_NUMBER, để trống INTERCOM_CLIENT_SECRET khi test local

npm start
# server chạy tại http://localhost:3000
```

Test nhanh bằng curl:

```bash
curl -X POST http://localhost:3000/initialize

# Xem trang Sheet trực tiếp trong trình duyệt (mở URL này để xem giao diện):
# http://localhost:3000/sheet  (cần đổi thành GET tạm thời để xem bằng trình
# duyệt, hoặc dùng curl -X POST http://localhost:3000/sheet -d '{}' -H "Content-Type: application/json")
```

**Mẹo xem trước giao diện Sheet nhanh nhất:** mở file `sheet-template.js`,
copy phần HTML bên trong (từ `<!DOCTYPE html>` đến `</html>`) dán vào 1 file
`.html` bất kỳ rồi mở bằng trình duyệt — sẽ thấy đúng giao diện teal, có thể
bấm thử các nút (trừ phần gọi `INTERCOM_MESSENGER_SHEET_LIBRARY` sẽ báo lỗi
vì không có thư viện thật, nhưng phần chuyển màn hình New Customer vẫn xem
được).

---

## 3. Đưa lên GitHub

```bash
git init
git add .
git commit -m "Chuyen sang kien truc Sheets, khop 100% design"
git branch -M main
git remote add origin https://github.com/<username>/<ten-repo>.git
git push -u origin main
```

---

## 4. Deploy lên Vercel

1. [vercel.com/new](https://vercel.com/new) → Import Git Repository → chọn repo này.
2. Vercel tự nhận diện `vercel.json`.
3. Thêm Environment Variables trước khi Deploy:

   | Key | Value |
   |---|---|
   | `WHATSAPP_NUMBER` | Số WhatsApp Business, không dấu `+` |
   | `WHATSAPP_PREFILL_TEXT` | Nội dung tin nhắn điền sẵn (tùy chọn) |
   | `INTERCOM_CLIENT_SECRET` | Lấy ở bước 5 — có thể thêm sau rồi Redeploy |

4. Bấm **Deploy**. Từ giờ mỗi lần `git push` lên `main`, Vercel tự deploy lại.

---

## 5. Đăng ký app trong Intercom Developer Hub

1. developers.intercom.com → **New app** (hoặc mở app đã tạo trước đó).
2. **Basic Info** → copy **Client Secret** → dán vào `INTERCOM_CLIENT_SECRET` trên Vercel → **Redeploy**.
3. **Configure → Canvas Kit** → mở **"For users, leads, and visitors"**.
4. Tick **"Place on the Messenger home screen"**.
5. Điền webhook URL:
   - **Initialize flow webhook URL**: `https://<domain-vercel>.vercel.app/initialize`
   - **Submit flow webhook URL**: `https://<domain-vercel>.vercel.app/submit`
   - **Configure flow webhook URL**: để trống
   - **Submit Sheet flow webhook URL**: `https://<domain-vercel>.vercel.app/submit-sheet`

   Lưu ý: URL cho action `sheet` (mở iframe) **không cần điền tay** ở đây —
   server tự sinh ra URL này (`/sheet`) và gửi kèm trong response của
   `/initialize`, dựa trên chính domain đang chạy.

6. Bấm **Save**, bật toggle **On**.

---

## 6. Gắn app vào Messenger Home

1. Settings → Channels → Messenger → Widget → **"Customize Home with apps"** → **Add an app** → chọn app vừa tạo.
2. Bấm **Save and set live**.

---

## 7. Test trên môi trường thật

1. Mở website đã nhúng Messenger → bấm app trên Home ("Send us a message").
2. Sheet (iframe) mở ra, kiểm tra:
   - Nền teal, chữ "Welcome! 👋 Are you an existing customer or new to us?"
   - 2 card "Existing Customer" / "New Customer" có icon, subtitle, chevron
   - Bấm **Back** → Sheet đóng lại, quay về đúng "Hi there 👋"
   - Bấm **New Customer** → chuyển sang màn hình WhatsApp (vẫn trong Sheet, không đóng)
   - Bấm **Continue on WhatsApp** → tab mới mở đúng số, đúng tin nhắn điền sẵn → Sheet đóng lại

---

## Cấu trúc project

```
.
├── server.js            # 4 webhook: /initialize /submit /sheet /submit-sheet
├── sheet-template.js     # Toàn bộ HTML/CSS/JS hiển thị trong iframe (Sheet)
├── package.json
├── vercel.json
├── .env.example
├── .gitignore
└── README.md
```

## 8. Debug khi có lỗi

- **Sheet không mở / báo lỗi**: mở DevTools → Network → tìm request tới
  `/sheet`, kiểm tra status code và response có phải HTML hợp lệ không.
- **"Cannot POST /..."**: kiểm tra lại đúng URL webhook đã điền trong
  Developer Hub (đủ path `/initialize`, `/submit`, `/submit-sheet`).
- **Bấm nút trong Sheet không phản hồi**: mở Console trong DevTools khi
  Sheet đang mở, tìm lỗi liên quan tới `INTERCOM_MESSENGER_SHEET_LIBRARY`
  (có thể do script thư viện load chậm/lỗi mạng).
