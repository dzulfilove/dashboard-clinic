# Slate & Ice — Design System v2.0

> Bahasa UI yang tenang dan profesional untuk dashboard yang padat data. Navy untuk struktur, ice blue untuk permukaan, dan satu aksen coral yang hangat, ditaruh di atas kartu yang lembut dan membulat.

Dokumen ini adalah sumber acuan untuk desainer, developer, dan AI agent yang membangun UI dengan Slate & Ice. Contoh live setiap komponen ada di `slate-ice-design-system.html`.

---

## 1. Prinsip

1. **Navy membangun struktur.** `navy` adalah satu-satunya warna struktural: sidebar, hero banner, header panel, tombol primary, dan state terpilih.
2. **Ice menjaga tampilan tetap ringan.** Tint ice blue dipakai untuk selection, tombol soft, dan blok inset. Konten selalu berada di kartu putih.
3. **Coral itu langka.** Satu aksen hangat per view: underline tab aktif, satu CTA, satu metrik kunci, atau satu seri grafik. Coral tidak dipakai untuk dekorasi.
4. **Lembut, membulat, lega.** Radius membesar mengikuti ukuran elemen. Shadow nyaris tak terlihat. Jarak 24px memisahkan setiap kartu.
5. **Angka lebih dulu.** Metrik ditulis besar dan tebal, satuan dan konteks di bawahnya.

---

## 2. Warna

### 2.1 Brand

| Token | Hex | Penggunaan |
| --- | --- | --- |
| `--si-navy` | `#213145` | Sidebar, hero, header panel, tombol primary, hari terpilih |
| `--si-navy-hover` | `#2C3F57` | Hover pada fill navy |
| `--si-navy-active` | `#18253A` | Pressed pada fill navy |
| `--si-charcoal` | `#222526` | Teks di atas coral, tooltip |
| `--si-slate` | `#516070` | Seri grafik sekunder, ikon |
| `--si-ice` | `#CCDCEF` | Tombol secondary, focus ring, border putus-putus |
| `--si-ice-hover` | `#BED2E9` | Hover tombol secondary |
| `--si-ice-soft` | `#E5EEFF` | Tint terpilih, tombol soft, track progress |
| `--si-ice-faint` | `#EFF4FF` | Hover baris, strip kalender |
| `--si-ice-on-navy` | `#B8C8DB` | Teks/ikon sekunder di atas navy |
| `--si-coral` | `#FF8574` | Aksen tunggal: tab aktif, CTA, seri kunci |
| `--si-coral-hover` | `#F06B58` | Hover pada fill coral |
| `--si-coral-soft` | `#FFE9E5` | Tag coral, tile sparkline |
| `--si-coral-ink` | `#A13E32` | Teks di atas coral-soft, nomor section |

### 2.2 Permukaan & teks

| Token | Hex | Penggunaan |
| --- | --- | --- |
| `--si-canvas` | `#DCE6F5` | Latar di belakang app shell |
| `--si-surface` | `#F8F9FF` | Area halaman / konten |
| `--si-card` | `#FFFFFF` | Kartu, panel, menu, modal |
| `--si-sunken` | `#EFF4FF` | Input, header tabel, blok inset |
| `--si-line` | `#E5EEFF` | Pembatas antar baris |
| `--si-line-strong` | `#D3E4FE` | Garis putus-putus, tombol outline |
| `--si-ink` | `#0B1C30` | Teks utama dan angka |
| `--si-ink-muted` | `#44474C` | Teks sekunder, label |
| `--si-ink-subtle` | `#74777C` | Hanya untuk placeholder, disabled, dan timestamp |

### 2.3 Status

| Token | Hex | Penggunaan |
| --- | --- | --- |
| `--si-success` / `-soft` / `-ink` | `#10B981` / `#ECFDF5` / `#047857` | Ikon dan titik / fill tag dan alert / teks |
| `--si-warning` / `-soft` / `-ink` | `#F59E0B` / `#FFFBEB` / `#92400E` | Ikon dan titik / fill tag dan alert / teks |
| `--si-danger` / `-soft` / `-ink` | `#EF4444` / `#FEF2F2` / `#B91C1C` | Border error dan ikon / input invalid, tag / teks, tombol danger |

### 2.4 Proporsi pemakaian

