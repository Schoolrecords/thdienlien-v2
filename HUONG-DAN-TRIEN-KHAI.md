# HƯỚNG DẪN TRIỂN KHAI — thdienlien-v2

> ⚠️ **CẬP NHẬT 22/8/2026 — thầy Chung bỏ hẳn tên miền `tieuhocdienlien.com`.**
> Địa chỉ chính thức nay là **https://dienlien.quantrisotruonghoc.com** (mỗi trường một
> tên miền con của cổng chung). Các đoạn dưới đây nhắc `tieuhocdienlien.com` là lịch sử
> triển khai cũ, giữ để tra ngược; đừng làm theo cho trường mới.

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
5. **Tên miền riêng (đã làm 11/8/2026)** — địa chỉ chính thức là **https://tieuhocdienlien.com**
   Địa chỉ `schoolrecords.github.io/thdienlien-v2/` vẫn chạy, tự chuyển hướng về tên miền riêng.
   Xem cấu hình DNS ở mục cuối tài liệu này.

## Bước 2 — Tạo dự án Supabase (10 phút)
1. Vào supabase.com → đăng nhập bằng Gmail trường → **New project**: tên `th-dien-lien`, region **Singapore**, gói **Free**.
2. Vào **SQL Editor**, dán và chạy LẦN LƯỢT TỪNG FILE (mỗi lượt một file, **đúng thứ tự số**) trong thư mục `thdienlien-v2-tailieu/sql/`.
   **Chạy đủ cả 19 file** — app phụ thuộc bắt buộc vào 10 (cơ sở, sáp nhập), 14 (năm học tự động), 15 (mức chuẩn QG), 16–17 (bảo mật), 19 (số liệu 3 năm):

   | Nhóm | File | Nội dung |
   |---|---|---|
   | Nền | `01` → `05` | nền tảng · danh mục hồ sơ · tiêu chí TT57 · học sinh TT27 · tự đánh giá |
   | Bổ sung | `06` → `07` | seed tài khoản · quét Drive |
   | Chuẩn hoá | `08` → `09` | chuẩn hoá danh mục đợt 1 và 2 |
   | Sáp nhập | `10` | cơ sở · trường tiền thân · lớp học |
   | Nạp dữ liệu | `11` → `13` | link Drive · link từ Sheet sống · 863 học sinh |
   | Chỉnh | `14` → `15` | năm học tự động · mức chuẩn QG lên Mức 2 |
   | Bảo mật | `16` → `17` | bịt lỗ ghi số liệu · thu hồi quyền `anon` |
   | Đối chiếu | `18` | tra link CBGV (chỉ đọc, chạy khi cần) |
   | Số liệu | `19` | chốt hàm gộp số liệu 3 năm |

3. Sau file 03, chạy câu kiểm tra cuối file — nội hàm phải ra **0 dòng lệch**.
   Các file 16, 17, 19 cũng có câu kiểm tra ở cuối — mọi dòng phải ra `OK`.
4. ⚠️ **KHÔNG chạy lại `01`, `10`, `12` trên CSDL đã dùng thật** — chúng sẽ đè ngược cấu hình Ban giám hiệu đã sửa tay. Chỉ chạy khi dựng mới.
5. ⚠️ **KHÔNG chạy lại `08`, `09`** sau khi đã dựng cây thư mục Drive theo mã minh chứng — hai file này đánh lại toàn bộ mã, chạy lại là mã lệch với tên thư mục.

## Bước 3 — Bật đăng nhập Google (10 phút)
1. Supabase → Authentication → Sign In / Up → Google → bật, chép **Callback URL**.
2. console.cloud.google.com → tạo OAuth Client (Web): JavaScript origins gồm **cả ba**
   `https://tieuhocdienlien.com`, `https://www.tieuhocdienlien.com`, `https://schoolrecords.github.io`;
   Redirect URI = Callback URL vừa chép.
3. Dán Client ID + Secret về Supabase; đặt Site URL = `https://tieuhocdienlien.com`.
4. Supabase → Authentication → URL Configuration → **Redirect URLs** thêm:
   `https://tieuhocdienlien.com/**`, `https://www.tieuhocdienlien.com/**`,
   `https://schoolrecords.github.io/thdienlien-v2/**`.
   Thiếu bước này thì nút đăng nhập Google báo `redirect_uri_mismatch`.

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

## Tên miền riêng — cấu hình DNS (làm 11/8/2026)

Địa chỉ chính thức: **https://tieuhocdienlien.com**
Nhà đăng ký: **Mắt Bão** (ns1/ns2.matbao.com) — hết hạn 05/01/2027.

Bản ghi DNS đang đặt (Chi tiết dịch vụ → Bản ghi DNS):

| Host | Loại | Giá trị | TTL |
|---|---|---|---|
| `@` | A | `185.199.108.153` `185.199.109.153` `185.199.110.153` `185.199.111.153` | 3600 |
| `www` | CNAME | `schoolrecords.github.io.` | 3600 |
| `@` | TXT | `google-site-verification=Tu95Tg...` (di sản Google Sites, để nguyên) | 3600 |

Phía GitHub: file **`CNAME`** ở gốc repo chứa đúng một dòng `tieuhocdienlien.com`,
Settings → Pages tự nhận, **Enforce HTTPS đã bật**, chứng chỉ cấp cho cả apex lẫn `www`.

⚠️ **Đừng xóa file `CNAME`** — xóa là tên miền riêng mất, trang tụt về địa chỉ github.io.

Ba lối vào đều dẫn về một chỗ:
- `http://tieuhocdienlien.com` → 301 → `https://tieuhocdienlien.com` ✅
- `https://www.tieuhocdienlien.com` → 301 → apex ✅
- `https://schoolrecords.github.io/thdienlien-v2/` → 301 → apex ✅

`www` trước đây trỏ về Google Sites `sites.google.com/view/tieuhocdienlien` — bản ghi đó
đã xóa. Trang Google Sites cũ vẫn còn, truy cập thẳng bằng địa chỉ sites.google.com.

## ⚠️ Quy tắc an toàn (bài học 10/8/2026)
- Repo này **tuyệt đối không chứa**: file Excel dữ liệu, ảnh chữ ký/dấu, mật khẩu, danh sách học sinh, link Drive nội bộ.
- File seed nhân sự/học sinh + tài liệu làm việc → repo **private** `thdienlien-v2-tailieu`.
- Mỗi lần sửa code phải đổi `?v=` trong index.html (chống cache điện thoại).
