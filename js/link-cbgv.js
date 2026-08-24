// ============================================================
// link-cbgv.js — NẠP ĐƯỜNG DẪN THƯ MỤC DRIVE CỦA TỪNG CBGV-NV
// Thẻ "🔗 Link hồ sơ CBGV" trong màn Quản trị.
//
// Ghi vào cột moi_tai_khoan.link_drive — chính là cột mà màn "Hồ sơ CBGV-NV"
// đọc để hiện nút 📁 bên cạnh mỗi người (xem napCBGV trong du-lieu-sql.js).
//
// Hai lối nạp:
//   1. Sửa từng dòng — cho trường hợp bổ sung một người.
//   2. DÁN HÀNG LOẠT từ Google Sheet (tab DSGV) — dán 2 cột bất kỳ có chứa
//      email/họ tên và link. Đây là lối chính: 37 người nạp trong một lần dán.
//
// Nguyên tắc: DÁN → XEM TRƯỚC → mới GHI. Không bao giờ ghi thẳng, vì dán nhầm
// cột là hỏng cả bảng mà không biết đường lần.
// ============================================================
(function () {
  'use strict';

  function thoat(s) { return window.thoatHTML ? window.thoatHTML(s) : String(s || ''); }
  function batLoi(e) { window.notify('Không lưu được: ' + ((e && e.message) || e)); }

  // Bỏ dấu tiếng Việt + gom khoảng trắng — để khớp họ tên khi thiếu email
  function khongDau(s) {
    return String(s || '')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'D')
      .toLowerCase().replace(/\s+/g, ' ').trim();
  }

  var LA_EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/;
  var LA_LINK  = /https?:\/\/\S+/i;

  var DS = [];        // danh sách NGƯỜI (đã gộp các dòng cùng email_chinh)
  var XEM_TRUOC = null; // kết quả phân tích ô dán, chờ xác nhận

  // Cột email_chinh chỉ có ở trường đã chạy sql/55. Hỏi cột không tồn tại là
  // PostgREST trả lỗi cho CẢ câu → hỏi lần hai bỏ cột đó ra (cùng cách
  // docDanhSachMoi trong du-lieu-sql.js), đừng bắt mọi trường di trú trước.
  var COT = 'email,ho_ten,chuc_vu,vai_tro,link_drive,la_ky_thuat';
  function taiDS() {
    var may = window.MAY_CHU;
    return may.from('moi_tai_khoan').select(COT + ',email_chinh').order('ho_ten')
      .then(function (r) {
        if (!r.error) return r;
        // Chỉ lùi khi đúng là thiếu cột; lỗi khác để nổi lên.
        if (!/column .* does not exist/i.test(r.error.message || '')) return r;
        return may.from('moi_tai_khoan').select(COT).order('ho_ten');
      })
      .then(function (r) {
        if (r.error) throw r.error;
        DS = gopNguoi((r.data || []).filter(function (m) { return !m.la_ky_thuat; }));
        return DS;
      });
  }

  // 🔴 GỘP DÒNG PHỤ VÀO DÒNG CHÍNH theo email_chinh — CÙNG CÁCH với napCBGV ở
  //    du-lieu-sql.js. Một người hai địa chỉ (thầy Chung: gmail + nghean.edu.vn)
  //    là HAI dòng trong moi_tai_khoan. Bản đầu đếm và hiện thành hai người:
  //    băng đầu thẻ báo "38/39 đã có link" trong khi ai cũng có rồi; tệ hơn,
  //    hai dòng cùng họ tên bị coi là "trùng tên" nên dán theo tên KHÔNG nhận
  //    ra chính người đó. Chỉ gộp khi nhà trường KHAI RÕ email_chinh, tuyệt
  //    đối không đoán theo họ tên (Châu Đình có hai cô Nguyễn Thị Hà).
  //    Mỗi người mang `emails` — ghi link là ghi cho TẤT CẢ địa chỉ, vì
  //    napCBGV lấy link của dòng nào có trước, không biết dòng nào là chính.
  function gopNguoi(ds) {
    var theoKhoa = {}, ra = [];
    ds.forEach(function (m) {
      // `emails` giữ NGUYÊN chữ hoa/thường như trong bảng: chúng được đem đi
      // ghi bằng `.in('email', …)` mà Postgres so `=` phân biệt hoa thường —
      // hạ thường ở đây là dòng seed tay có chữ hoa ghi trượt (0 dòng đổi).
      // Chữ thường CHỈ dùng làm khoá gộp và khoá tra cứu.
      var email = String(m.email || '').trim();
      var k = String(m.email_chinh || m.email || '').trim().toLowerCase();
      var g = theoKhoa[k];
      if (!g) {
        g = theoKhoa[k] = { khoa: k, ho_ten: m.ho_ten, chuc_vu: m.chuc_vu, vai_tro: m.vai_tro,
                            link_drive: m.link_drive || '', emails: [] };
        ra.push(g);
      }
      // Địa chỉ chính đứng đầu danh sách để hiện lên trước.
      if (email.toLowerCase() === k) g.emails.unshift(email); else g.emails.push(email);
      if (!g.link_drive) g.link_drive = m.link_drive || '';
      if (!g.chuc_vu)    g.chuc_vu    = m.chuc_vu;
      if (!g.ho_ten)     g.ho_ten     = m.ho_ten;
    });
    return ra;
  }

  // ── Phân tích ô dán: mỗi dòng tìm 1 email (hoặc họ tên) + 1 link ──
  function phanTich(chu) {
    var khop = [], hong = [];
    var theoEmail = {}, theoTen = {}, tenTrung = {};
    DS.forEach(function (m) {
      m.emails.forEach(function (e) { theoEmail[e.toLowerCase()] = m; });
      var t = khongDau(m.ho_ten);
      // 🔴 Hai người TRÙNG HỌ TÊN thì không được khớp theo tên: trước đây dòng
      //    sau đè dòng trước, nên link thư mục của cô này lặng lẽ gán cho cô kia.
      //    Châu Đình có hai cô Nguyễn Thị Hà. Thà báo "không nhận ra là ai" để
      //    thầy cô dán kèm địa chỉ thư, còn hơn gán nhầm mà không ai biết.
      if (theoTen[t]) tenTrung[t] = 1; else theoTen[t] = m;
    });
    Object.keys(tenTrung).forEach(function (t) { delete theoTen[t]; });

    String(chu || '').split(/\r?\n/).forEach(function (dong) {
      if (!dong.trim()) return;
      var link = (dong.match(LA_LINK) || [])[0] || '';
      var mail = (dong.match(LA_EMAIL) || [])[0] || '';
      if (!link) { hong.push({ dong: dong, vi: 'không thấy đường dẫn http' }); return; }

      var nguoi = mail ? theoEmail[mail.toLowerCase()] : null;

      // Không có email → thử khớp họ tên: lấy phần chữ trước đường dẫn
      var ten = '';
      if (!nguoi) {
        var phanChu = dong.slice(0, dong.indexOf(link)).replace(/[\t;,|]+/g, ' ');
        ten = khongDau(phanChu);
        nguoi = theoTen[ten];
      }
      if (!nguoi) {
        hong.push({
          dong: dong,
          vi: mail ? 'email ' + mail + ' không có trong danh sách mời'
            : (tenTrung[ten] ? 'trường có hai người trùng họ tên này — dán kèm địa chỉ thư mới biết là ai'
                             : 'không nhận ra là ai')
        });
        return;
      }
      // Dòng sau đè dòng trước nếu trùng người
      khop = khop.filter(function (k) { return k.khoa !== nguoi.khoa; });
      khop.push({ khoa: nguoi.khoa, emails: nguoi.emails, ho_ten: nguoi.ho_ten, link: link, cu: nguoi.link_drive || '' });
    });

    return { khop: khop, hong: hong };
  }

  // ── Vẽ thẻ ──
  function veTab(hop) {
    hop.innerHTML = '<div class="the-thong-bao">Đang tải…</div>';

    taiDS().then(function () {
      var coLink = DS.filter(function (m) { return m.link_drive; }).length;

      hop.innerHTML =
        '<div class="hd-kiem ' + (coLink === DS.length ? 'xanh' : 'vang') + '">' +
        '<b>' + coLink + ' / ' + DS.length + '</b> cán bộ, giáo viên, nhân viên đã có đường dẫn thư mục hồ sơ. ' +
        (coLink === DS.length ? '✔ Đủ cả.' : 'Còn <b>' + (DS.length - coLink) + '</b> người chưa có.') +
        '</div>' +

        // ── Khối dán hàng loạt ──
        '<div class="the-thong-bao" style="margin-bottom:16px">' +
        '<div class="nhan-nho" style="text-align:left;margin-bottom:8px">Nạp hàng loạt từ Google Sheet</div>' +
        '<p style="font-size:14px;color:var(--chu-mo);margin-bottom:10px">' +
        'Mở Sheet <b>THDienLien_05.2026</b> → tab <b>DSGV</b> → bôi đen <b>cột Gmail và cột Link</b> ' +
        '(kéo chọn cả hai, kể cả các cột ở giữa cũng không sao) → Ctrl+C → dán vào ô dưới. ' +
        'Mỗi dòng chỉ cần có <b>một email</b> và <b>một đường dẫn http</b> là máy tự nhận ra ai với ai. ' +
        'Không có email thì máy thử khớp theo <b>họ tên</b>.</p>' +
        '<textarea id="lc-dan" rows="7" style="width:100%;font:inherit;font-size:13px;padding:10px;' +
        'border:1px solid var(--vien);border-radius:9px" ' +
        'placeholder="Dán vào đây…&#10;vd:  nguyenvana@gmail.com&#9;https://drive.google.com/drive/folders/1AbC…"></textarea>' +
        '<div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">' +
        '<button class="lc-xem">Xem trước</button>' +
        '<button class="lc-xoa" style="background:#eef1f6;color:var(--chu)">Xoá ô dán</button>' +
        '</div>' +
        '<div id="lc-ket-qua" style="margin-top:12px"></div>' +
        '</div>' +

        // ── Bảng từng người ──
        '<div class="dau-muc" style="text-align:left;margin:20px 0 10px">' +
        '<div class="nhan-nho">Sửa từng người</div></div>' +
        '<div class="cuon-ngang"><table class="bang-quan-tri nho"><thead><tr>' +
        '<th>Họ và tên</th><th>Chức vụ</th><th>Đường dẫn thư mục Drive</th><th></th>' +
        '</tr></thead><tbody>' +
        DS.map(function (m) {
          return '<tr data-khoa="' + thoat(m.khoa) + '">' +
            '<td><b>' + thoat(m.ho_ten) + '</b><br><small style="color:var(--chu-mo)">' +
            thoat(m.emails.join(' · ')) + '</small></td>' +
            '<td>' + thoat(m.chuc_vu || '') + '</td>' +
            '<td><input data-link type="url" style="min-width:260px" value="' +
            thoat(m.link_drive || '') + '" placeholder="https://drive.google.com/drive/folders/…"></td>' +
            '<td>' + (m.link_drive
              ? '<a class="nut-drive" target="_blank" rel="noopener" href="' + thoat(m.link_drive) + '">📁</a> '
              : '') +
            '<button class="lc-luu">Lưu</button></td></tr>';
        }).join('') + '</tbody></table></div>';

      gan(hop);
    }).catch(function (e) {
      hop.innerHTML = '<div class="the-thong-bao">Không đọc được danh sách mời: ' + thoat((e && e.message) || e) + '</div>';
    });
  }

  function gan(hop) {
    var oDan = hop.querySelector('#lc-dan');
    var oKq = hop.querySelector('#lc-ket-qua');

    hop.querySelector('.lc-xoa').addEventListener('click', function () {
      oDan.value = ''; oKq.innerHTML = ''; XEM_TRUOC = null;
    });

    hop.querySelector('.lc-xem').addEventListener('click', function () {
      XEM_TRUOC = phanTich(oDan.value);
      var k = XEM_TRUOC.khop, h = XEM_TRUOC.hong;
      if (!k.length && !h.length) { oKq.innerHTML = '<div class="hd-kiem vang">Ô dán đang trống.</div>'; return; }

      var doiKhac = k.filter(function (x) { return x.cu && x.cu !== x.link; });

      oKq.innerHTML =
        '<div class="hd-kiem ' + (h.length ? 'vang' : 'xanh') + '">' +
        'Nhận ra <b>' + k.length + '</b> người' +
        (h.length ? ' · <b>' + h.length + '</b> dòng không nhận ra' : '') +
        (doiKhac.length ? ' · <b style="color:var(--canh)">' + doiKhac.length + ' người đang có link khác sẽ bị thay</b>' : '') +
        '</div>' +
        (k.length
          ? '<div class="cuon-ngang" style="max-height:260px;overflow:auto"><table class="bang-quan-tri nho">' +
            '<thead><tr><th>Họ và tên</th><th>Đường dẫn sẽ ghi</th><th>Hiện tại</th></tr></thead><tbody>' +
            k.map(function (x) {
              return '<tr><td>' + thoat(x.ho_ten) + '</td>' +
                '<td style="word-break:break-all;font-size:12px">' + thoat(x.link) + '</td>' +
                '<td>' + (x.cu
                  ? (x.cu === x.link
                    ? '<span style="color:var(--ok)">giống, bỏ qua</span>'
                    : '<span style="color:var(--canh)">sẽ bị thay</span>')
                  : '<span style="color:var(--chu-mo)">trống</span>') + '</td></tr>';
            }).join('') + '</tbody></table></div>'
          : '') +
        (h.length
          ? '<div class="nhan-nho" style="text-transform:none;letter-spacing:0;color:var(--thieu);margin-top:10px">' +
            'Dòng không nhận ra:<br>' + h.slice(0, 8).map(function (x) {
              return '• ' + thoat(x.dong.slice(0, 90)) + ' — <i>' + thoat(x.vi) + '</i>';
            }).join('<br>') + (h.length > 8 ? '<br>… và ' + (h.length - 8) + ' dòng nữa' : '') + '</div>'
          : '') +
        (k.length ? '<div style="margin-top:12px"><button class="lc-ghi">Ghi ' + k.length + ' đường dẫn vào cơ sở dữ liệu</button></div>' : '');

      var nutGhi = oKq.querySelector('.lc-ghi');
      if (nutGhi) nutGhi.addEventListener('click', function () { ghiHangLoat(hop, nutGhi); });
    });

    // Lưu từng dòng
    Array.prototype.slice.call(hop.querySelectorAll('.lc-luu')).forEach(function (nut) {
      nut.addEventListener('click', function () {
        var dong = nut.closest('tr');
        var khoa = dong.getAttribute('data-khoa');
        var nguoi = DS.filter(function (m) { return m.khoa === khoa; })[0];
        if (!nguoi) { batLoi(new Error('không tìm thấy người này trong danh sách')); return; }
        var link = dong.querySelector('[data-link]').value.trim() || null;
        nut.textContent = '…';
        // Ghi cho MỌI địa chỉ của người này (xem gopNguoi). RLS chặn thì
        // update trả 0 dòng mà không lỗi — phải coi data rỗng là thất bại.
        window.MAY_CHU.from('moi_tai_khoan').update({ link_drive: link })
          .in('email', nguoi.emails).select()
          .then(function (r) {
            if (r.error || !(r.data || []).length) throw (r.error || new Error('không dòng nào đổi — có thể không đủ quyền'));
            nut.textContent = 'Đã lưu ✓';
            lamTuoiDanhBa();
            setTimeout(function () { veTab(hop); }, 800);
          })
          .catch(function (e) { nut.textContent = 'Lưu'; batLoi(e); });
      });
    });
  }

  function ghiHangLoat(hop, nut) {
    if (!XEM_TRUOC || !XEM_TRUOC.khop.length) return;
    // Chỉ ghi người thật sự đổi — khỏi đụng dòng đã đúng
    var canGhi = XEM_TRUOC.khop.filter(function (x) { return x.cu !== x.link; });
    if (!canGhi.length) { window.notify('Không có gì phải đổi — tất cả đã đúng sẵn.'); return; }

    nut.disabled = true;
    var xong = 0, loi = [];
    var lanLuot = canGhi.reduce(function (chuoi, x) {
      return chuoi.then(function () {
        return window.MAY_CHU.from('moi_tai_khoan').update({ link_drive: x.link })
          .in('email', x.emails).select()
          .then(function (r) {
            if (r.error || !(r.data || []).length) loi.push(x.ho_ten);
            else xong++;
            nut.textContent = 'Đang ghi… ' + (xong + loi.length) + '/' + canGhi.length;
          }, function () {
            // Lời hứa bị từ chối (đứt mạng) — không có r để đọc, ghi nhận lỗi
            // rồi đi tiếp, đừng để cả chuỗi dừng mà nút kẹt ở "Đang ghi…".
            loi.push(x.ho_ten);
            nut.textContent = 'Đang ghi… ' + (xong + loi.length) + '/' + canGhi.length;
          });
      });
    }, Promise.resolve());

    lanLuot.then(function () {
      window.notify('Đã ghi ' + xong + ' đường dẫn' +
        (loi.length ? ' · ' + loi.length + ' dòng lỗi: ' + loi.slice(0, 5).join(', ') +
          (loi.length > 5 ? '…' : '') : '') + '.');
      XEM_TRUOC = null;
      lamTuoiDanhBa();
      veTab(hop);
    });
  }

  // Trước đây phải dặn "Tải lại trang (Ctrl+F5)" vì napDuLieuThat() có cờ chặn
  // chạy lại. Nay du-lieu-sql.js có napLaiDuLieuThat() — gọi nó để màn Hồ sơ
  // CBGV hiện nút 📁 ngay. Không có (bản web cũ) thì nhắc như trước.
  function lamTuoiDanhBa() {
    if (window.napLaiDuLieuThat) {
      window.napLaiDuLieuThat().then(null, function () { /* du-lieu-sql.js đã treo băng đỏ */ });
      return;
    }
    window.notify('Tải lại trang (Ctrl+F5) để màn Hồ sơ CBGV hiện nút 📁.');
  }

  window.qtTabPhu = window.qtTabPhu || [];
  window.qtTabPhu.push({ ma: 'lc', ten: '🔗 Link hồ sơ CBGV', ve: veTab });
})();