Surface **60%** · Card **22%** · Navy **10%** · Ice **5%** · Coral **≤3%**

- ✅ Pakai coral untuk satu hal per view.
- ❌ Jangan taruh teks putih di atas coral (2.4:1). Teks di atas coral selalu `charcoal` (6.5:1).
- ❌ Jangan pakai warna status untuk dekorasi.

### 2.5 Warna grafik

Urutan seri: `navy` → `coral` → `slate` → `success`. Setiap seri harus punya label, legend, atau angka di sebelahnya.

---

## 3. Tipografi

| Keluarga | Token | Font | Weight |
| --- | --- | --- | --- |
| Display | `--si-font-display` | Plus Jakarta Sans | 600 / 700 / 800 |
| Body | `--si-font-sans` | Inter | 400 / 500 / 600 / 700 |
| Data | `--si-font-mono` | JetBrains Mono | 500 / 600 |

Mono dipakai secukupnya: jam, ID, dan persentase di tabel.

| Style | Keluarga | Size / line-height | Weight | Tracking | Contoh |
| --- | --- | --- | --- | --- | --- |
| `display` | Display | 48 / 56 | 800 | −0.03em | Clean dashboards |
| `title-lg` | Display | 30 / 38 | 700 | −0.015em | Good Day, Dr. Nicholls! |
| `title-md` | Display | 22 / 30 | 700 | −0.01em | Dr. Alisha Nicholls |
| `title-sm` | Display | 18 / 26 | 700 | 0 | Weekly summary |
| `metric` | Display | 26 / 32 | 700 | −0.01em | 1,284 |
| `body-lg` | Body | 16 / 24 | 400 | 0 | Have a nice Monday! |
| `body` | Body | 15 / 22 | 400 | 0 | Meeting with Dr. Williams |
| `body-sm` | Body | 14 / 20 | 400 | 0 | You completed 14 of 22… |
| `label` | Body | 14 / 20 | 600 | 0 | Add plan |
| `overline` | Body | 13 / 18 | 600 | 0.06em, UPPERCASE | MY CALENDAR |
| `caption` | Body | 12 / 16 | 500 | 0.01em | +12% vs average |
| `mono` | Data | 13 / 18 | 500 | 0 | #PT-0941 · 2:30 pm |

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet">
```

---

## 4. Spacing & layout

Grid dasar 4px.

| Token | Nilai | Penggunaan |
| --- | --- | --- |
| `--si-space-1` | 4px | Ikon ↔ label |
| `--si-space-2` | 8px | Label ↔ field |
| `--si-space-3` | 12px | Padding chip / baris |
| `--si-space-4` | 16px | Jarak antar elemen dalam kartu |
| `--si-space-5` | 20px | Padding kartu ringkas |
| `--si-space-6` | 24px | Padding kartu · gap grid |
| `--si-space-8` | 32px | Padding hero |
| `--si-space-10` | 40px | Padding halaman |
| `--si-space-12` | 48px | Pemisah section |
| `--si-space-16` | 64px | Jarak section besar |

### Breakpoint

| Lebar | Layout | Padding |
| --- | --- | --- |
| ≥ 1240px | Rail 88px · Main (fluid) · Side 400px | 24 |
| 720 – 1239px | Rail · Main (panel samping turun ke bawah) | 24 |
| < 720px | Satu kolom, rail jadi top bar | 16 |

---

## 5. Radius

| Token | Nilai | Penggunaan |
| --- | --- | --- |
| `--si-radius-xs` | 6px | Tag, chip kecil |
| `--si-radius-sm` | 10px | Tombol, input, icon button |
| `--si-radius-md` | 14px | Menu, blok inset, hari terpilih, alert |
| `--si-radius-lg` | 20px | Kartu, panel |
| `--si-radius-xl` | 28px | Sidebar, hero, app shell |
| `--si-radius-full` | 9999px | Avatar, titik status, toggle, track |

Aturan: semakin besar elemennya, semakin besar radiusnya.

## 6. Elevasi

| Token | Nilai | Penggunaan |
| --- | --- | --- |
| `--si-shadow-xs` | `0 1px 2px rgba(11,28,48,.05)` | Icon button, search |
| `--si-shadow-card` | `0 6px 24px rgba(33,49,69,.06)` | Kartu dan panel |
| `--si-shadow-raised` | `0 12px 32px rgba(33,49,69,.12)` | Menu, kartu saat hover |
| `--si-shadow-modal` | `0 24px 64px rgba(11,28,48,.20)` | Modal, toast |
| `--si-shadow-navy` | `0 8px 20px rgba(33,49,69,.28)` | Hover primary, hari terpilih |

Kedalaman terutama datang dari kartu putih di atas surface ice. Kartu tidak pakai border.

---

## 7. Ikonografi

- **Material Symbols Rounded**, filled (`FILL 1`), weight 500.
- Ukuran: 20px default · 18px di tombol dan chip · 16px inline.
- Warna: `navy` untuk aksi di atas putih · `ink-muted` untuk dekorasi · `ice-on-navy` di atas navy (putih saat aktif).
- Ikon di tile 36–40px pakai radius `sm`, fill `-soft`, dan ikon warna `-ink`.

```html
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,400..600,0..1,0" rel="stylesheet">
```

## 8. Motion

| Token | Durasi | Penggunaan |
| --- | --- | --- |
| `--si-dur-fast` | 120ms | Press, checkmark, ganti ikon |
| `--si-dur` | 200ms | Hover, toggle, perubahan warna, kartu terangkat |
| `--si-dur-slow` | 320ms | Modal, toast, isi progress |
| `--si-ease` | `cubic-bezier(.2,.7,.2,1)` | Satu kurva untuk semuanya |

Selalu hormati `prefers-reduced-motion: reduce`.

---

## 9. Komponen

Semua class memakai prefix `si-`.

### Button — `.si-btn`
- Tinggi 40px (`--sm` 32px, `--lg` 48px), radius `sm`, padding 0 20px, `label` 14/600.
- Varian:
  - `--primary`: navy, teks putih, hover dengan `shadow-navy`.
  - `--secondary`: ice, teks navy.
  - `--accent`: coral, teks **charcoal**.
  - `--soft`: ice-soft, teks navy. Dipakai juga sebagai pemicu dropdown "Today ▾".
  - `--outline`: putih dengan inset `line-strong`.
  - `--ghost`: transparan, teks navy.
  - `--danger`: danger-ink, teks putih.
  - `--dashed`: lebar penuh, tinggi 48px, border putus-putus ice, untuk "Add plan +".
- Disabled: fill `sunken`, teks `ink-subtle`.
- Loading: spinner + label "…ing", tombol disabled.
- Satu tombol primary per view. Label sentence case, kata kerja di depan.

### Icon button — `.si-icon-btn`
44×44, putih, `shadow-xs`, ikon navy. Titik notifikasi coral 8px dengan ring putih.

### Text input — `.si-input`
- Tinggi 44px, fill `sunken`, tanpa border saat diam, radius `sm`.
- Hover: border `line-strong`. Focus: fill putih, border `navy`, halo 3px `ice-soft`.
- Error: fill `danger-soft`, border `danger`, pesan `danger-ink`. Success: border `success`.
- Varian search: fill putih, `shadow-xs`, tinggi 48px, ikon di kanan.
- Label 14/600 di atas field. Helper teks `caption` di bawah. "Required" sebagai caption subtle di kanan label.

### Select / textarea
Gaya sama dengan input. Select diberi ikon `expand_more` di kanan. Textarea minimal 96px dengan penghitung karakter di label.

### Checkbox / radio — `.si-check`
Kotak 20px, sudut 6px, border 1.5px `ink-subtle`. Checked: fill navy + centang putih. Radio berbentuk bulat; saat checked, ring navy 6px. Judul `body` 500, deskripsi `caption`.

### Switch — `.si-switch`
Track pill 44×24 (`line-strong` off, `navy` on), knob putih 18px. Perubahan berlaku langsung.

### Range — `.si-range`
Track 6px, isi navy, thumb bulat 20px dengan ring coral. Nilai ditampilkan di tag `ice`.

### Segmented — `.si-segment`
Tray `sunken`. Segmen aktif berupa chip putih, teks navy, `shadow-xs`.

### Sidebar — `.si-sidebar`
Rail navy 88px, radius `xl`. Wordmark putih ExtraBold dengan titik coral. Item ikon 48px: `ice-on-navy` saat diam, latar putih 18% saat aktif. Badge jumlah berwarna coral. Logout di paling bawah.

### Tabs — `.si-tabs`
Underline tabs di atas garis 1px `line`. Tab aktif: teks navy + underline 2px **coral**. Badge jumlah opsional di `ice-soft`.

### Breadcrumbs / pagination
- Breadcrumb: link `ink-muted` (hover navy), pemisah `chevron_right`, halaman saat ini 600.
- Pagination: tombol 36px. Halaman aktif fill navy + `shadow-navy`.

### Menu — `.si-menu`
Lebar 260px, radius `md`, `shadow-raised`, padding 8px. Item: ikon + label + shortcut mono. Hover `ice-faint`. Item destruktif di bawah pembatas, teks `danger-ink`.

### Card — `.si-card`
Putih, radius `lg`, `shadow-card`, padding 24, gap 16. Header: `overline` di kiri, tombol "⋯" atau dropdown soft di kanan. Varian interaktif terangkat 2px dengan `shadow-raised` saat hover.

### Panel — `.si-panel`
Kartu dengan header band navy (radius `lg`), judul putih uppercase, dan aksi semi-transparan (`.si-on-navy`) di kanan. Dipakai untuk modul personal: profil, kalender.

### Banner — `.si-banner`
Hero navy, radius `xl`, padding 28/32, tinggi minimal 200. Chip tanggal di kiri atas, sapaan `title-lg`, dan subjudul `ice-on-navy`. Ilustrasi di setengah kanan memakai warna ice, coral, dan success. Satu banner per halaman.

### Profile card
Avatar bulat 92px dengan ring ganda (putih, lalu ice-soft), nama `title-md`, peran `overline`, lokasi dengan ikon coral. Baris fakta 3 kolom yang dipisah garis `line`: `caption` di atas nilai tebal.

### Stat card / KPI
- **Stat card:** tile sparkline 96×76 (fill `-soft` + garis aksen), lalu `metric`, satuan `body-sm`, dan tag delta (`danger` turun, `success` naik, `ice` datar).
- **KPI:** tile ikon 36px + `overline`, `metric`, dan caption dengan delta berwarna.

### Progress ring — `.si-ring`
Donut 156px, stroke 14, track `ice-soft`, segmen navy → coral → slate dengan ujung membulat. Di tengah: angka 38px + `overline`. Selalu dipasangkan dengan blok rincian `sunken` dan legend.

### Progress bar — `.si-bar`
Label di kiri, persentase mono di kanan, track 6px `ice-soft` (10px untuk varian besar), isi warna kategori.

### Day picker — `.si-days`
Strip mingguan di `ice-faint` yang menempel di bawah header panel. Nama hari `caption`, tanggal tebal. Hari terpilih: kartu navy, teks putih, `shadow-navy`.

### Agenda — `.si-agenda`
Kolom jam mono subtle, titik kategori 8px (coral = meeting, navy = konsultasi, success = pemeriksaan, slate = lab), lalu teks event. Baris dipisah garis putus-putus `line-strong`.

### List item / timeline
- **List item:** avatar + nama 600 + sub-baris muted + tag status di kanan.
- **Timeline:** titik ring 12px di atas garis vertikal 2px `line`.

### Table — `.si-table`
Header `overline` uppercase di band `sunken` yang membulat. Sel padding 14/16, pembatas `line`, hover `surface`. Kolom pertama: avatar + nama + sub-baris. ID dan jam pakai mono. Status pakai tag. Aksi berupa tombol ghost rata kanan.

### Tag — `.si-tag`
Tinggi 24px, radius `xs`, 12/600. Tone: `--navy`, `--ice`, `--coral`, `--success`, `--warning`, `--danger`, `--neutral`. Opsional titik `<i>` untuk status live, atau `--pill` untuk bentuk pill.

### Avatar — `.si-avatar`
Bulat. Ukuran: `--sm` 32, default 40, `--lg` 56, `--xl` 92. Inisial di atas fill `-soft` dengan teks warna `-ink`. Titik status hijau 10px. Bisa ditumpuk dengan overlap −10px.

### Accordion — `.si-acc`
Baris kartu putih, radius `md`. Summary 15/600 dengan chevron yang berputar 180° saat terbuka.

### Empty state — `.si-empty`
Tile ikon 64px ice-soft, judul 17px, deskripsi muted maksimal 280px, dan satu tombol primary kecil.

### Alert — `.si-alert`
Kartu putih, radius `md`. Warna hanya ada di tile ikon 36px (`-soft` + ikon `-ink`). Judul 15/600, pesan 14 muted, tombol tutup opsional. Varian banner inline: strip `ice-soft` dengan aksi di kanan.

### Modal — `.si-modal`
Backdrop `rgba(11,28,48,.42)` + blur 4px. Kartu putih maksimal 440px, radius `lg`, `shadow-modal`, padding 24. Judul 20/700, isi muted, ringkasan `sunken` opsional, aksi rata kanan: Outline + Primary. Tutup dengan Esc atau klik backdrop.

### Toast — `.si-toast`
Pill navy, radius `md`, `shadow-modal`, ikon centang mint, teks 14/500 putih, aksi coral. Muncul di kanan bawah dan hilang otomatis setelah sekitar 3–5 detik.

### Tooltip / skeleton
- **Tooltip:** kotak charcoal, teks putih 12px, radius 8, panah di bawah.
- **Skeleton:** blok `sunken` dengan efek shimmer yang meniru layout akhir.

---

## 10. Pola layout — Dashboard shell

```
┌────┬────────────────────────────────────┬──────────────┐
│    │ [Search……………]            [🔔] [⚙] │ ┌──────────┐ │
│ N  │ ┌────────────────────────────────┐ │ │MY PROFILE│ │
│ A  │ │ Banner (navy, radius-xl)       │ │ │ avatar   │ │
│ V  │ └────────────────────────────────┘ │ │ facts    │ │
│ Y  │ [StatCard] [StatCard] [StatCard]   │ └──────────┘ │
│    │ ┌───────────────┐┌───────────────┐ │ ┌──────────┐ │
│ R  │ │ ProgressRing  ││ ProgressBar   │ │ │CALENDAR  │ │
│ A  │ │ + breakdown   ││ + Add plan    │ │ │DayPicker │ │
│ I  │ └───────────────┘└───────────────┘ │ │Agenda    │ │
│ L  │                                    │ └──────────┘ │
└────┴────────────────────────────────────┴──────────────┘
 88px            fluid                       400px
