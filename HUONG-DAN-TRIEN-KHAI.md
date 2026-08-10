# HƯỚNG DẪN TRIỂN KHAI — thdienlien-v2

> Dành cho thầy Chung. Toàn bộ 0 đồng, không cần thẻ ngân hàng. Khoảng 30 phút.
> Chưa làm các bước dưới thì trang vẫn chạy **chế độ xem thử** với dữ liệu mẫu — dùng để duyệt giao diện.

## Bước 1 — Đưa trang lên GitHub Pages (5 phút)
1. Đăng nhập GitHub tài khoản `Schoolrecords` → **New repository** → tên `thdienlien-v2` → Public → Create.
2. Trên máy, mở thư mục `thdienlien-v2` này, chạy:
   ```
   git remote add origin https://github.com/Schoolrecords/thdienlien-v2.git
   git push -u origin main
   ```
   (Hoặc nhờ Claude đẩy giúp sau khi repo đã tạo.)
3. Vào repo → Settings → Pages → Source: `main`, thư mục `/ (root)` → Save.
4. Sau 1-2 phút, trang chạy tại: `https://schoolrecords.github.io/thdienlien-v2/`

## Bước 2 — Tạo dự án Supabase (10 phút)
1. Vào supabase.com → đăng nhập bằng Gmail trường → **New project**: tên `th-dien-lien`, region **Singapore**, gói **Free**.
2. Vào **SQL Editor**, dán và chạy LẦN LƯỢT TỪNG FILE (mỗi lượt một file, đúng thứ tự) trong thư mục `thdienlien-v2-tailieu/sql/`:
   `01-nen-tang.sql` → `02-danh-muc-ho-so.sql` → `03-tieu-chi-tt57.sql` → `04-hoc-sinh-tt27.sql` → `05-tu-danh-gia.sql`
3. Sau file 03, chạy câu kiểm tra cuối file — nội hàm phải ra **0 dòng lệch**.

## Bước 3 — Bật đăng nhập Google (10 phút)
1. Supabase → Authentication → Sign In / Up → Google → bật, chép **Callback URL**.
2. console.cloud.google.com → tạo OAuth Client (Web): JavaScript origins `https://schoolrecords.github.io`, Redirect URI = Callback URL vừa chép.
3. Dán Client ID + Secret về Supabase; đặt Site URL = `https://schoolrecords.github.io/thdienlien-v2/`.

## Bước 4 — Danh sách mời
Supabase → SQL Editor: nạp danh sách CBGV-NV vào bảng `moi_tai_khoan` (file seed nằm NGOÀI repo — Claude sẽ tạo từ DSGV cũ khi thầy yêu cầu). Gmail có trong danh sách → đăng nhập lần đầu là vào được ngay đúng vai trò.

## Bước 5 — Nối trang với CSDL
Sửa 2 dòng trong `js/cauhinh.js`:
```js
DIA_CHI: 'https://<mã-dự-án>.supabase.co',   // Settings → API → Project URL
KHOA_CONG_KHAI: '<anon key>',                 // Settings → API → anon public
```
rồi `git push`. Khóa anon lộ ra ngoài cũng vô hại — mọi hàng rào nằm ở RLS phía máy chủ.

## Bước 6 — Chống Supabase "ngủ" (5 phút)
cron-job.org → tạo job mỗi ngày 1 lần, POST tới:
`https://<mã-dự-án>.supabase.co/rest/v1/rpc/con_song`
Headers: `apikey: <anon key>` và `Authorization: Bearer <anon key>`.

## ⚠️ Quy tắc an toàn (bài học 10/8/2026)
- Repo này **tuyệt đối không chứa**: file Excel dữ liệu, ảnh chữ ký/dấu, mật khẩu, danh sách học sinh, link Drive nội bộ.
- File seed nhân sự/học sinh + tài liệu làm việc → repo **private** `thdienlien-v2-tailieu`.
- Mỗi lần sửa code phải đổi `?v=` trong index.html (chống cache điện thoại).
