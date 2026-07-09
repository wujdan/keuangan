const state = { transactions: [] };

function formatRupiah(num) {
  const n = Number(num) || 0;
  return "Rp " + n.toLocaleString("id-ID");
}

function formatTanggal(str) {
  if (!str) return "-";
  const d = new Date(str);
  if (isNaN(d)) return str;
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : String(str);
  return div.innerHTML;
}

async function fetchTransactions() {
  const res = await fetch(CONFIG.API_URL + "?action=list");
  const json = await res.json();
  if (json.status !== "ok") throw new Error(json.message || "Gagal mengambil data");
  return json.data.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
}

async function postAction(payload) {
  // Sengaja tidak set header Content-Type manual supaya browser memakai
  // text/plain, yang menghindari CORS preflight yang tidak didukung Apps Script.
  const res = await fetch(CONFIG.API_URL, {
    method: "POST",
    body: JSON.stringify(payload)
  });
  const json = await res.json();
  if (json.status !== "ok") throw new Error(json.message || "Gagal menyimpan data");
  return json;
}

function populateMonthFilter(transactions, selectEl) {
  const months = Array.from(new Set(transactions.map(t => (t.tanggal || "").slice(0, 7))))
    .filter(Boolean)
    .sort()
    .reverse();
  months.forEach(m => {
    const opt = document.createElement("option");
    opt.value = m;
    const d = new Date(m + "-01");
    opt.textContent = d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
    selectEl.appendChild(opt);
  });
}

// ---------- Halaman Lihat ----------
async function initViewPage() {
  const statusEl = document.getElementById("status");
  const bodyEl = document.getElementById("ledgerBody");
  const emptyEl = document.getElementById("emptyState");
  const searchInput = document.getElementById("searchInput");
  const monthFilter = document.getElementById("monthFilter");

  if (!CONFIG.API_URL || CONFIG.API_URL.indexOf("GANTI_DENGAN") === 0) {
    statusEl.textContent = "Atur dulu CONFIG.API_URL di config.js dengan URL Web App Apps Script kamu.";
    return;
  }

  statusEl.textContent = "Memuat catatan…";
  try {
    state.transactions = await fetchTransactions();
    statusEl.textContent = "";
    populateMonthFilter(state.transactions, monthFilter);
    renderLedger();
  } catch (err) {
    statusEl.textContent = "Gagal memuat data: " + err.message;
  }

  function renderLedger() {
    const q = searchInput.value.trim().toLowerCase();
    const month = monthFilter.value;
    const filtered = state.transactions.filter(t => {
      const matchQ = !q || (t.keterangan || "").toLowerCase().includes(q) || (t.kategori || "").toLowerCase().includes(q);
      const matchM = !month || (t.tanggal || "").slice(0, 7) === month;
      return matchQ && matchM;
    });

    bodyEl.innerHTML = "";
    emptyEl.hidden = filtered.length !== 0;

    let masuk = 0, keluar = 0, saldo = 0;
    state.transactions.forEach(t => {
      const jumlah = Number(t.jumlah) || 0;
      if (t.jenis === "Masuk") { masuk += jumlah; saldo += jumlah; }
      else { keluar += jumlah; saldo -= jumlah; }
    });

    document.getElementById("totalMasuk").textContent = formatRupiah(masuk);
    document.getElementById("totalKeluar").textContent = formatRupiah(keluar);
    document.getElementById("sealAmount").textContent = formatRupiah(saldo);

    filtered.forEach(t => {
      const tr = document.createElement("tr");
      tr.className = t.jenis === "Masuk" ? "row-income" : "row-expense";
      tr.innerHTML =
        "<td>" + formatTanggal(t.tanggal) + "</td>" +
        "<td>" + escapeHtml(t.keterangan) + "</td>" +
        "<td>" + escapeHtml(t.kategori) + "</td>" +
        "<td><span class=\"tag " + (t.jenis === "Masuk" ? "tag-income" : "tag-expense") + "\">" + t.jenis + "</span></td>" +
        "<td class=\"num\">" + (t.jenis === "Masuk" ? "+ " : "\u2212 ") + formatRupiah(t.jumlah) + "</td>";
      bodyEl.appendChild(tr);
    });
  }

  searchInput.addEventListener("input", renderLedger);
  monthFilter.addEventListener("change", renderLedger);
}

