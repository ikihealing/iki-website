#!/usr/bin/env node
/**
 * cau-chuyen-cham-soc.mjs — mục "Câu chuyện chăm sóc khách hàng" trong Góc chia sẻ (CEO 25/11/2026).
 *
 * Nguồn: hope-ops-hub đọc bản chép cuộc gọi tư vấn/chăm sóc, nhặt câu chuyện khách tự kể, quản lý bấm
 * "Khách đã đồng ý" rồi "Duyệt đăng". API công khai trả các bản đã duyệt (đã ẩn danh):
 *   https://hope-ops-hub.vercel.app/api/cau-chuyen/da-duyet
 * Workflow `cau-chuyen-cham-soc.yml` chạy script này mỗi ngày rồi commit nếu có bài mới.
 *
 * Việc script làm (chạy lại bao nhiêu lần cũng ra cùng kết quả):
 *  1. Kéo danh sách, lưu bản sao `data/cau-chuyen-cham-soc.json` (API hỏng thì dùng bản sao, không xoá trang nào).
 *  2. Mỗi câu chuyện qua lại cổng `lintCamNhan` (NĐ 15/2018 Đ.27) + kiểm thương hiệu; dính thì bỏ qua, in tên.
 *  3. Dựng trang `blog/cau-chuyen-thay-doi/cham-soc-khach-hang/<slug>.html` theo khuôn trang câu chuyện sẵn có
 *     (giữ đầu trang, chân trang, CSS), có Article + FAQPage JSON-LD cho SEO và công cụ tìm kiếm AI (GEO).
 *  4. Cập nhật trang mục lục: nhóm "Câu chuyện chăm sóc khách hàng" + kiểu thẻ mới cho cả trang.
 *  5. Thêm địa chỉ vào sitemap.xml và khối riêng trong llms.txt.
 *
 * Chạy:  node scripts/cau-chuyen-cham-soc.mjs            (kéo API)
 *        node scripts/cau-chuyen-cham-soc.mjs file.json  (đọc file, để thử)
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { lintCamNhan } from "./lint-cam-nhan.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const API = "https://hope-ops-hub.vercel.app/api/cau-chuyen/da-duyet";
const SITE = "https://ikihealing.com";
const GOC = "/blog/cau-chuyen-thay-doi/";
const NHOM = "cham-soc-khach-hang";
const TEN_NHOM = "Câu chuyện chăm sóc khách hàng";
const DIR = path.join(ROOT, "blog/cau-chuyen-thay-doi", NHOM);
const KHUON = path.join(ROOT, "blog/cau-chuyen-thay-doi/an-uong-nhe-nhang/an-thuc-duong-uong-vao-de-chiu.html");
const INDEX = path.join(ROOT, "blog/cau-chuyen-thay-doi/index.html");
const CACHE = path.join(ROOT, "data/cau-chuyen-cham-soc.json");
const SP = {
  "True Vegan Protein Pro": "/san-pham/true-vegan-protein.html",
  "Trà Thanh Hương": "/san-pham/tra-thanh-huong.html",
  "Trà Tuệ Minh": "/san-pham/tra-tue-minh.html",
};
const MIEN_TRU = "Nội dung kể lại từ cuộc gọi chăm sóc giữa khách hàng và IKIHEALING, được khách hàng đồng ý chia sẻ; tên khách đã được viết tắt. Đây là cảm nhận cá nhân về trải nghiệm sử dụng, không phải công dụng của sản phẩm; cảm nhận có thể khác nhau ở mỗi người. Sản phẩm là thực phẩm bổ sung, không phải là thuốc và không có tác dụng thay thế thuốc chữa bệnh.";

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const ngayVN = (iso) => { const [y, m, d] = String(iso).slice(0, 10).split("-"); return `${d}/${m}/${y}`; };
const urlCua = (c) => `${GOC}${NHOM}/${c.slug}.html`;

/** Kiểm thương hiệu: gọi IKIHEALING, không IKI trơn / Học Viện (DNA v3.0). */
function loiThuongHieu(c) {
  const s = [c.tieu_de, c.mo_ta, c.nhan_vat, c.truoc, c.cach_dung, c.sau, c.tran_tro, c.cam_nhan, c.trich_dan, ...(c.hoi_dap || []).flatMap((x) => [x.hoi, x.dap])].join(" ");
  const m = s.match(/(?<![\p{L}])IKI(?!HEALING)(?![\p{L}])|Học Viện|Ngộ Đức Vương/u);
  return m ? [m[0]] : [];
}

