# HƯỚNG DẪN TRIỂN KHAI — thdienlien-v2

> ⚠️ **CẬP NHẬT 29/8/2026 — địa chỉ duy nhất là `quantrisotruonghoc.com`.**
> Mỗi trường một tên miền con của cổng chung: `dienlien.` · `chaudinh.` · `thanlinh1.` …
> Phát hành qua **Cloudflare Pages** (dự án `quantriso`), mở tên miền bằng lệnh —
> xem `quan-tri/MO-TRUONG-MOI.md` mục B5, KHÔNG bấm tay nữa.
>
> Tên miền `tieuhocdienlien.com` đã thôi dùng, mọi chỗ hướng dẫn đã gỡ.
> Chỗ duy nhất còn nhắc nó là mục **Di sản** ở cuối tài liệu — đọc trước khi
> đụng vào tệp `CNAME`.

> Dành cho thầy Chung. Toàn bộ 0 đồng, không cần thẻ ngân hàng. Khoảng 30 phút.
> Chưa làm các bước dưới thì trang vẫn chạy **chế độ xem thử** với dữ liệu mẫu — dùng để duyệt giao diện.

## Bước 1 — Đưa trang lên mạng (5 phút)
1. Đăng nhập GitHub tài khoản `Schoolrecords` → **New repository** → tên `thdienlien-v2` → Public → Create.
2. Trên máy, mở thư mục `thdienlien-v2` này, chạy:
   ```
   git remote add origin https://github.com/Schoolrecords/thdienlien-v2.git
   git push -u origin main
   ```
   (Hoặc nhờ Claude đẩy giúp sau khi repo đã tạo.)
3. Kho mã nối sẵn với **Cloudflare Pages** (dự án `quantriso`) — `git push` xong là Pages
   tự dựng lại, khoảng một phút sau trang mới lên sóng.
4. Địa chỉ chung: **https://quantrisotruonghoc.com**
5. **Tên miền con của từng trường** mở bằng lệnh, không bấm tay:
   ```
   node quan-tri/cloudflare-ten-mien.js --nhan <nhãn>            # soi
   node quan-tri/cloudflare-ten-mien.js --nhan <nhãn> --dong-y   # làm thật
   ```
   Token Cloudflare đã khai sẵn ở biến môi trường `CLOUDFLARE_API_TOKEN` (hạn 28/2/2027).
   Thêm xong tên miền trả `522` vài chục giây là bình thường — Cloudflare chưa cấp xong
   chứng chỉ, đợi rồi thử lại, đừng chạy lại lệnh.

## Bước 2 — Tạo dự án Supabase (10 phút)

> ⚠️ **MỤC NÀY LÀ LỊCH SỬ dựng Diễn Liên lần đầu (dải 01→19).** Từ 8/2026,
> dựng trường MỚI thì **đừng dán từng tệp** — dùng bộ lõi gộp
> `thdienlien-v2-tailieu/sql/trien-khai/00-LOI-TRUONG-MOI.sql` (dán MỘT lần,
> đã gồm tới sql/62) theo đúng bảng bước trong `DA-CHAY-O-DAU.md` cùng thư mục.
> Kho SQL nay đã vượt xa 19 tệp; riêng `07` chạy LẺ trên CSDL đã vá `62` sẽ
> báo lỗi kiểu trả về — đó là chủ ý, xem đầu hai tệp ấy.

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
2. console.cloud.google.com → OAuth Client (Web): JavaScript origins
   `https://quantrisotruonghoc.com`; Redirect URI = Callback URL vừa chép.
   🔴 **Đây là việc tay DUY NHẤT còn lại khi mở một trường** — Google không cho làm bằng lệnh.
   Client secret thì lấy bằng nút **Reveal** ở một trường đang chạy, **đừng Add secret**:
   Google chỉ cho 2 secret và không cho xem lại.
3. Dán Client ID + Secret về Supabase; đặt Site URL = `https://quantrisotruonghoc.com`.
4. Supabase → Authentication → URL Configuration → **Redirect URLs** thêm:
   `https://quantrisotruonghoc.com/**` và tên miền con của trường,
   ví dụ `https://thanlinh1.quantrisotruonghoc.com/**`.
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

## Di sản — vì sao repo còn tệp `CNAME` (đọc trước khi xoá)

Tên miền cũ `tieuhocdienlien.com` đã **thôi dùng**: không khai ở đâu nữa, không dạy trong
tài liệu nữa, trường mới tuyệt đối không dùng.

> 🔴 **Nhưng nó VẪN ĐANG PHÁT, và đó là chủ ý.** Kiểm 29/8/2026: trả `200`, chạy trên
> **GitHub Pages** (`Server: GitHub.com`), nội dung **trùng khít từng byte** với
> `quantrisotruonghoc.com` — cùng một kho mã phát ra hai nơi. Giữ nó sống chỉ để
> **bookmark của 37 thầy cô Diễn Liên không chết**.

Cái giữ nó sống là tệp **`CNAME`** ở gốc repo (đúng một dòng `tieuhocdienlien.com`) cộng
với bản ghi DNS bên Mắt Bão (hết hạn 05/01/2027).

⚠️ **Xoá `CNAME` là tắt tên miền cũ ngay lập tức** — ai còn bookmark sẽ gặp 404, không có
lối chuyển hướng nào đỡ. Muốn tắt thì **báo thầy cô chuyển sang**
`https://quangchau1.quantrisotruonghoc.com` trước, đợi một thời gian rồi mới xoá.
Chừng nào chưa làm việc đó thì **để nguyên tệp này**, đừng thấy nó lạc lõng mà dọn.

> 🔴 **Cập nhật 30/8/2026 — `dienlien.quantrisotruonghoc.com` KHÔNG CÒN.** Thầy Chung chốt
> gỡ hẳn để khỏi lẫn lộn sau khi trường thành Quảng Châu 1: đã xoá bản ghi DNS, custom
> domain bên Pages và tệp nhãn trong `cau-hinh/ten-mien/`. Địa chỉ duy nhất của trường nay
> là **`quangchau1.quantrisotruonghoc.com`**. Đừng lấy `dienlien…` làm đích chuyển sang nữa.

## ⚠️ Quy tắc an toàn (bài học 10/8/2026)
- Repo này **tuyệt đối không chứa**: file Excel dữ liệu, ảnh chữ ký/dấu, mật khẩu, danh sách học sinh, link Drive nội bộ.
- File seed nhân sự/học sinh + tài liệu làm việc → repo **private** `thdienlien-v2-tailieu`.
- Mỗi lần sửa code phải đổi `?v=` trong index.html (chống cache điện thoại).
