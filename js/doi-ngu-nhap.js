// ============================================================
// doi-ngu-nhap.js — BẢNG NHẬP NHANH trình độ đào tạo · chuẩn nghề nghiệp · bồi dưỡng của TỪNG CBGV-NV
// (thầy Chung 11/10/2026: "cách nào tiện, nhanh, dễ nhất cho các thầy cô quản lý").
// BẢN TIỂU HỌC — mang từ app mầm non (cùng ngày), khác: thêm nhóm Tổng phụ trách Đội; GV đạt chuẩn trình độ = đại học
// trở lên (Luật Giáo dục 2019 Điều 72); danh sách người lấy từ DS_TAI_KHOAN như demCBGV của tiểu học.
// Mở từ Quản trị › 🏛 Công khai › mục Đội ngũ (cong-khai-soan.js) — chỉ Ban giám hiệu (bảng nhan_su_danh_gia,
// RLS la_admin, ../thdienlien-v2-tailieu/sql/85-doi-ngu-trinh-do.sql). Cổng công khai chỉ nhận SỐ TỔNG HỢP.
//
// Cho nhanh: một bảng cả trường, mỗi người một dòng, ô chọn sẵn · "Điền ô trống cả cột" ·
// dán thẳng từ Excel/CSDL ngành (khớp theo họ tên, nhận chữ "Đại học", "ĐH", "Khá", "x"…) ·
// trình độ tự mang sang từ năm trước. Lưu xong tự điền số vào Mục III (vẫn phải Lưu nháp → Công bố).
// ============================================================
(function () {
  'use strict';

  var TD = [['thac_si', 'Thạc sĩ trở lên'], ['dai_hoc', 'Đại học'], ['cao_dang', 'Cao đẳng'], ['trung_cap', 'Trung cấp'], ['khac', 'Khác']];
  var NN = [['tot', 'Tốt'], ['kha', 'Khá'], ['dat', 'Đạt'], ['chua_dat', 'Chưa đạt']];
  var NHOM = [['cbql', 'Cán bộ quản lý'], ['gv', 'Giáo viên'], ['tpt', 'Tổng phụ trách Đội'], ['nv', 'Nhân viên']];

  function t(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function may() { return window.MAY_CHU; }
  function khongDau(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/\s+/g, ' ').trim();
  }
  // Cùng cách chia với demCBGV (cong-khai-soan.js) — sửa một nơi thì sửa cả hai.
  function nhom(u) {
    var cv = String(u.chuc_vu || '').toLowerCase();
    if (/hiệu trưởng/.test(cv)) return 'cbql';
    if (/tổng phụ trách/.test(cv)) return 'tpt';
    if (/nhân viên|kế toán|văn thư|thư viện|thiết bị|y tế|bảo vệ|phục vụ|thủ quỹ|cấp dưỡng/.test(cv) || u.vai_tro === 'nhan_vien') return 'nv';
    return 'gv';
  }
  var GV_DAT_CHUAN = /^(thac_si|dai_hoc)$/;   // GV tiểu học: cử nhân trở lên
  function nhan(ds, k) { for (var i = 0; i < ds.length; i++) if (ds[i][0] === k) return ds[i][1]; return ''; }

  // ── Đọc dữ liệu: dòng của năm đang soạn; trình độ thiếu thì lấy từ năm gần nhất trước đó ──
  function doc(nam, dsMoi) {
    return may().from('nhan_su_danh_gia').select('email, nam_hoc, trinh_do, chuan_nn, boi_duong').lte('nam_hoc', nam)
      .order('nam_hoc', { ascending: false }).then(function (r) {
        if (r.error) throw r.error;
        var theo = {};
        (r.data || []).forEach(function (d) {
          var e = d.email.toLowerCase();
          if (!theo[e]) theo[e] = { co_dong: false };
          var x = theo[e];
          if (d.nam_hoc === nam) { x.co_dong = true; x.trinh_do = d.trinh_do; x.chuan_nn = d.chuan_nn; x.boi_duong = d.boi_duong; }
          else if (!x.trinh_do && d.trinh_do) { x.trinh_do = d.trinh_do; x.td_tu = d.nam_hoc; }
        });
        return dsMoi.map(function (u) {
          var x = theo[String(u.email).toLowerCase()] || {};
          return { email: u.email, ho_ten: String(u.ho_ten || '').replace(/\s*\(\d+\)\s*$/, ''), chuc_vu: u.chuc_vu || '', nhom: nhom(u),
            trinh_do: x.trinh_do || '', chuan_nn: x.chuan_nn || '', boi_duong: x.boi_duong === true ? true : x.boi_duong === false ? false : null,
            td_tu: x.td_tu || '' };
        });
      });
  }

  // ── Đếm ra đúng khuôn Mục III (cong-khai-soan KHUON.doi_ngu) ──
  function demTu(ds) {
    var kq = { bang: {}, nn: { tot: 0, kha: 0, dat: 0, chua_dat: 0, chua_nhap: 0 }, bd_dat: 0, bd_nhap: 0, dc_dat: 0, gv: 0, tong: ds.length, thieu_td: 0 };
    NHOM.forEach(function (n) { kq.bang[n[0]] = { tong: 0, thac_si: 0, dai_hoc: 0, cao_dang: 0, khac: 0, co: 0 }; });
    ds.forEach(function (p) {
      var b = kq.bang[p.nhom];
      b.tong++;
      if (p.trinh_do) { b.co++; b[p.trinh_do === 'trung_cap' ? 'khac' : p.trinh_do]++; } else kq.thieu_td++;
      if (p.nhom !== 'nv') { if (p.chuan_nn) kq.nn[p.chuan_nn]++; else kq.nn.chua_nhap++; }
      if (p.boi_duong != null) { kq.bd_nhap++; if (p.boi_duong) kq.bd_dat++; }
      if (p.nhom === 'gv' || p.nhom === 'tpt') { kq.gv++; if (GV_DAT_CHUAN.test(p.trinh_do)) kq.dc_dat++; }
    });
    return kq;
  }
  // Ghi số vào noi_dung mục doi_ngu. Chỉ ghi phần ĐÃ nhập — chưa ai nhập thì để nguyên ô cũ.
  function dienVao(nd, kq) {
    var ten = { cbql: 'Cán bộ quản lý', gv: 'Giáo viên', tpt: 'Tổng phụ trách Đội', nv: 'Nhân viên' };
    (nd.bang || []).forEach(function (r) {
      var k = Object.keys(ten).filter(function (x) { return ten[x] === r.vi_tri; })[0];
      var b = k && kq.bang[k];
      if (!b || !b.co) return;
      r.thac_si = b.thac_si; r.dai_hoc = b.dai_hoc; r.cao_dang = b.cao_dang; r.khac = b.khac;   // ghi cả số 0: nhóm đã nhập thì 0 là số thật
    });
    var n = kq.nn, daNN = n.tot + n.kha + n.dat + n.chua_dat;
    if (daNN) {
      nd.nn_dat = n.tot + n.kha + n.dat;
      nd.nn_tong = daNN + n.chua_nhap;
      nd.nn_ghi = ['Tốt ' + n.tot, 'Khá ' + n.kha, 'Đạt ' + n.dat].concat(n.chua_dat ? ['Chưa đạt ' + n.chua_dat] : [])
        .concat(n.chua_nhap ? ['chưa đánh giá ' + n.chua_nhap] : []).join(' · ');
    }
    if (kq.bd_nhap) { nd.bd_dat = kq.bd_dat; nd.bd_tong = kq.tong; }
    var tdGV = kq.bang.gv.co + kq.bang.tpt.co;
    if (tdGV) {
      nd.dc_dat = kq.dc_dat; nd.dc_tong = kq.gv;
      nd.dc_ghi = 'Từ đại học sư phạm trở lên' + (tdGV < kq.gv ? ' · còn ' + (kq.gv - tdGV) + ' GV chưa nhập trình độ' : '');
    }
    var phan = [];
    if (kq.thieu_td) phan.push(kq.thieu_td + ' người chưa nhập trình độ');
    return phan.length ? ' ⚠️ ' + phan.join(', ') + ' — số trong bảng chưa đủ.' : '';
  }
  function dem(nam, dsMoi) { return doc(nam, dsMoi).then(demTu); }

  // ── Dán từ Excel: mỗi dòng một người, các ô ngăn bằng Tab; khớp theo họ tên ──
  function hieuO(s) {
    var k = khongDau(s);
    if (!k) return null;
    if (/thac si|tien si|\bths\b|\bts\b/.test(k)) return ['trinh_do', 'thac_si'];
    if (/dai hoc|\bdh\b|cu nhan|ky su/.test(k)) return ['trinh_do', 'dai_hoc'];
    if (/cao dang|\bcd\b/.test(k)) return ['trinh_do', 'cao_dang'];
    if (/trung cap|\btc\b/.test(k)) return ['trinh_do', 'trung_cap'];
    if (/so cap|pho thong|12\/12|chua qua dao tao/.test(k)) return ['trinh_do', 'khac'];
    if (/chua hoan thanh|khong hoan thanh/.test(k)) return ['boi_duong', false];
    if (/hoan thanh|^x$|^co$|^✓$/.test(k)) return ['boi_duong', true];
    if (/chua dat/.test(k)) return ['chuan_nn', 'chua_dat'];
    if (/^tot\b|xuat sac/.test(k)) return ['chuan_nn', 'tot'];
    if (/^kha\b/.test(k)) return ['chuan_nn', 'kha'];
    if (/^dat\b/.test(k)) return ['chuan_nn', 'dat'];
    return null;
  }
  function dan(chu, ds) {
    var theoTen = {};
    ds.forEach(function (p, i) { var k = khongDau(p.ho_ten); (theoTen[k] = theoTen[k] || []).push(i); });
    var khop = 0, sua = 0, khongKhop = [], trung = [];
    String(chu || '').split(/\r?\n/).forEach(function (dong) {
      var o = dong.split('\t').map(function (x) { return x.trim(); }).filter(Boolean);
      if (!o.length) return;
      var viTri = -1, idx = null;
      o.forEach(function (x, j) { if (idx == null && theoTen[khongDau(x)]) { idx = theoTen[khongDau(x)]; viTri = j; } });
      // Excel hay để Họ đệm | Tên ở hai ô liền nhau
      if (idx == null) for (var j = 0; j + 1 < o.length && idx == null; j++) {
        var g = theoTen[khongDau(o[j] + ' ' + o[j + 1])];
        if (g) { idx = g; viTri = j; o.splice(j, 2, o[j] + ' ' + o[j + 1]); }
      }
      if (idx == null) { if (o.some(hieuO)) khongKhop.push(o[0]); return; }
      if (idx.length > 1) { trung.push(o[viTri]); return; }
      var p = ds[idx[0]], doi = 0;
      o.forEach(function (x, j) {
        if (j === viTri) return;
        var h = hieuO(x);
        if (h && p[h[0]] !== h[1]) { p[h[0]] = h[1]; p.doi = true; doi++; }
      });
      khop++; if (doi) sua++;
    });
    return { khop: khop, sua: sua, khongKhop: khongKhop, trung: trung };
  }

  // ── Vẽ bảng ──
  function ve(vung, nam, dsMoi, khiLuu) {
    vung.innerHTML = '<div class="dnn"><p class="dnn-cho">Đang tải danh sách…</p></div>';
    doc(nam, dsMoi).then(function (ds) { veBang(vung, nam, ds, khiLuu); }, function (e) {
      var m = (e && e.message) || String(e);
      if (/nhan_su_danh_gia|does not exist|schema cache|PGRST20/i.test(m)) m = 'Trường chưa chạy tệp sql/85-doi-ngu-trinh-do.sql. ' + m;
      vung.innerHTML = '<div class="dnn"><p class="dnn-loi">⚠️ ' + t(m) + '</p></div>';
    });
  }

  function chon(ds, gt, dataK, rong) {
    return '<select data-k="' + dataK + '"><option value="">' + (rong || '—') + '</option>' +
      ds.map(function (x) { return '<option value="' + x[0] + '"' + (x[0] === gt ? ' selected' : '') + '>' + x[1] + '</option>'; }).join('') + '</select>';
  }

  function veBang(vung, nam, ds, khiLuu) {
    var mangSang = ds.filter(function (p) { return p.td_tu; }).length;
    var stt = 0;
    var than = NHOM.map(function (n) {
      var nh = ds.filter(function (p) { return p.nhom === n[0]; });
      if (!nh.length) return '';
      return '<tr class="dnn-nhom"><th colspan="5">' + n[1] + ' · ' + nh.length + '</th></tr>' + nh.map(function (p) {
        var i = ds.indexOf(p); stt++;
        return '<tr data-i="' + i + '"><td class="dnn-stt">' + stt + '</td>' +
          '<td class="dnn-ten"><b>' + t(p.ho_ten) + '</b><small>' + t(p.chuc_vu) + '</small></td>' +
          '<td data-nhan="Trình độ">' + chon(TD, p.trinh_do, 'trinh_do') + (p.td_tu ? '<small class="dnn-tu">từ ' + t(p.td_tu) + '</small>' : '') + '</td>' +
          '<td data-nhan="Chuẩn NN">' + (p.nhom === 'nv' ? '<span class="dnn-khong">không áp dụng</span>' : chon(NN, p.chuan_nn, 'chuan_nn')) + '</td>' +
          '<td data-nhan="Bồi dưỡng" class="dnn-bd"><label><input type="checkbox" data-k="boi_duong"' + (p.boi_duong ? ' checked' : '') + '> hoàn thành</label></td></tr>';
      }).join('');
    }).join('');

    vung.innerHTML = '<div class="dnn">' +
      '<div class="dnn-dau"><b>👥 Trình độ, chuẩn nghề nghiệp, bồi dưỡng — ' + ds.length + ' người · năm học ' + t(nam) + '</b>' +
      '<small>🔒 Chỉ Ban giám hiệu xem được. Cổng công khai chỉ hiện <b>số tổng hợp</b>. Chuẩn nghề nghiệp và bồi dưỡng ghi theo kết quả đánh giá <b>gần nhất</b> (cuối năm học trước).' +
      (mangSang ? ' Trình độ của ' + mangSang + ' người mang sang từ năm trước — sửa nếu có thay đổi.' : '') + '</small></div>' +
      '<div class="dnn-cong-cu">' +
        '<span>Điền ô trống cả cột: ' + chon(TD, '', 'ca-trinh_do', 'Trình độ…') + chon(NN, '', 'ca-chuan_nn', 'Chuẩn NN…') + '</span>' +
        '<button type="button" class="nut-phu" data-dnn="bd-het">✓ Tất cả hoàn thành bồi dưỡng</button>' +
        '<button type="button" class="nut-phu" data-dnn="mo-dan">📋 Dán từ Excel</button>' +
      '</div>' +
      '<div class="dnn-dan" hidden><label>Chép từ Excel (hoặc tệp CSDL ngành) các cột <b>Họ tên · Trình độ · Xếp loại chuẩn NN · Bồi dưỡng</b> rồi dán vào đây — ' +
        'thứ tự cột tuỳ ý, máy khớp theo họ tên và nhận chữ như "Đại học", "ĐH", "Cao đẳng", "Khá", "Tốt", "Hoàn thành", "x".</label>' +
        '<textarea rows="6" placeholder="Nguyễn Thị A&#9;Đại học&#9;Khá&#9;Hoàn thành"></textarea>' +
        '<div><button type="button" class="nut-chinh" data-dnn="dan">Nhận dữ liệu dán</button> <span class="dnn-bao-dan"></span></div></div>' +
      '<div class="dnn-cuon"><table class="dnn-bang"><thead><tr><th>#</th><th>Họ tên</th><th>Trình độ đào tạo</th><th>Chuẩn nghề nghiệp</th><th>Bồi dưỡng thường xuyên</th></tr></thead>' +
        '<tbody>' + than + '</tbody></table></div>' +
      '<div class="dnn-tong"></div>' +
      '<div class="dnn-chan"><button type="button" class="nut-chinh" data-dnn="luu">💾 Lưu và điền số vào Mục III</button>' +
        '<button type="button" class="nut-phu" data-dnn="dong">Đóng</button><span class="dnn-bao"></span></div></div>';

    var hop = vung.querySelector('.dnn');
    function veTong() {
      var kq = demTu(ds), n = kq.nn;
      var o = function (nhanO, a, b) { return '<div><small>' + nhanO + '</small><b>' + a + (b != null ? '/' + b : '') + '</b></div>'; };
      var gvql = kq.bang.cbql.tong + kq.bang.gv.tong;
      hop.querySelector('.dnn-tong').innerHTML =
        o('Đã nhập trình độ', kq.tong - kq.thieu_td, kq.tong) +
        o('Đạt chuẩn NN (GV, CBQL)', n.tot + n.kha + n.dat, gvql + kq.bang.tpt.tong) +
        o('Hoàn thành bồi dưỡng', kq.bd_dat, kq.tong) +
        o('GV đạt chuẩn trình độ', kq.dc_dat, kq.gv);
      var soDoi = ds.filter(function (p) { return p.doi; }).length;
      hop.querySelector('[data-dnn="luu"]').textContent = soDoi ? '💾 Lưu ' + soDoi + ' người và điền số vào Mục III' : '💾 Điền số vào Mục III';
    }
    function baoO(cls, chu) { var b = hop.querySelector(cls); if (b) b.innerHTML = chu; }
    function veLaiDong() {
      Array.prototype.forEach.call(hop.querySelectorAll('tbody tr[data-i]'), function (tr) {
        var p = ds[+tr.getAttribute('data-i')];
        var a = tr.querySelector('[data-k="trinh_do"]'); if (a) a.value = p.trinh_do || '';
        var b = tr.querySelector('[data-k="chuan_nn"]'); if (b) b.value = p.chuan_nn || '';
        var c = tr.querySelector('[data-k="boi_duong"]'); if (c) c.checked = !!p.boi_duong;
        tr.classList.toggle('dnn-doi', !!p.doi);
      });
      veTong();
    }

    hop.addEventListener('change', function (e) {
      var el = e.target, k = el.getAttribute('data-k');
      if (!k) return;
      if (k.indexOf('ca-') === 0) {
        var cot = k.slice(3), v = el.value; el.value = '';
        if (!v) return;
        var n = 0;
        ds.forEach(function (p) {
          if (cot === 'chuan_nn' && p.nhom === 'nv') return;
          if (!p[cot]) { p[cot] = v; p.doi = true; n++; }
        });
        veLaiDong(); baoO('.dnn-bao', 'Đã điền ' + n + ' ô trống.');
        return;
      }
      var tr = el.closest('tr[data-i]'); if (!tr) return;
      var p = ds[+tr.getAttribute('data-i')];
      p[k] = el.type === 'checkbox' ? el.checked : el.value;
      if (k === 'trinh_do') p.td_tu = '';
      p.doi = true; tr.classList.add('dnn-doi'); veTong();
    });
    hop.addEventListener('click', function (e) {
      var b = e.target.closest('[data-dnn]'); if (!b) return;
      var viec = b.getAttribute('data-dnn');
      if (viec === 'bd-het') { ds.forEach(function (p) { if (p.boi_duong !== true) { p.boi_duong = true; p.doi = true; } }); veLaiDong(); }
      if (viec === 'mo-dan') { var d = hop.querySelector('.dnn-dan'); d.hidden = !d.hidden; if (!d.hidden) d.querySelector('textarea').focus(); }
      if (viec === 'dan') {
        var kq = dan(hop.querySelector('.dnn-dan textarea').value, ds);
        veLaiDong();
        baoO('.dnn-bao-dan', '✅ Khớp ' + kq.khop + ' người, đổi ' + kq.sua + '.' +
          (kq.khongKhop.length ? ' ⚠️ Không thấy tên: ' + t(kq.khongKhop.slice(0, 8).join(', ')) + (kq.khongKhop.length > 8 ? '…' : '') + '.' : '') +
          (kq.trung.length ? ' ⚠️ Trùng họ tên, nhập tay: ' + t(kq.trung.join(', ')) + '.' : ''));
      }
      if (viec === 'dong') vung.innerHTML = '';
      if (viec === 'luu') luu();
    });

    function luu() {
      var doi = ds.filter(function (p) { return p.doi; });
      var nut = hop.querySelector('[data-dnn="luu"]');
      var xong = function () {
        doi.forEach(function (p) { p.doi = false; });
        veLaiDong();
        if (khiLuu) khiLuu(demTu(ds));
        baoO('.dnn-bao', doi.length ? '✅ Đã lưu ' + doi.length + ' người.' : '');
      };
      if (!doi.length) { xong(); return; }
      nut.disabled = true;
      var dong = doi.map(function (p) {
        return { email: p.email, nam_hoc: nam, trinh_do: p.trinh_do || null, chuan_nn: p.nhom === 'nv' ? null : (p.chuan_nn || null),
          boi_duong: p.boi_duong, cap_nhat_luc: new Date().toISOString() };
      });
      may().from('nhan_su_danh_gia').upsert(dong, { onConflict: 'email,nam_hoc' }).then(function (r) {
        nut.disabled = false;
        if (r.error) { baoO('.dnn-bao', '⚠️ Chưa lưu được: ' + t(r.error.message)); return; }
        xong();
      }, function (e) { nut.disabled = false; baoO('.dnn-bao', '⚠️ ' + t((e && e.message) || e)); });
    }
    veTong();
  }

  window.DOI_NGU = { ve: ve, dem: dem, dienVao: dienVao, nhom: nhom, _dan: dan, _hieuO: hieuO, _demTu: demTu };
})();