// ---------- Halaman Edit ----------
async function initEditPage() {
  const form = document.getElementById("txForm");
  const listEl = document.getElementById("editList");
  const statusEl = document.getElementById("editStatus");
  const idField = document.getElementById("txId");
  const submitBtn = document.getElementById("submitBtn");
  const cancelBtn = document.getElementById("cancelBtn");
  const kategoriSelect = document.getElementById("kategori");
  const kategoriLain = document.getElementById("kategoriLain");

  const KATEGORI_BAWAAN = Array.from(kategoriSelect.options)
    .map(o => o.value)
    .filter(v => v && v !== "__lainnya__");

  function toggleKategoriLain() {
    if (kategoriSelect.value === "__lainnya__") {
      kategoriLain.hidden = false;
      kategoriLain.required = true;
    } else {
      kategoriLain.hidden = true;
      kategoriLain.required = false;
      kategoriLain.value = "";
    }
  }
  kategoriSelect.addEventListener("change", toggleKategoriLain);

  if (!CONFIG.API_URL || CONFIG.API_URL.indexOf("GANTI_DENGAN") === 0) {
    statusEl.textContent = "Atur dulu CONFIG.API_URL di config.js dengan URL Web App Apps Script kamu.";
    return;
  }

  async function load() {
    statusEl.textContent = "Memuat catatan…";
    try {
      state.transactions = await fetchTransactions();
      statusEl.textContent = "";
      renderList();
    } catch (err) {
      statusEl.textContent = "Gagal memuat data: " + err.message;
    }
  }

  function renderList() {
    listEl.innerHTML = "";
    if (state.transactions.length === 0) {
      listEl.innerHTML = "<p class=\"empty-state\">Belum ada catatan.</p>";
      return;
    }
    state.transactions.forEach(t => {
      const row = document.createElement("div");
      row.className = "edit-row " + (t.jenis === "Masuk" ? "row-income" : "row-expense");
      row.innerHTML =
        "<div class=\"edit-row-main\">" +
        "<span class=\"edit-date\">" + formatTanggal(t.tanggal) + "</span>" +
        "<span class=\"edit-desc\">" + escapeHtml(t.keterangan) + "</span>" +
        "<span class=\"tag " + (t.jenis === "Masuk" ? "tag-income" : "tag-expense") + "\">" + t.jenis + "</span>" +
        "<span class=\"num\">" + formatRupiah(t.jumlah) + "</span>" +
        "</div>" +
        "<div class=\"edit-row-actions\">" +
        "<button type=\"button\" class=\"btn btn-small\" data-action=\"edit\">Ubah</button>" +
        "<button type=\"button\" class=\"btn btn-small btn-danger\" data-action=\"delete\">Hapus</button>" +
        "</div>";
      row.querySelector("[data-action='edit']").addEventListener("click", () => fillForm(t));
      row.querySelector("[data-action='delete']").addEventListener("click", () => removeTx(t.id));
      listEl.appendChild(row);
    });
  }

  function fillForm(t) {
    idField.value = t.id;
    form.tanggal.value = t.tanggal ? String(t.tanggal).slice(0, 10) : "";
    form.keterangan.value = t.keterangan || "";
    form.jenis.value = t.jenis || "Masuk";
    form.jumlah.value = t.jumlah || "";

    if (t.kategori && KATEGORI_BAWAAN.includes(t.kategori)) {
      kategoriSelect.value = t.kategori;
    } else {
      kategoriSelect.value = "__lainnya__";
    }
    toggleKategoriLain();
    if (kategoriSelect.value === "__lainnya__") {
      kategoriLain.value = t.kategori || "";
    }

    submitBtn.textContent = "Simpan Perubahan";
    cancelBtn.hidden = false;
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function resetForm() {
    form.reset();
    idField.value = "";
    toggleKategoriLain();
    submitBtn.textContent = "Tambah Transaksi";
    cancelBtn.hidden = true;
  }

  async function removeTx(id) {
    if (!confirm("Hapus transaksi ini?")) return;
    statusEl.textContent = "Menghapus…";
    try {
      await postAction({ action: "delete", id });
      statusEl.textContent = "Terhapus.";
      await load();
    } catch (err) {
      statusEl.textContent = "Gagal menghapus: " + err.message;
    }
  }

  form.addEventListener("submit", async e => {
    e.preventDefault();
    const kategoriFinal = kategoriSelect.value === "__lainnya__"
      ? kategoriLain.value.trim()
      : kategoriSelect.value;
    const payload = {
      action: idField.value ? "update" : "add",
      id: idField.value || undefined,
      tanggal: form.tanggal.value,
      kategori: kategoriFinal,
      keterangan: form.keterangan.value.trim(),
      jenis: form.jenis.value,
      jumlah: Number(form.jumlah.value)
    };
    if (!payload.tanggal || !payload.jenis || !kategoriFinal || !payload.keterangan || !payload.jumlah) {
      statusEl.textContent = "Lengkapi semua kolom: tanggal, jenis, kategori, keterangan, dan jumlah.";
      return;
    }
    statusEl.textContent = "Menyimpan…";
    submitBtn.disabled = true;
    try {
      await postAction(payload);
      statusEl.textContent = "Tersimpan.";
      resetForm();
      await load();
    } catch (err) {
      statusEl.textContent = "Gagal menyimpan: " + err.message;
    } finally {
      submitBtn.disabled = false;
    }
  });

  cancelBtn.addEventListener("click", resetForm);

  await load();
}