async function layDanhSach() {
  const f = process.argv[2];
  if (f) return JSON.parse(fs.readFileSync(f, "utf8"));
  try {
    const r = await fetch(API, { headers: { "user-agent": "ikihealing-web-build" } });
    const j = await r.json();
    if (!r.ok || !j.ok || !Array.isArray(j.cau_chuyen)) throw new Error(`API ${r.status}`);
    fs.mkdirSync(path.dirname(CACHE), { recursive: true });
    fs.writeFileSync(CACHE, JSON.stringify(j.cau_chuyen, null, 1) + "\n");
    return j.cau_chuyen;
  } catch (e) {
    console.warn(`! Không kéo được API (${e.message}) — dùng bản sao ${path.relative(ROOT, CACHE)}`);
    return fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, "utf8")) : [];
  }
}

function dungTrang(khuon, c, truoc, sau) {
  const url = SITE + urlCua(c);
  const title = `${c.tieu_de} | ${TEN_NHOM} IKIHEALING`;
  const sp = c.san_pham && SP[c.san_pham] ? c.san_pham : "True Vegan Protein Pro";
  const ld = [{
    "@context": "https://schema.org", "@type": "Article", headline: c.tieu_de, description: c.mo_ta, inLanguage: "vi",
    datePublished: c.ngay, dateModified: c.ngay, articleSection: TEN_NHOM,
    author: { "@type": "Organization", name: "IKIHEALING" },
    publisher: { "@type": "Organization", name: "IKIHEALING", logo: { "@type": "ImageObject", url: `${SITE}/assets/brand/20261119/iki-icon-1024.png` } },
    about: { "@type": "Product", name: sp, brand: { "@type": "Brand", name: "IKIHEALING" } },
    mainEntityOfPage: url,
  }];
  if (c.hoi_dap?.length) ld.push({ "@context": "https://schema.org", "@type": "FAQPage",
    mainEntity: c.hoi_dap.map((x) => ({ "@type": "Question", name: x.hoi, acceptedAnswer: { "@type": "Answer", text: x.dap } })) });
  const nav = [
    truoc ? `<a href="${urlCua(truoc)}"><small>Câu chuyện trước</small>${esc(truoc.tieu_de)}</a>` : `<a href="${GOC}"><small>Góc chia sẻ</small>Xem tất cả câu chuyện</a>`,
    sau ? `<a class="nx" href="${urlCua(sau)}"><small>Câu chuyện tiếp</small>${esc(sau.tieu_de)}</a>` : `<a class="nx" href="${GOC}#${NHOM}"><small>${TEN_NHOM}</small>Về mục lục</a>`,
  ].join("");
  const main = `<main><article class="cc"><div class="cc-crumb"><a href="/blog/">Blog</a> / <a href="${GOC}">Góc chia sẻ</a> / <a href="${GOC}#${NHOM}">${TEN_NHOM}</a></div>`
    + `<span class="cc-eyebrow">${TEN_NHOM} · ${esc(c.chu_de || "")}</span><h1>${esc(c.tieu_de)}</h1>`
    + `<div class="cc-meta"><span>${esc(c.nhan_vat)}</span><span>${ngayVN(c.ngay)}</span><span>Khách hàng đồng ý chia sẻ</span></div>`
    + `<section class="cc-sum"><h2>Tóm tắt 3 ý</h2><div class="cc-3y"><div><b>Trước đó</b><p>${esc(c.truoc)}</p></div><div><b>Cách dùng</b><p>${esc(c.cach_dung)}</p></div><div><b>Sau khi dùng</b><p>${esc(c.sau)}</p></div></div>`
    + `<div class="cc-prod">Sản phẩm khách dùng: <a href="${SP[sp]}">${esc(sp)}</a></div></section>`
    + (c.tran_tro ? `<h2 class="s">Trăn trở thật</h2><p>${esc(c.tran_tro)}</p>` : "")
    + (c.cam_nhan ? `<h2 class="s">Cảm nhận khi dùng</h2><p>${esc(c.cam_nhan)}</p>` : "")
    + (c.trich_dan ? `<h2 class="s">Lời khách hàng</h2><figure class="cc-q"><blockquote>${esc(c.trich_dan)}</blockquote><figcaption>— ${esc(String(c.nhan_vat || "").split(",")[0])}</figcaption></figure>` : "")
    + (c.hoi_dap?.length ? `<h2 class="s">Hỏi nhanh</h2>${c.hoi_dap.map((x) => `<div class="cc-faq"><h3>${esc(x.hoi)}</h3><p>${esc(x.dap)}</p></div>`).join("")}` : "")
    + `<p class="cc-disc">${MIEN_TRU}</p><nav class="cc-nav" aria-label="Câu chuyện khác">${nav}</nav>`
    + `<div class="cc-cta"><p>Tìm hiểu thành phần và cách dùng trước khi chọn.</p><a href="${SP[sp]}">Xem ${esc(sp)} →</a></div></article></main>`;
  let h = khuon
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/<meta name="description" content="[^"]*"/, `<meta name="description" content="${esc(c.mo_ta)}"`)
    .replace(/<link rel="canonical" href="[^"]*"/, `<link rel="canonical" href="${url}"`)
    .replace(/<meta property="og:url" content="[^"]*"/, `<meta property="og:url" content="${url}"`)
    .replace(/<meta property="og:title" content="[^"]*"/, `<meta property="og:title" content="${esc(title)}"`)
    .replace(/<meta property="og:description" content="[^"]*"/, `<meta property="og:description" content="${esc(c.mo_ta)}"`)
    .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, `<script type="application/ld+json">\n${JSON.stringify(ld.length === 1 ? ld[0] : ld, null, 2)}\n</script>`)
    .replace(/<main>[\s\S]*<\/main>/, main);
  if (!h.includes(".cc-faq")) h = h.replace("</style>", ".cc-faq{border-left:3px solid var(--gold);padding:2px 0 2px 14px;margin:0 0 14px}.cc-faq h3{font-size:1rem;margin:0 0 4px;color:var(--ink)}.cc-faq p{margin:0}\n</style>");
  return h;
}