```

- Canvas `#DCE6F5` → shell `surface` radius 28, padding 24 → gap 24 di semua sisi.
- Urutan kolom utama: top bar → banner → baris KPI → dua kartu grafik.
- Kolom samping: panel saja (header navy).

---

## 11. Konten & gaya bahasa

Hangat, presisi, profesional.

| Elemen | Aturan | Contoh |
| --- | --- | --- |
| Label section | Overline UPPERCASE, 2–3 kata | MY CALENDAR |
| Tombol | Sentence case, kata kerja di depan | Add plan |
| Metrik | Angka dulu, satuan di bawah | **27** / hospital patients |
| Delta | Tanda + pembanding | +12% vs average |
| Waktu / tanggal | 12 jam huruf kecil · tanggal pendek | 2:30 pm · Apr 13, 2021 |

- ✅ "Lab upload failed — the file is larger than 20 MB."
- ❌ "Oops! Something went wrong 😕"
- ✅ "Reschedule consultation?" dengan tombol "Reschedule" / "Keep"
- ❌ "Are you sure?" dengan tombol "OK" / "Cancel"

Tanpa emoji dan tanpa tanda seru di teks UI, kecuali sapaan di hero.

---

## 12. Aksesibilitas

| Foreground / background | Rasio | Hasil |
| --- | --- | --- |
| ink / surface | 16.3:1 | AAA |
| ink-muted / card | 9.3:1 | AAA |
| white / navy | 13.2:1 | AAA |
| ice-on-navy / navy | 7.8:1 | AAA |
| navy / ice | 9.5:1 | AAA |
| navy / ice-soft | 11.3:1 | AAA |
| charcoal / coral | 6.5:1 | AA |
| coral-ink / coral-soft | 5.6:1 | AA |
| success-ink / success-soft | 5.2:1 | AA |
| warning-ink / warning-soft | 6.8:1 | AA |
| danger-ink / danger-soft | 5.9:1 | AA |
| ink-subtle / card | 4.5:1 | Hanya untuk placeholder |
| white / coral | 2.4:1 | ❌ Jangan dipakai |

