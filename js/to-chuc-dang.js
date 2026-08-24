// ============================================================
// to-chuc-dang.js — KHAI BÁO TỔ CHỨC ĐẢNG CỦA TRƯỜNG
//
// Thêm thẻ 🚩 Tổ chức đảng vào màn Quản trị. Ba việc:
//   1. Chọn mô hình: CHI BỘ · ĐẢNG BỘ · KHÔNG CÓ tổ chức đảng riêng
//   2. Thêm / xem các CHI BỘ TRỰC THUỘC (chỉ khi là đảng bộ)
//   3. Nhắc lằn ranh: hồ sơ đảng viên cá nhân KHÔNG đi qua app này
//
// 🔑 VÌ SAO KHÔNG NHÉT Ô CHỌN NÀY VÀO THẺ "⚙️ Thông tin trường"
//    Thẻ kia lưu thẳng vào bảng cau_hinh bằng một câu upsert. Nếu để ô tổ chức
//    đảng ở đó thì bấm Lưu sẽ đổi CẤU HÌNH mà KHÔNG đổi tên hồ sơ trong danh
//    mục — cấu hình nói "đảng bộ", hộp H04 vẫn ghi "Chi bộ", và app báo lưu
//    thành công. Đúng kiểu lỗi nguy hiểm nhất: im lặng và báo thành công.
//    Nên đổi mô hình phải đi qua hàm chuyen_mo_hinh_dang() ở sql/54 — hàm đó
//    đổi cấu hình VÀ đổi cụm từ trong hộp H04 trong cùng một giao dịch.
//
// Cần chạy trước: sql/54-to-chuc-dang.sql
// ============================================================
(function () {
  'use strict';

  function thoat(s) { return window.thoatHTML ? window.thoatHTML(s) : String(s || ''); }
  function may() { return window.MAY_CHU; }
  function bao(t) { if (window.notify) window.notify(t); else window.alert(t); }

  var CHE_DO = ['chi_bo', 'dang_bo', 'khong'];

  // ══════════════════════════════════════════════════════════
  // VẼ THẺ
  // ══════════════════════════════════════════════════════════
  function ve(hop) {
    // Chưa nối cơ sở dữ liệu (chế độ xem thử) thì may() là undefined và
    // may().from(...) ném TypeError ngay dòng đầu. Hiện nay màn Quản trị không
    // hiện ở chế độ xem thử nên chưa ai chạm tới, nhưng chắn ở đây rẻ hơn là
    // chờ một hôm cổng vào đổi rồi mới vỡ.
    if (!may()) {
      hop.innerHTML = '<div class="the-thong-bao"><b>Khu vực này cần nối cơ sở dữ liệu.</b><br>' +
        'Thẻ Tổ chức đảng đọc và ghi thẳng vào danh mục hồ sơ của trường, ' +
        'nên chỉ mở khi đã đăng nhập bằng tài khoản quản trị.</div>';
      return;
    }
    hop.innerHTML = '<div class="the-thong-bao">Đang tải…</div>';

    Promise.all([
      may().from('cau_hinh').select('khoa,gia_tri').in('khoa', ['to_chuc_dang', 'so_dang_vien']),
      may().from('nhom_con').select('id,ma,ten,nhom_id,co_so_ma').order('so_tt'),
      // Trường chưa chạy sql/10 thì không có bảng co_so — bắt lỗi tại chỗ để
      // cả thẻ không chết theo, phần chi bộ vẫn thêm tay được.
      may().from('co_so').select('ma,ten,loai,hoat_dong').order('so_tt')
        .then(function (r) { return r; }, function () { return { data: [] }; })
    ]).then(function (kq) {
      if (kq[0].error) {
        hop.innerHTML = '<div class="hd-kiem do"><b>Chưa đọc được cấu hình.</b><br>' +
          thoat(kq[0].error.message) +
          '<br><br>Thường là do chưa chạy <b>sql/54-to-chuc-dang.sql</b> trên cơ sở dữ liệu của trường.</div>';
        return;
      }
      // 🔴 LỖI ĐỌC HỘP PHẢI NÓI LÀ LỖI ĐỌC. Bản đầu không xét kq[1].error:
      //    mất mạng giữa chừng hay RLS chặn (tài khoản chưa được duyệt) thì
      //    data rỗng, và màn hình kết luận "Không thấy hộp H04 — chạy sql/46"
      //    trong khi hộp vẫn nằm nguyên trong cơ sở dữ liệu. Chẩn đoán sai
      //    thì người ta đi chạy lại SQL cho một lỗi mạng.
      if (kq[1].error) {
        hop.innerHTML = '<div class="hd-kiem do"><b>Chưa đọc được danh mục hộp hồ sơ.</b><br>' +
          thoat(kq[1].error.message) +
          '<br><br>Thường là lỗi mạng hoặc tài khoản chưa đủ quyền đọc — kiểm tra rồi bấm lại thẻ này. ' +
          'KHÔNG phải do thiếu hộp H04.</div>';
        return;
      }
      var gt = {};
      (kq[0].data || []).forEach(function (d) { gt[d.khoa] = d.gia_tri || ''; });
      var cheDo = CHE_DO.indexOf(gt.to_chuc_dang) >= 0 ? gt.to_chuc_dang : 'chi_bo';
      var soDV = parseInt(gt.so_dang_vien, 10) || 0;

      // Hộp H04 là tổ chức cơ sở đảng; mọi hộp KHÁC trong cùng bộ phận với H04
      // là chi bộ trực thuộc. Dò theo bộ phận của H04 chứ không theo tên hộp:
      // trường được phép đổi tên hộp, không được phép đổi việc H04 nằm ở đâu.
      var dsHop = (kq[1].data || []);
      // Không lỗi mà KHÔNG có hộp nào: gần như chắc chắn RLS lọc sạch (RLS
      // không báo lỗi, chỉ trả rỗng) — kho nào cũng có ít nhất hộp H01.
      if (!dsHop.length) {
        hop.innerHTML = '<div class="hd-kiem do"><b>Máy chủ trả về 0 hộp hồ sơ.</b><br>' +
          'Kho hồ sơ nào cũng có hộp, nên đây thường là tài khoản chưa được cấp quyền đọc danh mục ' +
          '(RLS trả rỗng chứ không báo lỗi). Kiểm tra vai trò ở thẻ 👥 Tài khoản, ' +
          'hoặc chạy <b>sql/46-danh-muc-2026.sql</b> nếu kho thật sự còn trống.</div>';
        return;
      }
      var h04 = dsHop.filter(function (h) { return h.ma === 'H04'; })[0];
      var chiBo = h04
        ? dsHop.filter(function (h) { return h.nhom_id === h04.nhom_id && h.ma !== 'H04' && h.ma !== 'H05'; })
        : [];

      var dsCoSo = ((kq[2] && kq[2].data) || []).filter(function (c) { return c.hoat_dong !== false; });

      hop.innerHTML = khungChon(cheDo, soDV) +
        (cheDo === 'dang_bo' ? khungChiBo(chiBo, dsCoSo) : '') +
        khungCanhBao() +
        (h04 ? '' : '<div class="hd-kiem do" style="margin-top:14px"><b>Không thấy hộp H04.</b> ' +
          'Chạy <b>sql/46-danh-muc-2026.sql</b> trước.</div>');

      noiSuKien(hop, cheDo);
    }).catch(function (e) {
      hop.innerHTML = '<div class="the-thong-bao">Không gọi được máy chủ.<br><small>' +
        thoat((e && e.message) || e) + '</small><br><br>Thầy cô kiểm tra đường mạng rồi bấm lại thẻ này.</div>';
    });
  }

  // ── Khối chọn mô hình ─────────────────────────────────────
  function khungChon(cheDo, soDV) {
    var tn = window.TU_NGU_DANG;

    // Cảnh báo ngưỡng 30. KHÔNG chặn, chỉ nhắc: Điều lệ Đảng Điều 21 khoản 5
    // cho lập đảng bộ ở đơn vị chưa đủ 30 đảng viên NẾU được cấp ủy cấp trên
    // trực tiếp đồng ý. Máy không được tự suy ra mô hình từ con số này.
    var nhac = '';
    if (cheDo === 'dang_bo' && soDV > 0 && soDV < 30) {
      nhac = '<div class="hd-kiem" style="background:#fff8e6;border-color:#e8c46a;margin-top:10px">' +
        '<b>Trường khai ' + soDV + ' đảng viên — chưa đủ 30.</b><br>' +
        'Điều lệ Đảng (Điều 21 khoản 5) vẫn cho lập đảng bộ cơ sở trong trường hợp này, ' +
        'nhưng phải được <b>cấp ủy cấp trên trực tiếp đồng ý</b> (ở đây là Đảng ủy xã). ' +
        'Văn bản đồng ý ấy là hồ sơ gốc chứng minh đảng bộ tồn tại hợp lệ — ' +
        'app đã tạo sẵn một đầu hồ sơ cho nó trong hộp H04.</div>';
    }

    return '<div class="tcd-nhom"><h4>🚩 Mô hình tổ chức đảng của trường</h4>' +
      '<div class="nhan-nho" style="margin-bottom:12px">Chọn đúng mô hình thì tên hộp, tên hồ sơ và ' +
      'chức danh người phụ trách trong <b>Bộ phận Đảng, đoàn thể</b> tự đổi theo. ' +
      'Số đảng viên khai ở thẻ <b>⚙️ Thông tin trường</b>.</div>' +
      CHE_DO.map(function (c) {
        return '<label class="tcd-chon' + (c === cheDo ? ' dang' : '') + '">' +
          '<input type="radio" name="tcd-che-do" value="' + c + '"' + (c === cheDo ? ' checked' : '') + '>' +
          '<span class="tcd-chu"><b>' + thoat(tn[c].nhan) + '</b>' +
          (c === cheDo ? '<span class="tcd-cho">đang dùng</span>' : '') +
          '<small>' + thoat(tn[c].moTa) + '</small></span></label>';
      }).join('') +
      nhac +
      '<div class="tl-day-nut"><button class="nut-chinh" id="tcd-doi">🔁 Chuyển mô hình</button>' +
      '<span id="tcd-bao" class="tl-bao"></span></div>' +
      '<div class="nhan-nho">Chuyển mô hình chỉ <b>thay cụm từ</b> — hồ sơ nào trường đã sửa tên hay ' +
      'đã gắn tệp trên Drive đều giữ nguyên, không mất gì. Thao tác được ghi vào sổ nhật ký.</div>' +
      '</div>';
  }

  // ── Khối chi bộ trực thuộc ────────────────────────────────
  function khungChiBo(ds, dsCoSo) {
    // Điểm trường nào CHƯA có chi bộ — thứ đáng nhắc nhất trên màn này.
    var daCo = {};
    ds.forEach(function (h) { if (h.co_so_ma) daCo[h.co_so_ma] = h; });
    var conThieu = (dsCoSo || []).filter(function (c) { return !daCo[c.ma]; });

    var nutSinh = '';
    if (conThieu.length) {
      nutSinh =
        '<div class="hd-kiem" style="background:#fff8e6;border-color:#e8c46a;margin-bottom:12px">' +
        '<b>' + conThieu.length + ' điểm trường chưa có chi bộ:</b> ' +
        thoat(conThieu.map(function (c) { return c.ten; }).join(' · ')) + '<br>' +
        '<small>Sau sáp nhập, mỗi điểm trường thường là một chi bộ trực thuộc. ' +
        'Điểm nào dưới 3 đảng viên chính thức thì không lập được chi bộ riêng — phải ghép, ' +
        'khi đó thêm tay ở ô dưới thay vì bấm nút này.</small>' +
        '<div class="tl-day-nut"><button class="nut-chinh" id="tcd-sinh">✨ Sinh ' +
        conThieu.length + ' chi bộ theo điểm trường</button>' +
        '<span id="tcd-bao-sinh" class="tl-bao"></span></div></div>';
    } else if ((dsCoSo || []).length) {
      nutSinh = '<div class="hd-kiem" style="background:#eaf6ee;border-color:#9ccfae;margin-bottom:12px">' +
        '<b>Điểm trường nào cũng đã có chi bộ.</b></div>';
    }

    return '<div class="tcd-nhom"><h4>📁 Chi bộ trực thuộc (' + ds.length + ')</h4>' +
      '<div class="nhan-nho" style="margin-bottom:12px">Mỗi chi bộ là <b>một hộp hồ sơ riêng</b>. ' +
      'Nghiệp vụ lưu trữ của Đảng lập hồ sơ theo <b>đơn vị lập hồ sơ</b> — Đảng ủy và mỗi chi bộ ' +
      'ban hành văn bản với thẩm quyền khác nhau, nộp lưu tách nhau, nên không trộn chung một hộp.</div>' +
      nutSinh +
      (ds.length
        ? '<div class="tcd-ds">' + ds.map(function (h) {
            var cs = (dsCoSo || []).filter(function (c) { return c.ma === h.co_so_ma; })[0];
            return '<div class="tcd-mot"><span class="tcd-ma">' + thoat(h.ma) + '</span>' +
              '<span class="tcd-ten"><b>' + thoat(h.ten) + '</b><br>' +
              '<small>' + (cs ? '📍 ' + thoat(cs.ten) : 'chưa gắn điểm trường — chi bộ ghép') +
              ' · sửa tên hoặc xoá hộp ở thẻ Danh mục hồ sơ</small></span></div>';
          }).join('') + '</div>'
        : '<div class="the-thong-bao">Chưa có chi bộ trực thuộc nào.</div>') +
      '<label class="tcd-o"><span class="tcd-nhan">Thêm một chi bộ (đặt tên tự do)</span>' +
      '<input type="text" id="tcd-ten" placeholder="Tên chi bộ theo quyết định của Đảng ủy xã" autocomplete="off">' +
      '<small>Dùng khi chi bộ <b>ghép nhiều điểm trường</b>, hoặc chia theo <b>khối chuyên môn</b> — ' +
      'tuỳ cách Đảng ủy xã quyết. Tên đặt xong vẫn sửa lại được.</small></label>' +
      '<div class="tl-day-nut"><button class="nut-luu-nd" id="tcd-them">+ Thêm chi bộ</button>' +
      '<span id="tcd-bao-cb" class="tl-bao"></span></div>' +
      '</div>';
  }

  // ── Lằn ranh bảo mật ──────────────────────────────────────
  function khungCanhBao() {
    return '<div class="hd-kiem do" style="margin-top:14px">' +
      '<b>🔴 Hồ sơ đảng viên cá nhân không đưa lên đây.</b><br>' +
      'Quy định 20-QĐ/TW (08/4/2026) và Công văn 1361-CV/BTCTW (30/6/2026) bắt số hoá hồ sơ đảng viên ' +
      'vào <b>Cơ sở dữ liệu đảng viên 4.0</b> và <b>Sổ tay Đảng viên điện tử</b> của Ban Tổ chức Trung ương, ' +
      'bảo quản theo chế độ mật. App này chạy trên Google Drive và Supabase — tải lý lịch, hồ sơ đảng viên ' +
      'lên đó là vi phạm.<br><br>' +
      'Ở app, các đầu hồ sơ dính đảng viên cá nhân <b>chỉ ghi có/chưa và nơi lưu</b>, không gắn link Drive. ' +
      'App quản hồ sơ của <b>TỔ CHỨC</b> đảng: nghị quyết, biên bản, báo cáo, quyết định — ' +
      'đó mới là thứ dùng làm minh chứng tiêu chí 1.2 của Thông tư 57.</div>';
  }

  // ══════════════════════════════════════════════════════════
  // SỰ KIỆN
  // ══════════════════════════════════════════════════════════

  // 🔴 SAU KHI MÁY CHỦ ĐỔI DANH MỤC PHẢI NẠP LẠI KHO TRÊN MÀN. Ba hàm RPC ở
  //    đây (chuyen_mo_hinh_dang, sinh_chi_bo_theo_co_so, them_chi_bo_truc_thuoc)
  //    đổi tên hộp H04, đổi tên hồ sơ, thêm hộp mới — nhưng window.HOP /
  //    window.HO_SO / window.BO_PHAN trên trình duyệt vẫn là bản đọc lúc đăng
  //    nhập. Bản đầu chỉ vẽ lại thẻ này: thẻ nói "đảng bộ", màn Quản lý Hồ sơ
  //    ngay bên cạnh vẫn ghi "Chi bộ" cho tới khi tải lại trang — chính kiểu
  //    lỗi mà khối chú thích đầu tệp cảnh báo. Nạp lại trọn bộ qua
  //    du-lieu-sql.js, và hạ luôn bộ nhớ đệm của thẻ Danh mục hồ sơ.
  function lamTuoiKho() {
    if (window.DANH_MUC_SUA && window.DANH_MUC_SUA.nap) {
      try { window.DANH_MUC_SUA.nap(function () {}); } catch (e) { /* thẻ ấy tự báo lỗi của nó */ }
    }
    if (!window.napLaiDuLieuThat) return Promise.resolve();
    return window.napLaiDuLieuThat().then(null, function (e) {
      // du-lieu-sql.js đã treo băng đỏ; ở đây chỉ nhắc thêm cho khỏi im lặng.
      bao('Đã đổi trên máy chủ nhưng chưa nạp lại được kho hồ sơ: ' +
        ((e && e.message) || e) + '. Tải lại trang để thấy tên mới.');
    });
  }

  function noiSuKien(hop, cheDoDang) {
    var nutDoi = hop.querySelector('#tcd-doi');
    if (nutDoi) nutDoi.addEventListener('click', function () {
      var o = hop.querySelector('input[name="tcd-che-do"]:checked');
      var moi = o ? o.value : '';
      var bang = hop.querySelector('#tcd-bao');
      if (!moi) { bang.textContent = 'Chọn một mô hình đã.'; return; }
      if (moi === cheDoDang) { bang.textContent = 'Đang là mô hình này rồi.'; return; }

      // Hỏi lại trước khi đổi: đây là thao tác sửa hàng loạt tên hồ sơ của cả
      // một hộp. Không có nút hoàn tác — chỉ có cách chuyển ngược lại.
      var tn = window.TU_NGU_DANG;
      if (!window.confirm(
            'Chuyển tổ chức đảng của trường sang: ' + tn[moi].nhan + '?\n\n' +
            'Tên hộp và tên hồ sơ trong Bộ phận Đảng, đoàn thể sẽ đổi theo ' +
            '(hộp Chi bộ ↔ Đảng bộ; văn bản Nghị quyết chi bộ ↔ Nghị quyết Đảng ủy, ' +
            'Bí thư Chi bộ ↔ Bí thư Đảng ủy…).\n' +
            'Hồ sơ đã gắn tệp trên Drive không mất.')) return;

      nutDoi.disabled = true;
      bang.textContent = 'Đang chuyển…';
      may().rpc('chuyen_mo_hinh_dang', { p_che_do: moi }).then(function (r) {
        nutDoi.disabled = false;
        if (r.error) { bang.textContent = ''; bao('Không chuyển được: ' + r.error.message); return; }
        bao(r.data || 'Đã chuyển mô hình.');
        window.CAU_HINH.TO_CHUC_DANG = moi;
        lamTuoiKho();                  // kho hồ sơ trên màn phải đổi tên theo
        ve(hop);                       // vẽ lại để hiện/ẩn khối chi bộ
      }).catch(function (e) {
        nutDoi.disabled = false; bang.textContent = '';
        bao('Không gọi được máy chủ: ' + ((e && e.message) || e));
      });
    });

    var nutSinh = hop.querySelector('#tcd-sinh');
    if (nutSinh) nutSinh.addEventListener('click', function () {
      var bang = hop.querySelector('#tcd-bao-sinh');
      nutSinh.disabled = true;
      bang.textContent = 'Đang tạo…';
      may().rpc('sinh_chi_bo_theo_co_so').then(function (r) {
        nutSinh.disabled = false;
        if (r.error) { bang.textContent = ''; bao('Không sinh được: ' + r.error.message); return; }
        bao(r.data || 'Đã sinh chi bộ.');
        lamTuoiKho();                  // hộp mới phải xuất hiện ở kho hồ sơ
        ve(hop);
      }).catch(function (e) {
        nutSinh.disabled = false; bang.textContent = '';
        bao('Không gọi được máy chủ: ' + ((e && e.message) || e));
      });
    });

    var nutThem = hop.querySelector('#tcd-them');
    if (nutThem) nutThem.addEventListener('click', function () {
      var oTen = hop.querySelector('#tcd-ten');
      var bang = hop.querySelector('#tcd-bao-cb');
      var ten = (oTen.value || '').trim();
      if (!ten) { bang.textContent = 'Nhập tên chi bộ đã.'; oTen.focus(); return; }

      nutThem.disabled = true;
      bang.textContent = 'Đang tạo…';
      may().rpc('them_chi_bo_truc_thuoc', { p_ten: ten }).then(function (r) {
        nutThem.disabled = false;
        if (r.error) { bang.textContent = ''; bao('Không tạo được: ' + r.error.message); return; }
        bao(r.data || 'Đã thêm chi bộ.');
        lamTuoiKho();
        ve(hop);
      }).catch(function (e) {
        nutThem.disabled = false; bang.textContent = '';
        bao('Không gọi được máy chủ: ' + ((e && e.message) || e));
      });
    });
  }

  // Đăng ký thẻ. Đặt sau ⚙️ Thông tin trường vì số đảng viên khai ở thẻ đó.
  window.qtTabPhu = window.qtTabPhu || [];
  window.qtTabPhu.push({ ma: 'dang', ten: '🚩 Tổ chức đảng', ve: ve });
})();