/** Thẻ kiểu mới (CEO 25/11 gửi mẫu): viền trái đậm, dòng nhóm + ngày, tiêu đề, gạch mảnh, 3 đoạn có nhãn màu. */
const CSS_THE = `
/* the-moi-2511: thẻ câu chuyện — viền trái xanh, nhãn màu đứng đầu đoạn (CEO 25/11/2026) */
.cc-card{border:1px solid var(--line);border-left:4px solid var(--g);border-top:1px solid var(--line);border-radius:6px;padding:20px 20px 18px;gap:8px}
.cc-card:hover{border-color:var(--g);border-top-color:var(--g);box-shadow:0 2px 10px rgba(9,73,56,.08)}
.cc-card .cc-eb{font-size:.78rem;font-weight:700;color:var(--g);letter-spacing:.02em}
.cc-card h3{font-size:1.06rem;line-height:1.45;padding-bottom:12px;border-bottom:1px solid var(--line)}
.cc-3yc{gap:10px}.cc-3yc div{line-height:1.6}.cc-3yc b{display:inline;color:var(--g);font-size:.92rem;margin:0 .25em 0 0}.cc-3yc b::after{content:":"}
.cc-3yc p{display:inline;font-size:.92rem}
`;

function capNhatIndex(ds) {
  let s = fs.readFileSync(INDEX, "utf8");
  // Kiểu thẻ mới cho cả trang (một lần).
  if (!s.includes("the-moi-2511")) s = s.replace(/<\/style>/, CSS_THE + "</style>");
  // Dòng nhóm trên đầu mỗi thẻ cũ: lấy tên nhóm từ <h2> của nhóm chứa nó (một lần).
  s = s.replace(/(<section class="cc-grp" id="([^"]+)"><h2>([^<]+)<\/h2>)([\s\S]*?)(<\/section>)/g, (all, mo, id, ten, than, dong) => {
    if (id === NHOM) return all;
    return mo + than.replace(/<a class="cc-card" href="([^"]+)">(?!<span class="cc-eb">)/g, `<a class="cc-card" href="$1"><span class="cc-eb">${ten}</span>`) + dong;
  });
  // Nhóm câu chuyện chăm sóc khách hàng: dựng lại giữa hai dấu mốc.
  const the = ds.map((c) => `<a class="cc-card" href="${urlCua(c)}"><span class="cc-eb">${esc(c.chu_de || TEN_NHOM)} · ${ngayVN(c.ngay)}</span><h3>${esc(c.tieu_de)}</h3>`
    + `<div class="cc-3yc"><div><b>Trước</b> <p>${esc(c.truoc)}</p></div><div><b>Cách dùng</b> <p>${esc(c.cach_dung)}</p></div><div><b>Sau</b> <p>${esc(c.sau)}</p></div></div>`
    + `<small>${esc(c.nhan_vat)} · ${esc(c.san_pham || "True Vegan Protein Pro")}</small></a>`).join("");
  const khoi = ds.length ? `<!-- cc-cham-soc:start --><section class="cc-grp" id="${NHOM}"><h2>${TEN_NHOM}</h2><p>Kể lại từ những cuộc gọi hỏi thăm giữa IKIHEALING và khách hàng sau khi dùng sản phẩm. Khách đồng ý chia sẻ, tên đã viết tắt.</p><div class="cc-cards">${the}</div></section><!-- cc-cham-soc:end -->` : "<!-- cc-cham-soc:start --><!-- cc-cham-soc:end -->";
  if (s.includes("<!-- cc-cham-soc:start -->")) s = s.replace(/<!-- cc-cham-soc:start -->[\s\S]*?<!-- cc-cham-soc:end -->/, khoi);
  else s = s.replace(/(<div class="cc-toc">[\s\S]*?<\/div>)/, `$1${khoi}`);
  // Mục lục nhanh: thêm/bỏ đường dẫn nhóm.
  const toc = `<a href="#${NHOM}">${TEN_NHOM}</a>`;
  if (ds.length && !s.includes(toc)) s = s.replace('<div class="cc-toc">', `<div class="cc-toc">${toc}`);
  if (!ds.length) s = s.replace(toc, "");
  fs.writeFileSync(INDEX, s);
}

