// ============================================================
// dbcl-to.js — TỔ ĐẢM BẢO CHẤT LƯỢNG & HỒ SƠ ĐBCL
//
// Thay phần "nạp từ cơ sở dữ liệu" của màn Tổ ĐBCL bằng dữ liệu thật.
// Bảng: sql/44 (to_dbcl · thanh_vien_to_dbcl · phu_luc_dbcl).
//
// 🔑 Danh mục 9 nhóm việc và 16 phụ lục KHÔNG nằm trong cơ sở dữ liệu — đó là
//    khung cố định của tài liệu hướng dẫn ĐBCL, giữ trong js/dbcl.js và
//    truyền vào đây. Bảng chỉ giữ phần thay đổi theo trường: ai làm việc gì,
//    phụ lục nào đã có, nằm ở đâu trên Drive.
//
// ⚠️ KHÔNG ghi tên thật cán bộ giáo viên vào tệp này — repo là kho công khai.
//    Tên chỉ nằm trong cơ sở dữ liệu có phân quyền.
// ============================================================
(function () {
  'use strict';

  function thoat(s) { return window.thoatHTML ? window.thoatHTML(s) : String(s || ''); }
  function may() { return window.MAY_CHU; }
  function nam() {
    return (window.CAU_HINH || {}).NAM_HOC ||
      window.tinhNamHoc((window.CAU_HINH || {}).MOC_DOI_NAM_HOC);
  }
  function laQT() {
    var u = window.NGUOI_DUNG;
    return !!u && (u.vai_tro === 'admin' || u.vai_tro === 'ban_giam_hieu');
  }

  var TO = null;      // bản ghi to_dbcl của năm học
  var TV = [];        // thành viên
  var PL = {};        // số phụ lục → bản ghi phu_luc_dbcl
  var DA_NAP = false; // cờ RIÊNG — xem bài học mục 30.3 sổ dự án
  var DANG_TAI = false;
  var LOI = null;

  var VAI = ['Tổ trưởng', 'Tổ phó', 'Thư ký', 'Thành viên'];
  var THU_TU_VAI = { 'Tổ trưởng': 1, 'Tổ phó': 2, 'Thư ký': 3, 'Thành viên': 4 };
  var TEN_TT = {
    chua: { chu: 'Chưa có', mau: 'var(--thieu)' },
    dang: { chu: 'Đang làm', mau: '#c26a1f' },
    co:   { chu: '✔ Đã có', mau: 'var(--ok)' }
  };

  // ══════════ ĐỌC ══════════
  function nap(veLai) {
    if (!may()) { LOI = 'chua_ket_noi'; DA_NAP = true; veLai(); return; }
    DANG_TAI = true; DA_NAP = true; LOI = null; veLai();

    var N = nam();
    may().from('to_dbcl').select('*').eq('nam_hoc', N).maybeSingle()
      .then(function (r) {
        if (r.error) throw r.error;
        TO = r.data || null;
        return Promise.all([
          TO ? may().from('thanh_vien_to_dbcl').select('*').eq('to_id', TO.id).order('so_tt')
             : Promise.resolve({ data: [] }),
          may().from('phu_luc_dbcl').select('*').eq('nam_hoc', N)
        ]);
      })
      .then(function (r) {
        DANG_TAI = false;
        TV = (r[0] && r[0].data) || [];
        TV.sort(function (a, b) {
          return (THU_TU_VAI[a.vai_tro] || 9) - (THU_TU_VAI[b.vai_tro] || 9) ||
                 (a.so_tt || 0) - (b.so_tt || 0);
        });
        PL = {};
        ((r[1] && r[1].data) || []).forEach(function (p) { PL[p.so] = p; });
        veLai();
      })
      .catch(function (e) {
        DANG_TAI = false; LOI = e.message || String(e); veLai();
      });
  }

  // ══════════ GHI ══════════
  // Tổ của năm học có thể chưa tồn tại — mọi thao tác thêm thành viên đều phải
  // đi qua đây để chắc chắn có bản ghi tổ trước.
  function chacChanCoTo() {
    if (TO) return Promise.resolve(TO);
    return may().from('to_dbcl').insert({ nam_hoc: nam() }).select().maybeSingle()
      .then(function (r) {
        if (r.error) throw r.error;
        TO = r.data;
        return TO;
      });
  }

  // CHỈ ghi cột vừa đổi. Bản đầu gửi lại cả trang_thai + link_drive + ghi_chu
  // từ PL (bản chụp lúc nạp): người này đổi trạng thái, người kia dán link cùng
  // phụ lục thì lệnh sau đè bản chụp cũ lên cột người trước vừa ghi.
  // Hàng đợi ghi — cùng khuôn csvc/tcqg: hai lệnh cùng CỘT bấm nhanh mà đi
  // song song thì bản thắng là bản ĐẾN SAU ở máy chủ, không phải bản bấm sau
  // (đổi trạng thái chua→dang→co hai nhịp nhanh là DB có thể còn 'dang').
  // Nối đuôi thì thứ tự về đúng thứ tự bấm. DEM_CHO cho dedup biết đang có
  // lệnh bay — lúc đó bộ đệm chưa phản ánh lệnh vừa gửi, so nó là nuốt lệnh.
  var HANG_GHI = Promise.resolve(), DEM_CHO = 0;
  function dangGhiDo() { return DEM_CHO > 0; }
  function xepHang(viec) {
    DEM_CHO++;
    var giam = function () { DEM_CHO--; };
    var lui = HANG_GHI.then(viec, viec);
    HANG_GHI = lui.then(giam, giam);
    return lui;
  }

  function luuPhuLuc(so, thay) {
    return xepHang(function () { return luuPhuLucNgay(so, thay); });
  }
  function luuPhuLucNgay(so, thay) {
    var cu = PL[so];
    var ban = {};
    Object.keys(thay).forEach(function (k) { ban[k] = thay[k]; });
    ban.cap_nhat_boi = window.NGUOI_DUNG ? window.NGUOI_DUNG.id : null;

    var lenh;
    if (cu && cu.id) {
      lenh = may().from('phu_luc_dbcl').update(ban).eq('id', cu.id);
    } else {
      // Dòng chưa có: upsert lần đầu với khoá + cột đổi (trang_thai có default).
      ban.nam_hoc = nam(); ban.so = so;
      lenh = may().from('phu_luc_dbcl').upsert(ban, { onConflict: 'nam_hoc,so' });
    }
    return lenh.select().maybeSingle().then(function (r) {
      if (r.error) throw r.error;
      // RLS chặn update thì không lỗi mà ghi 0 dòng — coi là chưa lưu.
      if (!r.data) throw new Error('máy chủ không ghi dòng nào — có thể thầy cô không có ' +
        'quyền, hoặc dòng đã bị xoá. Tải lại trang rồi thử lại.');
      PL[so] = r.data;
      return r.data;
    });
  }

  // Sau khi lưu một ô: nếu người dùng đã Tab sang ô khác trong cùng bảng thì
  // KHÔNG vẽ lại (vẽ lại là dựng lại ô đang gõ, mất con trỏ); chỉ vá tại chỗ
  // ô trạng thái. Không ô nào đang gõ thì vẽ lại bình thường cho số đếm đúng.
  function veLaiNheNhang(goc, veLai, so) {
    var d = PL[so] || {};
    var chon = goc.querySelector('[data-pl-tt="' + so + '"]');
    if (chon) chon.value = d.trang_thai || 'chua';
    var dangGo = document.activeElement;
    if (dangGo && dangGo !== goc && goc.contains(dangGo) &&
        /^(INPUT|SELECT|TEXTAREA)$/.test(dangGo.tagName)) return;
    veLai();
  }

  // ══════════ VẼ ══════════
  function veTo() {
    var ds = window.DS_TAI_KHOAN || [];

    var bang = TV.length
      ? '<div class="cuon-ngang"><table class="bang-quan-tri nho"><thead><tr>' +
        '<th style="width:48px">TT</th><th>Họ và tên</th><th>Chức vụ</th>' +
        '<th>Vai trò trong Tổ</th><th>Nhóm việc phụ trách</th>' +
        (laQT() ? '<th></th>' : '') + '</tr></thead><tbody>' +
        TV.map(function (t, i) {
          return '<tr><td style="text-align:center">' + (i + 1) + '</td>' +
            '<td><b>' + thoat(t.ho_ten) + '</b></td>' +
            '<td>' + thoat(t.chuc_vu || '') + '</td>' +
            '<td><b>' + thoat(t.vai_tro) + '</b></td>' +
            '<td>' + ((t.nhom_viec || []).length
              ? (t.nhom_viec || []).join(', ')
              : '<span style="color:var(--chu-mo)">—</span>') + '</td>' +
            (laQT()
              ? '<td><button class="nut-xoa-nd" data-tv-xoa="' + t.id + '">Xoá</button></td>'
              : '') +
            '</tr>';
        }).join('') + '</tbody></table></div>'
      : '<div class="the-thong-bao" style="text-align:center;padding:22px">' +
        '<p><b>Năm học này chưa lập Tổ Đảm bảo chất lượng.</b></p>' +
        '<p style="font-size:14px;color:var(--chu-mo);margin-top:6px">' +
        'Thêm từng người vào danh sách dưới đây theo quyết định thành lập Tổ.</p></div>';

    var them = laQT()
      ? '<div class="tv-them">' +
        '<select id="tv-nguoi"><option value="">— chọn người —</option>' +
        ds.map(function (u) {
          return '<option value="' + thoat(u.id) + '">' + thoat(u.ho_ten) +
            (u.chuc_vu ? ' — ' + thoat(u.chuc_vu) : '') + '</option>';
        }).join('') + '</select>' +
        '<select id="tv-vai">' + VAI.map(function (v) {
          return '<option' + (v === 'Thành viên' ? ' selected' : '') + '>' + v + '</option>';
        }).join('') + '</select>' +
        '<input id="tv-nhom" placeholder="Nhóm việc, vd 3, 4" style="width:150px">' +
        '<button class="nut-luu-nd" id="tv-them">+ Thêm vào Tổ</button></div>'
      : '';

    return '<div class="dau-muc" style="text-align:left;margin:6px 0 10px">' +
      '<div class="nhan-nho">Tổ Đảm bảo chất lượng' +
      (TV.length ? ' · ' + TV.length + ' thành viên' : '') + '</div></div>' +
      (TO && TO.so_quyet_dinh
        ? '<div class="nhan-nho" style="text-transform:none;letter-spacing:0;color:var(--chu-mo);margin-bottom:8px">' +
          'Quyết định số ' + thoat(TO.so_quyet_dinh) + '</div>'
        : '') +
      bang + them;
  }

  function vePhanCong(PHAN_CONG) {
    // Ai phụ trách nhóm việc nào — dựng ngược từ mảng nhom_viec của thành viên,
    // để nhà trường chỉ phải khai MỘT chiều (người → việc) thay vì hai.
    var theoNhom = {};
    TV.forEach(function (t) {
      (t.nhom_viec || []).forEach(function (n) {
        (theoNhom[n] = theoNhom[n] || []).push(t.ho_ten);
      });
    });

    return '<div class="dau-muc" style="text-align:left;margin:24px 0 10px">' +
      '<div class="nhan-nho">Phân công nhiệm vụ · 9 nhóm việc</div></div>' +
      '<div class="cuon-ngang"><table class="bang-quan-tri nho"><thead><tr>' +
      '<th style="width:48px">TT</th><th>Nội dung công việc</th><th>Phụ lục</th>' +
      '<th>Người phụ trách</th></tr></thead><tbody>' +
      PHAN_CONG.map(function (p) {
        var ai = theoNhom[p.tt];
        return '<tr><td style="text-align:center">' + p.tt + '</td>' +
          '<td>' + thoat(p.viec) + '</td>' +
          '<td style="text-align:center">' + thoat(p.pl) + '</td>' +
          '<td>' + (ai
            ? '<b>' + ai.map(thoat).join(', ') + '</b>'
            : '<span style="color:var(--thieu)">chưa giao</span>') + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  function vePhuLuc(PHU_LUC) {
    var xong = PHU_LUC.filter(function (p) {
      return (PL[p.so] || {}).trang_thai === 'co';
    }).length;

    return '<div class="dau-muc" style="text-align:left;margin:24px 0 6px">' +
      '<div class="nhan-nho">Hồ sơ Đảm bảo chất lượng · đã có ' + xong + '/' +
      PHU_LUC.length + '</div></div>' +
      '<div class="cuon-ngang"><table class="bang-quan-tri nho"><thead><tr>' +
      '<th style="width:48px">Số</th><th>Tên phụ lục</th><th>Loại</th>' +
      '<th>Tình trạng</th><th>Đường dẫn</th></tr></thead><tbody>' +
      PHU_LUC.map(function (p) {
        var d = PL[p.so] || {};
        var tt = TEN_TT[d.trang_thai || 'chua'];
        return '<tr><td style="text-align:center"><b>' + p.so + '</b></td>' +
          '<td>' + thoat(p.ten) + '</td>' +
          '<td><span class="chip">' + thoat(p.loai) + '</span></td>' +
          '<td>' + (laQT()
            ? '<select class="pl-o" data-pl-tt="' + p.so + '">' +
              ['chua', 'dang', 'co'].map(function (k) {
                return '<option value="' + k + '"' +
                  ((d.trang_thai || 'chua') === k ? ' selected' : '') + '>' +
                  TEN_TT[k].chu.replace('✔ ', '') + '</option>';
              }).join('') + '</select>'
            : '<b style="color:' + tt.mau + '">' + tt.chu + '</b>') + '</td>' +
          '<td>' + (laQT()
            ? '<input class="pl-o pl-link" type="url" placeholder="https://drive.google.com/…" ' +
              'value="' + thoat(d.link_drive || '') + '" data-pl-link="' + p.so + '">'
            : (d.link_drive
                ? '<a href="' + thoat(d.link_drive) + '" target="_blank" rel="noopener">📂 Mở</a>'
                : '<span style="color:var(--chu-mo)">—</span>')) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  function ve(veLai, PHAN_CONG, PHU_LUC) {
    if (DANG_TAI) return '<div class="the-thong-bao">Đang tải…</div>';

    if (LOI === 'chua_ket_noi') {
      return '<div class="the-thong-bao" style="text-align:center;padding:24px">' +
        '<p><b>Bản xem thử chưa nối cơ sở dữ liệu.</b></p>' +
        '<p style="font-size:14px;color:var(--chu-mo);margin-top:6px">' +
        'Danh sách Tổ và hồ sơ là dữ liệu thật của nhà trường nên cần đăng nhập.</p></div>';
    }
    if (LOI) {
      return '<div class="hd-kiem do"><b>Chưa mở được danh sách Tổ ĐBCL.</b><br>' +
        'Nếu đây là lần đầu dùng mục này, nhà trường cần cài đặt bổ sung một lần ' +
        '(tệp <code>sql/44</code>) — báo người phụ trách hệ thống.' +
        '<div style="margin-top:6px;font-size:13px;opacity:.8">' + thoat(LOI) + '</div></div>';
    }

    return veTo() + vePhanCong(PHAN_CONG) + vePhuLuc(PHU_LUC);
  }

  // ══════════ SỰ KIỆN ══════════
  function noiSuKien(goc, veLai) {
    if (!goc) return;

    var nutThem = goc.querySelector('#tv-them');
    if (nutThem) nutThem.addEventListener('click', function () {
      var id = goc.querySelector('#tv-nguoi').value;
      var u = (window.DS_TAI_KHOAN || []).filter(function (x) { return x.id === id; })[0];
      if (!u) { window.hopHoi('Chưa chọn người nào.'); return; }

      // "3, 4" → [3,4]. Bỏ mọi thứ không phải số 1-9: người dùng gõ "3 và 4"
      // hay "3;4" đều ra đúng, thay vì báo lỗi bắt gõ lại cho đúng khuôn.
      var nhom = (goc.querySelector('#tv-nhom').value.match(/\d+/g) || [])
        .map(Number).filter(function (n) { return n >= 1 && n <= 9; });

      nutThem.disabled = true;
      chacChanCoTo()
        .then(function (to) {
          return may().from('thanh_vien_to_dbcl').insert({
            to_id: to.id, ho_ten: u.ho_ten, chuc_vu: u.chuc_vu || null,
            vai_tro: goc.querySelector('#tv-vai').value,
            email: u.email || null, nhom_viec: nhom, so_tt: TV.length + 1
          }).select();
        })
        .then(function (r) { if (r.error) throw r.error; nap(veLai); })
        .catch(function (e) {
          nutThem.disabled = false;
          window.hopHoi('Không thêm được: ' + (e.message || e));
        });
    });

    Array.prototype.slice.call(goc.querySelectorAll('[data-tv-xoa]')).forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-tv-xoa');
        var t = TV.filter(function (x) { return String(x.id) === String(id); })[0] || {};
        window.hopHoi({
          tieuDe: 'Đưa ra khỏi Tổ ĐBCL?',
          noiDung: 'Xoá ' + (t.ho_ten || '') + ' khỏi danh sách Tổ Đảm bảo chất lượng.',
          nutOK: 'Xoá', nguyHiem: true
        }).then(function (dongY) {
          if (!dongY) return;
          may().from('thanh_vien_to_dbcl').delete().eq('id', id).then(function (r) {
            if (r.error) { window.hopHoi(r.error.message); return; }
            nap(veLai);
          });
        });
      });
    });

    Array.prototype.slice.call(goc.querySelectorAll('[data-pl-tt]')).forEach(function (s) {
      s.addEventListener('change', function () {
        var so = +s.getAttribute('data-pl-tt');
        var cu = (PL[so] || {}).trang_thai || 'chua';
        luuPhuLuc(so, { trang_thai: s.value })
          .then(function () { veLaiNheNhang(goc, veLai, so); })
          .catch(function (e) {
            s.value = cu;   // trả ô chọn về đúng trạng thái trên máy chủ
            window.hopHoi('Không lưu được: ' + (e.message || e));
          });
      });
    });

    Array.prototype.slice.call(goc.querySelectorAll('[data-pl-link]')).forEach(function (t) {
      t.addEventListener('blur', function () {
        var so = +t.getAttribute('data-pl-link');
        var cu = (PL[so] || {}).link_drive || null;
        var moi = t.value.trim() || null;
        if (!dangGhiDo() && cu === moi) return;
        // Dán được link nghĩa là hồ sơ đã có — tự chuyển trạng thái, đỡ cho
        // người dùng một thao tác mà ai cũng quên.
        var thay = { link_drive: moi };
        if (moi && (PL[so] || {}).trang_thai !== 'co') thay.trang_thai = 'co';
        luuPhuLuc(so, thay)
          .then(function () { veLaiNheNhang(goc, veLai, so); })
          .catch(function (e) {
            window.hopHoi('Không lưu được: ' + (e.message || e));
            t.value = cu || '';
          });
      });
    });
  }

  window.DBCL_TO = {
    ve: ve, nap: nap, noiSuKien: noiSuKien,
    daTai: function () { return DA_NAP; }
  };
})();
