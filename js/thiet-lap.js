// ============================================================
// thiet-lap.js — ADMIN TỰ KHAI BÁO TRƯỜNG, KHÔNG CẦN AI VIẾT SQL
//
// App dùng chung cho nhiều trường (xem js/cauhinh.js). Trước đây muốn sửa tên
// hiệu trưởng, thêm người vào danh sách mời, hay dựng một trường mới thì đều
// phải nhờ người viết SQL — với bốn trường thì đó là nút thắt cổ chai.
// Tệp này thêm ba thẻ vào màn Quản trị:
//     🚀 Cài đặt        · trường mới đi theo từng bước, kể cả nhận quyền admin
//     ⚙️ Thông tin trường · sửa thẳng bảng cau_hinh
//     ✉️ Danh sách mời   · sửa bảng moi_tai_khoan, dán được cả bảng từ Excel
//
// Cần chạy trước: sql/36-quan-tri-tu-phuc-vu.sql
// RLS phía máy chủ là hàng rào thật (chỉ admin ghi được cau_hinh và
// moi_tai_khoan); mọi kiểm tra ở đây chỉ để giao diện đỡ bày ra thứ vô ích.
// ============================================================
(function () {
  'use strict';

  function thoat(s) { return window.thoatHTML ? window.thoatHTML(s) : String(s || ''); }
  function may() { return window.MAY_CHU; }
  function bao(t) { if (window.notify) window.notify(t); else window.alert(t); }

  // Mất mạng giữa chừng thì lời hứa bị TỪ CHỐI chứ không trả về {error}, nên
  // nhánh .then không chạy và ô cứ đứng mãi ở "Đang tải…" — người dùng tưởng
  // máy treo, ngồi chờ. Mọi lượt tải đầu của ba thẻ đều đi qua hàm này.
  function bao_hong(hop, viec) {
    return function (e) {
      hop.innerHTML = '<div class="the-thong-bao">Không gọi được máy chủ khi ' + thoat(viec) +
        '.<br><small>' + thoat((e && e.message) || e) + '</small><br><br>' +
        'Thầy cô kiểm tra đường mạng rồi bấm lại thẻ này.</div>';
    };
  }

  // ══════════════════════════════════════════════════════════
  // CÁC Ô CỦA MÀN THÔNG TIN TRƯỜNG
  // [khoá trong bảng cau_hinh, nhãn, lời chỉ dẫn]
  // ══════════════════════════════════════════════════════════
  var NHOM_O = [
    { ten: '🏫 Nhận diện trường', o: [
      ['ten_truong', 'Tên trường', 'Ghi đầy đủ: Trường Tiểu học …'],
      ['dia_chi', 'Địa chỉ', 'vd: Xã Quỳ Hợp, Tỉnh Nghệ An'],
      ['dia_danh', 'Địa danh trong văn bản', 'Đứng trước ngày tháng: "Quỳ Hợp, ngày … tháng …"'],
      ['slogan', 'Khẩu hiệu', 'Hiện ở trang chủ, để trống cũng được']
    ] },
    { ten: '🏛 Cơ quan quản lý', o: [
      ['don_vi_chu_quan', 'Đơn vị chủ quản — VIẾT HOA', 'Đứng ở tiêu đề văn bản (NĐ 30). vd: UBND XÃ QUỲ HỢP'],
      ['chu_quan_thuong', 'Đơn vị chủ quản — viết thường', 'Dùng khi nằm giữa câu văn. vd: UBND xã Quỳ Hợp'],
      ['co_quan_quan_ly', 'Cơ quan quản lý ngành — VIẾT HOA', 'vd: SỞ GIÁO DỤC VÀ ĐÀO TẠO NGHỆ AN'],
      ['co_quan_thuong', 'Cơ quan quản lý ngành — viết thường', 'vd: Sở Giáo dục và Đào tạo Nghệ An']
    ] },
    { ten: '👤 Lãnh đạo và liên hệ', o: [
      ['hieu_truong', 'Hiệu trưởng', 'Họ tên đầy đủ — ký ở cuối các bản Word'],
      ['pho_hieu_truong', 'Phó Hiệu trưởng', ''],
      ['dien_thoai', 'Điện thoại', 'Vào mục thông tin chung của Báo cáo tự đánh giá'],
      ['email_truong', 'Thư điện tử của trường', '']
    ] },
    { ten: '🏅 Chuẩn quốc gia', o: [
      ['muc_chuan_qg', 'Mức ĐANG đạt', 'Gõ đúng: Mức 1 hoặc Mức 2. Chưa đạt thì để trống'],
      ['muc_tieu_chuan_qg', 'Câu mục tiêu', 'vd: Giữ vững và phát triển chuẩn quốc gia Mức độ 2']
    ] },
    { ten: '📅 Năm học', o: [
      ['moc_doi_nam_hoc', 'Mốc đổi năm học', 'Dạng ngày/tháng. Để trống = 01/08'],
      ['nam_hoc_tu_dong', 'Tự tính năm học?', 'Để trống = máy tự tính theo mốc trên. Chỉ gõ "khong" khi Sở lùi/đẩy năm học'],
      ['nam_hoc', 'Năm học ghi cứng', 'CHỈ dùng khi ô trên là "khong". vd: 2026-2027']
    ] },
    { ten: '📊 Quy mô — số dự phòng cho bản in', o: [
      ['so_lop', 'Số lớp', 'Máy đếm được từ dữ liệu thật thì luôn ưu tiên số đếm'],
      ['so_hoc_sinh', 'Số học sinh', ''],
      ['so_cbgv', 'Số cán bộ, giáo viên', ''],
      ['so_dang_vien', 'Số đảng viên chính thức',
       'Từ 30 trở lên thì lập đảng bộ cơ sở. Dưới 30 vẫn lập được nhưng phải có văn bản đồng ý của cấp uỷ cấp trên. Mô hình chọn ở thẻ 🚩 Tổ chức đảng']
    ] }
  ];

  var TEN_VAI_TRO = {
    admin: 'Quản trị', ban_giam_hieu: 'Ban giám hiệu', to_truong: 'Tổ trưởng',
    giao_vien: 'Giáo viên', nhan_vien: 'Nhân viên'
  };
  var DS_VAI_TRO = ['admin', 'ban_giam_hieu', 'to_truong', 'giao_vien', 'nhan_vien'];
  // Cơ sở dữ liệu của trường này đã có cột moi_tai_khoan.email_chinh hay chưa
  // (sql/55). Đặt lúc đọc danh sách mời, quyết định có bày cột "Gộp vào" không.
  var CO_GOP = false;

  // ══════════════════════════════════════════════════════════
  // THẺ ⚙️ THÔNG TIN TRƯỜNG
  // ══════════════════════════════════════════════════════════
  function veThongTin(hop) {
    hop.innerHTML = '<div class="the-thong-bao">Đang tải…</div>';
    may().from('cau_hinh').select('khoa,gia_tri').then(function (kq) {
      if (kq.error) {
        hop.innerHTML = '<div class="the-thong-bao">Không đọc được cấu hình: ' + thoat(kq.error.message) + '</div>';
        return;
      }
      var gt = {};
      (kq.data || []).forEach(function (d) { gt[d.khoa] = d.gia_tri || ''; });

      hop.innerHTML =
        '<div class="nhan-nho" style="margin:14px 0 10px">Những gì khai ở đây đi thẳng vào ' +
        '<b>đầu trang, chân trang và mọi bản Word</b> nhà trường xuất ra. Sửa xong bấm Lưu rồi tải lại trang.</div>' +
        NHOM_O.map(function (n) {
          return '<div class="tl-nhom"><h4>' + thoat(n.ten) + '</h4>' +
            n.o.map(function (o) {
              return '<label class="tl-o"><span class="tl-nhan">' + thoat(o[1]) + '</span>' +
                '<input type="text" data-khoa="' + o[0] + '" value="' + thoat(gt[o[0]] || '') + '">' +
                (o[2] ? '<small>' + thoat(o[2]) + '</small>' : '') + '</label>';
            }).join('') + '</div>';
        }).join('') +
        '<div class="tl-day-nut"><button class="nut-chinh" id="tl-luu-ch">💾 Lưu thông tin trường</button>' +
        '<span id="tl-bao-ch" class="tl-bao"></span></div>';

      document.getElementById('tl-luu-ch').addEventListener('click', function () {
        var nut = this, o = document.getElementById('tl-bao-ch');
        var ban = Array.prototype.slice.call(hop.querySelectorAll('input[data-khoa]')).map(function (e) {
          return { khoa: e.getAttribute('data-khoa'), gia_tri: e.value.trim() };
        });
        nut.disabled = true; o.textContent = 'Đang lưu…';
        may().from('cau_hinh').upsert(ban, { onConflict: 'khoa' }).select()
          .then(function (r) {
            nut.disabled = false;
            if (r.error) { o.textContent = '❌ ' + r.error.message; return; }
            // RLS chặn ghi thì Supabase KHÔNG trả error, chỉ trả data rỗng.
            // Không có hàng rào này thì màn hình khoe "✓ Đã lưu 0 mục" —
            // dấu ✓ trước con số 0, thầy cô yên tâm bỏ đi mà chẳng lưu được gì.
            if (!r.data || !r.data.length) {
              o.textContent = '❌ Máy chủ nhận lệnh nhưng KHÔNG lưu được mục nào — ' +
                'tài khoản đang dùng có thể không đủ quyền sửa cấu hình. Chưa có gì thay đổi.';
              return;
            }
            o.textContent = '✓ Đã lưu ' + r.data.length + ' mục — tải lại trang để thấy đổi khắp nơi';
            // Cập nhật luôn trong bộ nhớ để đầu trang đổi ngay, đỡ phải chờ F5
            var C = window.CAU_HINH;
            ban.forEach(function (b) {
              if (b.khoa === 'ten_truong' && b.gia_tri) C.TEN_TRUONG = b.gia_tri;
              if (b.khoa === 'dia_chi' && b.gia_tri) C.DIA_CHI_TRUONG = b.gia_tri;
              if (b.khoa === 'dia_danh') C.DIA_DANH = b.gia_tri;
              if (b.khoa === 'don_vi_chu_quan') C.DON_VI_CHU_QUAN = b.gia_tri;
              if (b.khoa === 'chu_quan_thuong') C.CHU_QUAN_THUONG = b.gia_tri;
              if (b.khoa === 'co_quan_quan_ly') C.CO_QUAN_QUAN_LY = b.gia_tri;
              if (b.khoa === 'co_quan_thuong') C.CO_QUAN_THUONG = b.gia_tri;
              if (b.khoa === 'hieu_truong') C.HIEU_TRUONG = b.gia_tri;
              if (b.khoa === 'muc_chuan_qg') C.MUC_CHUAN_QG = b.gia_tri;
            });
            if (window.datNhanDienTruong) window.datNhanDienTruong();
          })
          .catch(function (e) {
            nut.disabled = false;
            o.textContent = '❌ Không gọi được máy chủ: ' + ((e && e.message) || e) + ' — chưa lưu được gì.';
          });
      });
    }).catch(bao_hong(hop, 'đọc thông tin trường'));
  }

  // ══════════════════════════════════════════════════════════
  // THẺ ✉️ DANH SÁCH MỜI
  // Ai có tên ở đây thì lần đầu đăng nhập Google là VÀO THẲNG, không cần duyệt.
  // ══════════════════════════════════════════════════════════
  function veDanhSachMoi(hop) {
    hop.innerHTML = '<div class="the-thong-bao">Đang tải…</div>';
    may().from('moi_tai_khoan').select('*').order('ho_ten').then(function (kq) {
      if (kq.error) {
        hop.innerHTML = '<div class="the-thong-bao">Không đọc được danh sách mời: ' + thoat(kq.error.message) + '</div>';
        return;
      }
      var ds = kq.data || [];
      // Cột "Gộp vào" chỉ bày ra khi cơ sở dữ liệu đã có (sql/55). Bày ra ở
      // trường chưa chạy di trú thì bấm Lưu là máy chủ báo không có cột ấy,
      // và cả dòng KHÔNG lưu được — hỏng một việc đang chạy tốt.
      CO_GOP = !!(ds.length && Object.prototype.hasOwnProperty.call(ds[0], 'email_chinh'));

      hop.innerHTML =
        '<div class="nhan-nho" style="margin:14px 0 10px">Thầy cô có tên ở đây thì <b>lần đầu đăng nhập ' +
        'Google là vào thẳng</b>, không phải chờ duyệt. Bỏ tên khỏi danh sách này KHÔNG xoá tài khoản đã ' +
        'tạo — muốn chặn hẳn thì sang thẻ 👥 Tài khoản.' +
        (CO_GOP ? '<br>Một thầy cô dùng <b>hai địa chỉ thư</b> thì ghi mỗi địa chỉ một dòng, ' +
          'dòng phụ điền cột <b>Gộp vào</b> là địa chỉ chính — danh bạ sẽ hiện <b>một thẻ</b>. ' +
          'Hai người <b>trùng họ tên</b> thì để trống cột đó, đừng gộp.' : '') + '</div>' +

        '<details class="tl-dan"><summary>📋 Dán cả danh sách từ Excel</summary>' +
        '<div class="nhan-nho" style="margin:8px 0">Ở Excel bôi đen các cột theo đúng thứ tự dưới đây rồi Ctrl+C, ' +
        'bấm vào ô này và Ctrl+V. Mỗi thầy cô một dòng:<br>' +
        '<b>Email · Họ tên · Chức vụ · Tổ chuyên môn · Vai trò · Link Drive</b><br>' +
        'Thiếu cột nào cứ để trống. Vai trò bỏ trống thì mặc định là Giáo viên.</div>' +
        // Không đặt địa chỉ email mẫu vào đây: repo này công khai trên GitHub,
        // bài quét quet-app.js (mục 9) chặn mọi chuỗi trông giống email thật.
        '<textarea id="tl-o-dan" rows="6" placeholder="Email&#9;Họ tên&#9;Chức vụ&#9;Tổ chuyên môn&#9;Vai trò&#9;Link Drive"></textarea>' +
        '<button class="nut-chinh" id="tl-nap-dan">⬇ Nạp vào danh sách</button>' +
        '<span id="tl-bao-dan" class="tl-bao"></span></details>' +

        '<div class="cuon-ngang"><table class="bang-quan-tri nho"><thead><tr>' +
        '<th>Email</th><th>Họ tên</th><th>Chức vụ</th><th>Tổ</th><th>Vai trò</th><th>Link Drive</th>' +
        (CO_GOP ? '<th>Gộp vào</th>' : '') + '<th></th>' +
        '</tr></thead><tbody id="tl-than-moi">' +
        ds.map(dongMoi).join('') +
        '</tbody></table></div>' +
        '<div class="tl-day-nut"><button class="nut-phu" id="tl-them-dong">➕ Thêm một dòng</button>' +
        '<span class="nhan-nho">Tổng: <b>' + ds.length + '</b> người</span></div>';

      gan(hop);
    }).catch(bao_hong(hop, 'đọc danh sách mời'));
  }

  function dongMoi(m) {
    var id = m && m.id ? m.id : '';
    function o(cot, gt, rong) {
      return '<td><input type="text" data-cot="' + cot + '" value="' + thoat(gt || '') +
        '"' + (rong ? ' style="min-width:' + rong + '"' : '') + '></td>';
    }
    return '<tr data-id="' + id + '">' +
      o('email', m && m.email, '15em') +
      o('ho_ten', m && m.ho_ten, '11em') +
      o('chuc_vu', m && m.chuc_vu, '9em') +
      o('to_chuyen_mon', m && m.to_chuyen_mon, '7em') +
      '<td><select data-cot="vai_tro">' + DS_VAI_TRO.map(function (v) {
        return '<option value="' + v + '"' + ((m && m.vai_tro) === v ? ' selected' : '') +
          (!m && v === 'giao_vien' ? ' selected' : '') + '>' + TEN_VAI_TRO[v] + '</option>';
      }).join('') + '</select></td>' +
      o('link_drive', m && m.link_drive, '11em') +
      (CO_GOP ? o('email_chinh', m && m.email_chinh, '13em') : '') +
      '<td><button class="tl-luu-moi">Lưu</button>' +
      (id ? '<button class="tl-xoa-moi">Xoá</button>' : '') + '</td></tr>';
  }

  function docDong(tr) {
    var b = {};
    Array.prototype.slice.call(tr.querySelectorAll('[data-cot]')).forEach(function (e) {
      b[e.getAttribute('data-cot')] = String(e.value || '').trim();
    });
    return b;
  }

  function gan(hop) {
    var than = document.getElementById('tl-than-moi');

    document.getElementById('tl-them-dong').addEventListener('click', function () {
      than.insertAdjacentHTML('afterbegin', dongMoi(null));
      ganDong(than.firstElementChild, hop);
      than.firstElementChild.querySelector('input').focus();
    });

    Array.prototype.slice.call(than.querySelectorAll('tr')).forEach(function (tr) { ganDong(tr, hop); });

    // ── Dán cả bảng từ Excel ──
    document.getElementById('tl-nap-dan').addEventListener('click', function () {
      var o = document.getElementById('tl-bao-dan');
      var vb = document.getElementById('tl-o-dan').value;
      var dong = vb.split(/\r?\n/).map(function (d) { return d.trim(); }).filter(Boolean);
      if (!dong.length) { o.textContent = 'Chưa dán gì cả.'; return; }

      var ban = [], hong = [];
      dong.forEach(function (d, i) {
        var c = d.split('\t');
        // Dán từ Word hay từ trang web thì có khi ra dấu chấm phẩy thay vì tab
        if (c.length < 2) c = d.split(/\s*;\s*/);
        var email = String(c[0] || '').trim().toLowerCase();
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { hong.push('dòng ' + (i + 1) + ': "' + d.slice(0, 30) + '"'); return; }
        var vt = String(c[4] || '').trim();
        if (DS_VAI_TRO.indexOf(vt) < 0) vt = 'giao_vien';
        ban.push({
          email: email,
          ho_ten: String(c[1] || '').trim() || null,
          chuc_vu: String(c[2] || '').trim() || null,
          to_chuyen_mon: String(c[3] || '').trim() || null,
          vai_tro: vt,
          link_drive: String(c[5] || '').trim() || null
        });
      });

      if (!ban.length) { o.textContent = '❌ Không dòng nào có email hợp lệ.'; return; }
      var nut = this; nut.disabled = true; o.textContent = 'Đang nạp ' + ban.length + ' dòng…';
      may().from('moi_tai_khoan').upsert(ban, { onConflict: 'email' }).select()
        .then(function (r) {
          nut.disabled = false;
          if (r.error) { o.textContent = '❌ ' + r.error.message; return; }
          if (!r.data || !r.data.length) {
            o.textContent = '❌ Máy chủ nhận lệnh nhưng KHÔNG nạp được dòng nào — ' +
              'thường là do tài khoản không đủ quyền sửa danh sách mời. Danh sách chưa đổi.';
            return;
          }
          bao('Đã nạp ' + r.data.length + ' người vào danh sách mời.' +
            (hong.length ? '\n\nBỏ qua ' + hong.length + ' dòng không có email hợp lệ:\n' + hong.join('\n') : ''));
          veDanhSachMoi(document.getElementById('qt-than'));
        })
        .catch(function (e) {
          nut.disabled = false;
          o.textContent = '❌ Không gọi được máy chủ: ' + ((e && e.message) || e);
        });
    });
  }

  function ganDong(tr, hop) {
    var luu = tr.querySelector('.tl-luu-moi');
    if (luu) luu.addEventListener('click', function () {
      var b = docDong(tr), id = tr.getAttribute('data-id');
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(b.email)) { bao('Email chưa đúng dạng.'); return; }
      Object.keys(b).forEach(function (k) { if (b[k] === '') b[k] = null; });
      b.email = b.email.toLowerCase();
      if (b.email_chinh) {
        b.email_chinh = b.email_chinh.toLowerCase();
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(b.email_chinh)) {
          bao('Cột "Gộp vào" phải là một địa chỉ thư, hoặc để trống.'); return;
        }
        // Trỏ về chính mình thì danh bạ không gộp được với ai, mà nhìn vào bảng
        // lại tưởng đã khai xong.
        if (b.email_chinh === b.email) {
          bao('Cột "Gộp vào" đang ghi chính địa chỉ của dòng này. Để trống nếu ' +
            'đây là địa chỉ chính.'); return;
        }
      }
      luu.disabled = true; luu.textContent = '…';
      var lenh = id
        ? may().from('moi_tai_khoan').update(b).eq('id', id).select()
        : may().from('moi_tai_khoan').upsert([b], { onConflict: 'email' }).select();
      lenh.then(function (r) {
        luu.disabled = false;
        if (r.error) { luu.textContent = 'Lỗi!'; bao('Không lưu được: ' + r.error.message); setTimeout(function () { luu.textContent = 'Lưu'; }, 2500); return; }
        // RLS chặn ghi → không có error, chỉ data rỗng. Không bắt thì nút hiện
        // "Đã lưu ✓" trong khi cơ sở dữ liệu không có gì đổi.
        if (!r.data || !r.data.length) {
          luu.textContent = 'Lỗi!';
          bao('Máy chủ nhận lệnh nhưng KHÔNG dòng nào được ghi — tài khoản đang dùng ' +
            'có thể không đủ quyền sửa danh sách mời. Dòng này CHƯA được lưu.');
          setTimeout(function () { luu.textContent = 'Lưu'; }, 2500);
          return;
        }
        luu.textContent = 'Đã lưu ✓';
        if (!id && r.data && r.data[0]) tr.setAttribute('data-id', r.data[0].id);
        setTimeout(function () { luu.textContent = 'Lưu'; }, 2500);
      }).catch(function (e) {
        luu.disabled = false; luu.textContent = 'Lưu';
        bao('Không gọi được máy chủ: ' + ((e && e.message) || e) + ' — chưa lưu được gì.');
      });
    });

    var xoa = tr.querySelector('.tl-xoa-moi');
    if (xoa) xoa.addEventListener('click', function () {
      var b = docDong(tr);
      if (!window.confirm('Bỏ ' + b.email + ' khỏi danh sách mời?\n\n' +
        'Tài khoản đã tạo KHÔNG bị xoá — người này vẫn đăng nhập được như cũ. ' +
        'Chỉ là từ nay ai đăng nhập bằng email này lần đầu sẽ phải chờ duyệt.')) return;
      xoa.disabled = true;
      may().from('moi_tai_khoan').delete().eq('id', tr.getAttribute('data-id')).select()
        .then(function (r) {
          if (r.error) { xoa.disabled = false; bao('Không xoá được: ' + r.error.message); return; }
          // .select() ở trên là để bắt đúng cảnh RLS chặn: không error, 0 dòng.
          // Thiếu nó thì dòng biến mất khỏi màn hình còn CSDL vẫn nguyên.
          if (!r.data || !r.data.length) {
            xoa.disabled = false;
            bao('Máy chủ nhận lệnh nhưng KHÔNG xoá dòng nào — tài khoản đang dùng ' +
              'có thể không đủ quyền. Người này VẪN còn trong danh sách mời.');
            return;
          }
          tr.parentNode.removeChild(tr);
        })
        .catch(function (e) { xoa.disabled = false; bao('Không gọi được máy chủ: ' + ((e && e.message) || e)); });
    });
  }

  // ══════════════════════════════════════════════════════════
  // THẺ 🚀 CÀI ĐẶT — trường mới đi theo từng bước
  // ══════════════════════════════════════════════════════════
  function veCaiDat(hop) {
    hop.innerHTML = '<div class="the-thong-bao">Đang kiểm tra…</div>';
    may().rpc('tinh_trang_cai_dat').then(function (r) {
      if (r.error) {
        hop.innerHTML = '<div class="the-thong-bao">Chưa kiểm tra được tình trạng cài đặt.<br>' +
          '<small>' + thoat(r.error.message) + '</small><br><br>' +
          'Thường là do chưa chạy <b>sql/36-quan-tri-tu-phuc-vu.sql</b> trên cơ sở dữ liệu của trường.</div>';
        return;
      }
      var t = r.data || {};
      var buoc = [
        ['Khai thông tin trường', t.co_ten_truong,
          t.so_cau_hinh_trong ? 'Còn ' + t.so_cau_hinh_trong + ' mục để trống' : 'Đã khai đủ', 'tt'],
        ['Khai cơ sở / điểm trường', t.so_co_so > 0,
          (t.so_co_so || 0) + ' cơ sở', 'cs'],
        ['Mời tài khoản cho cán bộ, giáo viên', t.so_moi > 0,
          (t.so_moi || 0) + ' người trong danh sách mời', 'moi'],
        ['Có lớp và học sinh', t.so_lop > 0,
          (t.so_lop || 0) + ' lớp · ' + (t.so_hoc_sinh || 0) + ' học sinh', '']
      ];
      var xong = buoc.filter(function (b) { return b[1]; }).length;

      hop.innerHTML =
        '<div class="nhan-nho" style="margin:14px 0 10px">Bảng này cho biết trường đã khai xong đến đâu. ' +
        'Bấm vào từng dòng để đi tới nơi khai.</div>' +
        '<div class="tl-tien-do"><b>' + xong + '/' + buoc.length + '</b> bước đã xong</div>' +
        '<div class="tl-buoc">' + buoc.map(function (b, i) {
          return '<div class="tl-mot-buoc ' + (b[1] ? 'xong' : 'chua') + '"' +
            (b[3] ? ' data-di-toi="' + b[3] + '" role="button" tabindex="0"' : '') + '>' +
            '<span class="tl-dau">' + (b[1] ? '✓' : (i + 1)) + '</span>' +
            '<span class="tl-viec"><b>' + thoat(b[0]) + '</b><br><small>' + thoat(b[2]) + '</small></span>' +
            (b[3] ? '<span class="tl-mui">›</span>' : '') + '</div>';
        }).join('') + '</div>' +
        '<div class="nhan-nho" style="margin-top:14px">Lớp và học sinh nạp hàng loạt bằng tệp SQL vì thường ' +
        'vài trăm dòng — phần này nhờ người dựng hệ thống làm giúp.</div>';

      Array.prototype.slice.call(hop.querySelectorAll('[data-di-toi]')).forEach(function (e) {
        e.addEventListener('click', function () { window.moQuanTri(e.getAttribute('data-di-toi')); });
        e.addEventListener('keydown', function (k) {
          if (k.key === 'Enter' || k.key === ' ') { k.preventDefault(); window.moQuanTri(e.getAttribute('data-di-toi')); }
        });
      });
    }).catch(bao_hong(hop, 'kiểm tra tình trạng cài đặt'));
  }

  // Đăng ký ba thẻ. Đặt 🚀 Cài đặt lên đầu để trường mới thấy ngay việc phải làm.
  window.qtTabPhu = window.qtTabPhu || [];
  window.qtTabPhu.push({ ma: 'cd', ten: '🚀 Cài đặt', ve: veCaiDat });
  window.qtTabPhu.push({ ma: 'tt', ten: '⚙️ Thông tin trường', ve: veThongTin });
  window.qtTabPhu.push({ ma: 'moi', ten: '✉️ Danh sách mời', ve: veDanhSachMoi });
})();