function capNhatSitemap(ds) {
  const f = path.join(ROOT, "sitemap.xml");
  let x = fs.readFileSync(f, "utf8");
  const them = ds.map((c) => SITE + urlCua(c)).filter((u) => !x.includes(`<loc>${u}</loc>`))
    .map((u) => `<url><loc>${u}</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>`);
  if (them.length) { x = x.replace("</urlset>", them.join("\n") + "\n</urlset>"); fs.writeFileSync(f, x); }
  return them.length;
}

function capNhatLlms(ds) {
  const f = path.join(ROOT, "llms.txt");
  if (!fs.existsSync(f)) return;
  let t = fs.readFileSync(f, "utf8").replace(/\n*<!-- cc-cham-soc -->[\s\S]*?<!-- \/cc-cham-soc -->\n?/, "\n");
  if (ds.length) t = t.trimEnd() + `\n\n<!-- cc-cham-soc -->\n## ${TEN_NHOM}\n` + ds.map((c) => `- [${c.tieu_de}](${SITE + urlCua(c)}): ${c.mo_ta}`).join("\n") + "\n<!-- /cc-cham-soc -->\n";
  fs.writeFileSync(f, t);
}

const tho = await layDanhSach();
const ds = [];
for (const c of tho) {
  if (!c?.slug || !/^[a-z0-9-]{3,80}$/.test(c.slug) || !c.tieu_de || !c.truoc || !c.sau) { console.warn(`! bỏ bản thiếu trường: ${c?.slug}`); continue; }
  const vp = [...lintCamNhan({ name: c.nhan_vat, text: [c.tieu_de, c.mo_ta, c.truoc, c.cach_dung, c.sau, c.tran_tro, c.cam_nhan, c.trich_dan, ...(c.hoi_dap || []).flatMap((x) => [x.hoi, x.dap])].join(" \n ") }).map((v) => `${v.nhom}: ${v.tu}`), ...loiThuongHieu(c)];
  if (vp.length) { console.warn(`! bỏ "${c.slug}" — dính: ${vp.join("; ")}`); continue; }
  ds.push(c);
}
ds.sort((a, b) => String(b.ngay).localeCompare(String(a.ngay)));
const khuon = fs.readFileSync(KHUON, "utf8");
fs.mkdirSync(DIR, { recursive: true });
let moi = 0;
ds.forEach((c, i) => {
  const f = path.join(DIR, `${c.slug}.html`);
  const h = dungTrang(khuon, c, ds[i + 1], ds[i - 1]);
  if (!fs.existsSync(f) || fs.readFileSync(f, "utf8") !== h) { fs.writeFileSync(f, h); moi++; }
});
capNhatIndex(ds);
const sm = capNhatSitemap(ds);
capNhatLlms(ds);
console.log(`✓ ${TEN_NHOM}: ${ds.length} câu chuyện, ${moi} trang viết mới/cập nhật, ${sm} địa chỉ mới vào sitemap`);
