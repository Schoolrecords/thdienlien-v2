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

  var DS = [];        // danh sách moi_tai_khoan
  var XEM_TRUOC = null; // kết quả phân tích ô dán, chờ xác nhận

  function taiDS() {
    return window.MAY_CHU.from('moi_tai_khoan')
      .select('email,ho_ten,chuc_vu,vai_tro,link_drive,la_ky_thuat')
      .order('ho_ten')
      .then(function (r) {
        if (r.error) throw r.error;
        DS = (r.data || []).filter(function (m) { return !m.la_ky_thuat; });
        return DS;
      });
  }

  // ── Phân tích ô dán: mỗi dòng tìm 1 email (hoặc họ tên) + 1 link ──
  function phanTich(chu) {
    var khop = [], hong = [];
    var theoEmail = {}, theoTen = {};
    DS.forEach(function (m) {
      theoEmail[String(m.email || '').toLowerCase()] = m;
      theoTen[khongDau(m.ho_ten)] = m;
    });

    String(chu || '').split(/\r?\n/).forEach(function (dong) {
      if (!dong.trim()) return;
      var link = (dong.match(LA_LINK) || [])[0] || '';
      var mail = (dong.match(LA_EMAIL) || [])[0] || '';
      if (!link) { hong.push({ dong: dong, vi: 'không thấy đường dẫn http' }); return; }

      var nguoi = mail ? theoEmail[mail.toLowerCase()] : null;

      // Không có email → thử khớp họ tên: lấy phần chữ trước đường dẫn
      if (!nguoi) {
        var phanChu = dong.slice(0, dong.indexOf(link)).replace(/[\t;,|]+/g, ' ');
        nguoi = theoTen[khongDau(phanChu)];
      }
      if (!nguoi) {
        hong.push({ dong: dong, vi: mail ? 'email ' + mail + ' không có trong danh sách mời' : 'không nhận ra là ai' });
        return;
      }
      // Dòng sau đè dòng trước nếu trùng người
      khop = khop.filter(function (k) { return k.email !== nguoi.email; });
      khop.push({ email: nguoi.email, ho_ten: nguoi.ho_ten, link: link, cu: nguoi.link_drive || '' });
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
          return '<tr data-email="' + thoat(m.email) + '">' +
            '<td><b>' + thoat(m.ho_ten) + '</b><br><small style="color:var(--chu-mo)">' +
            thoat(m.email) + '</small></td>' +
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
      hop.innerHTML = '<div class="the-thong-bao">Không đọc được danh sách mời: ' + thoat(e.message) + '</div>';
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
        var email = dong.getAttribute('data-email');
        var link = dong.querySelector('[data-link]').value.trim() || null;
        nut.textContent = '…';
        window.MAY_CHU.from('moi_tai_khoan').update({ link_drive: link })
          .eq('email', email).select()
          .then(function (r) {
            if (r.error || !r.data.length) throw (r.error || new Error('không dòng nào đổi'));
            nut.textContent = 'Đã lưu ✓';
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
          .eq('email', x.email).select()
          .then(function (r) {
            if (r.error || !r.data.length) loi.push(x.ho_ten);
            else xong++;
            nut.textContent = 'Đang ghi… ' + (xong + loi.length) + '/' + canGhi.length;
          });
      });
    }, Promise.resolve());

    lanLuot.then(function () {
      // napDuLieuThat() có cờ chặn chạy lại nên gọi ở đây KHÔNG có tác dụng —
      // màn Hồ sơ CBGV chỉ hiện nút 📁 sau khi tải lại trang. Nói thẳng ra
      // thay vì để thầy cô bấm xong rồi thắc mắc sao chưa thấy gì.
      window.notify('Đã ghi ' + xong + ' đường dẫn' +
        (loi.length ? ' · ' + loi.length + ' dòng lỗi' : '') +
        '. Tải lại trang (Ctrl+F5) để màn Hồ sơ CBGV hiện nút 📁.');
      XEM_TRUOC = null;
      veTab(hop);
    });
  }

  window.qtTabPhu = window.qtTabPhu || [];
  window.qtTabPhu.push({ ma: 'lc', ten: '🔗 Link hồ sơ CBGV', ve: veTab });
})();