- Focus: ring 3px `ice` di setiap kontrol interaktif. Input memakai border navy + halo ice-soft.
- Warna aksen di grafik selalu disertai label teks; jangan hanya mengandalkan warna.
- Icon button wajib punya `aria-label`. Modal memakai `role="dialog"` + `aria-modal`. Toast di region `aria-live="polite"`.
- Target sentuh minimal 32px (idealnya 40–44px).

---

## 13. Token (CSS)

```css
:root{
  /* Brand */
  --si-navy:#213145; --si-navy-hover:#2c3f57; --si-navy-active:#18253a;
  --si-charcoal:#222526; --si-slate:#516070;
  --si-ice:#ccdcef; --si-ice-hover:#bed2e9; --si-ice-soft:#e5eeff; --si-ice-faint:#eff4ff; --si-ice-on-navy:#b8c8db;
  --si-coral:#ff8574; --si-coral-hover:#f06b58; --si-coral-soft:#ffe9e5; --si-coral-ink:#a13e32;
  /* Status */
  --si-success:#10b981; --si-success-soft:#ecfdf5; --si-success-ink:#047857;
  --si-warning:#f59e0b; --si-warning-soft:#fffbeb; --si-warning-ink:#92400e;
  --si-danger:#ef4444;  --si-danger-soft:#fef2f2;  --si-danger-ink:#b91c1c;
  /* Surfaces & ink */
  --si-canvas:#dce6f5; --si-surface:#f8f9ff; --si-card:#ffffff; --si-sunken:#eff4ff;
  --si-line:#e5eeff; --si-line-strong:#d3e4fe;
  --si-ink:#0b1c30; --si-ink-muted:#44474c; --si-ink-subtle:#74777c;
  /* Type */
  --si-font-display:"Plus Jakarta Sans","Inter",system-ui,sans-serif;
  --si-font-sans:"Inter",system-ui,sans-serif;
  --si-font-mono:"JetBrains Mono",ui-monospace,monospace;
  /* Spacing */
  --si-space-1:4px; --si-space-2:8px; --si-space-3:12px; --si-space-4:16px; --si-space-5:20px;
  --si-space-6:24px; --si-space-8:32px; --si-space-10:40px; --si-space-12:48px; --si-space-16:64px;
  /* Radius */
  --si-radius-xs:6px; --si-radius-sm:10px; --si-radius-md:14px; --si-radius-lg:20px; --si-radius-xl:28px; --si-radius-full:9999px;
  /* Elevation */
  --si-shadow-xs:0 1px 2px rgba(11,28,48,.05);
  --si-shadow-card:0 6px 24px rgba(33,49,69,.06);
  --si-shadow-raised:0 12px 32px rgba(33,49,69,.12);
  --si-shadow-modal:0 24px 64px rgba(11,28,48,.20);
  --si-shadow-navy:0 8px 20px rgba(33,49,69,.28);
  /* Motion */
  --si-ease:cubic-bezier(.2,.7,.2,1); --si-dur-fast:120ms; --si-dur:200ms; --si-dur-slow:320ms;
}
```

---

## 14. Checklist sebelum rilis

- [ ] Hanya ada satu tombol primary dan maksimal satu elemen coral per view.
- [ ] Semua konten berada di kartu putih; tidak ada border kartu.
- [ ] Radius sesuai ukuran elemen (tag 6 → kontrol 10 → kartu 20 → shell 28).
- [ ] Setiap warna grafik punya label atau legend.
- [ ] Semua teks ≥ 4.5:1; `ink-subtle` hanya untuk placeholder dan disabled.
- [ ] Focus ring terlihat di semua kontrol; icon button punya `aria-label`.
- [ ] Label section uppercase overline; tombol sentence case.
- [ ] Layout sudah dicek di ≥1240, 720–1239, dan <720px.

---

*Changelog:*
- **v2.0:** Gaya dashboard yang bersih dengan palet Slate & Ice asli (navy, ice, coral), kartu membulat, Inter + Plus Jakarta Sans, dan ikon Material Symbols Rounded.
- **v1:** Spesifikasi rectilinear asli (v2.4.0).
