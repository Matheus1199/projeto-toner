// ==============================
// pagrec.js - TonerStock (adaptado: tabela unificada + filtro dropdown)
// ==============================

document.addEventListener("DOMContentLoaded", () => {
  const modalBg = document.getElementById("modal-bg");
  const modalTitle = document.getElementById("modal-title");
  const modalClose = document.getElementById("modal-close");
  const btnCancelar = document.getElementById("btnCancelar");
  const formLanc = document.getElementById("formLancamento");

  // campos
  const fieldId = document.getElementById("fieldId");
  const fieldIdOperacao = document.getElementById("fieldIdOperacao");
  const fieldData = document.getElementById("fieldData");
  const fieldValor = document.getElementById("fieldValor");
  const fieldObs = document.getElementById("fieldObs");
  const fieldBaixa = document.getElementById("fieldBaixa");
  const tblPagRecBody = document.querySelector("#tblPagRec tbody");
  const grupoBaixa = document.getElementById("grupoBaixa");
  const fieldValorBaixa = document.getElementById("fieldValorBaixa");
  const fieldDataBaixa = document.getElementById("fieldDataBaixa");
  const selectFilter = document.getElementById("pagrec-filter");

  // formatações
  const fmtValor = (v) => "R$ " + parseFloat(v || 0).toFixed(2);
  function fmtDataISOtoInput(value) {
    if (!value) return "";
    return String(value).split("T")[0];
  }
  function fmtDataReadable(value) {
    if (!value) return "-";
    const only = String(value).split("T")[0];
    const d = new Date(only + "T00:00:00");
    return isNaN(d.getTime()) ? "-" : d.toLocaleDateString("pt-BR");
  }

  // -----------------------
  // Listar (agora popula tabela unificada)
  // -----------------------
  async function carregarPagRec() {
    const res = await fetch("/pagrec/listar");
    if (!res.ok) return console.error("Erro listar pagrec");
    const data = await res.json();

    tblPagRecBody.innerHTML = "";

    function montarLinha(item, tipoBase) {
      const tr = document.createElement("tr");
      tr.className = "border";

      let categoria = "";

      if (item.Locacao == 1) {
        categoria = "locacao"; // SEMPRE prevalece
      } else if (tipoBase === "receber") {
        categoria = "areceber";
      } else if (tipoBase === "pagar") {
        categoria = "apagar";
      } else {
        categoria = "-";
      }

      tr.dataset.category = categoria;

      const parte = item.Cliente ?? item.Fornecedor ?? "-";

      tr.innerHTML = `
    <!-- DESKTOP -->
    <td class="p-2 hidden sm:table-cell">${item.Id_Lancamento}</td>
    <td class="p-2 hidden sm:table-cell">${fmtDataReadable(item.Data)}</td>
    <td class="p-2 hidden sm:table-cell">${parte}</td>
    <td class="p-2 hidden sm:table-cell">${item.Documento ?? "-"}</td>
    <td class="p-2 hidden sm:table-cell">${fmtValor(item.Valor)}</td>
    <td class="p-2 hidden sm:table-cell">${item.Cond_Pagamento ?? "-"}</td>
    <td class="p-2 hidden sm:table-cell">${categoria}</td>
    <td class="p-2 hidden sm:table-cell">
        <div class="inline-flex gap-2">
            <button class="px-2 py-1 bg-blue-500 text-white rounded text-xs"
                onclick="editarLancamento(${
                  item.Id_Lancamento
                })">Editar</button>
            <button class="px-2 py-1 bg-red-500 text-white rounded text-xs"
                onclick="excluirLancamento(${
                  item.Id_Lancamento
                })">Excluir</button>
        </div>
    </td>

    <!-- MOBILE -->
    <td class="sm:hidden p-3">
        <div class="bg-gray-50 border rounded-xl p-3 space-y-2 text-left">

            <div class="flex justify-between text-sm">
                <span class="font-medium text-gray-600">Data</span>
                <span>${fmtDataReadable(item.Data)}</span>
            </div>

            <div class="flex justify-between text-sm">
                <span class="font-medium text-gray-600">Parte</span>
                <span>${parte}</span>
            </div>

            <div class="flex justify-between text-sm">
                <span class="font-medium text-gray-600">Documento</span>
                <span>${item.Documento ?? "-"}</span>
            </div>

            <div class="flex justify-between text-sm">
                <span class="font-medium text-gray-600">Valor</span>
                <span class="font-bold text-green-600">${fmtValor(
                  item.Valor
                )}</span>
            </div>

            <div class="flex justify-between text-sm">
                <span class="font-medium text-gray-600">Categoria</span>
                <span>${categoria}</span>
            </div>

            <div class="flex gap-2 pt-2">
                <button class="flex-1 py-2 bg-blue-500 text-white rounded text-sm"
                    onclick="editarLancamento(${item.Id_Lancamento})">
                    Editar
                </button>
                <button class="flex-1 py-2 bg-red-500 text-white rounded text-sm"
                    onclick="excluirLancamento(${item.Id_Lancamento})">
                    Excluir
                </button>
            </div>
        </div>
    </td>
`;



      return tr;
    }

    // ===============================
    // A RECEBER NORMAL (Locacao == 0)
    // ===============================
    (data.receber || []).forEach((rec) => {
      const row = montarLinha(rec, "receber");
      tblPagRecBody.appendChild(row);
    });

    // ===============================
    // LOCAÇÃO (Locacao == 1)
    // ===============================
    (data.locacao || []).forEach((lc) => {
      const row = montarLinha(lc, "locacao"); 
      tblPagRecBody.appendChild(row);
    });

    // ===============================
    // A PAGAR
    // ===============================
    (data.pagar || []).forEach((pag) => {
      const row = montarLinha(pag, "pagar");
      tblPagRecBody.appendChild(row);
    });

    applyFilter();
  }


  // -----------------------
  // Filtro dropdown
  // -----------------------
  function applyFilter() {
    const val = selectFilter.value;
    const rows = tblPagRecBody.querySelectorAll("tr");

    rows.forEach((row) => {
      const cat = row.dataset.category;

      if (val === "all") {
        row.style.display = "";
      } else if (cat === val) {
        row.style.display = "";
      } else {
        row.style.display = "none";
      }
    });
  }

    selectFilter.addEventListener("change", applyFilter);

  // -----------------------
  // Modal helpers
  // -----------------------
  function abrirModal() {
    modalBg.classList.remove("hidden");
    modalBg.classList.add("flex");
  }
  function fecharModal() {
    modalBg.classList.add("hidden");
    modalBg.classList.remove("flex");
    formLanc.reset();
    fieldId.value = "";
  }

  modalClose.addEventListener("click", fecharModal);
  btnCancelar.addEventListener("click", (e) => {
    e.preventDefault();
    fecharModal();
  });
  modalBg.addEventListener("click", (e) => {
    if (e.target === modalBg) fecharModal();
  });

  // -----------------------
  // Editar (abrir e popular)
  // -----------------------
  window.editarLancamento = async function (id) {
    try {
      const res = await fetch(`/pagrec/buscar/${id}`);
      if (!res.ok) throw new Error("Erro buscar");
      const rec = await res.json();

      modalTitle.innerText = "Editar Lançamento";
      fieldId.value = rec.Id_Lancamento;
      fieldIdOperacao.value = rec.Id_Operacao ?? "";
      fieldData.value = fmtDataISOtoInput(rec.Data_Vencimento ?? rec.Data);
      fieldValor.value = rec.Valor ?? "";
      fieldObs.value = rec.Obs ?? "";
      fieldBaixa.checked = !!rec.Baixa;

      // popula os campos da baixa
      fieldValorBaixa.value = rec.Valor_Baixa ?? "";
      fieldDataBaixa.value = rec.Data_Baixa
        ? fmtDataISOtoInput(rec.Data_Baixa)
        : "";

      // exibe/oculta grupo
      atualizarCamposBaixa();

      abrirModal();
    } catch (err) {
      console.error(err);
      alert("Erro ao carregar lançamento para edição.");
    }
  };

  // -----------------------
  // Excluir
  // -----------------------
  window.excluirLancamento = async function (id) {
    if (!confirm("Tem certeza que deseja excluir este lançamento?")) return;

    try {
      const res = await fetch(`/pagrec/excluir/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro exclusão");
      alert("Registro excluído com sucesso.");
      carregarPagRec();
    } catch (err) {
      console.error(err);
      alert("Erro ao excluir registro.");
    }
  };

  // -----------------------
  // Salvar (novo / editar)
  // -----------------------
  formLanc.addEventListener("submit", async (e) => {
    e.preventDefault();

    const payload = {
      Id_Operacao: fieldIdOperacao.value
        ? parseInt(fieldIdOperacao.value)
        : null,
      Data_Vencimento: fieldData.value ? fieldData.value + "T00:00:00" : null,
      Valor: fieldValor.value ? parseFloat(fieldValor.value) : 0,
      Obs: fieldObs.value || null,
      Baixa: fieldBaixa.checked ? 1 : 0,
      Valor_Baixa: fieldBaixa.checked
        ? parseFloat(fieldValorBaixa.value) || null
        : null,
      Data_Baixa: fieldBaixa.checked ? fieldDataBaixa.value || null : null,
      Conta: fieldBaixa.checked ? 1 : null,
    };

    const id = fieldId.value;

    try {
      let res;
      if (id) {
        // editar
        res = await fetch(`/pagrec/editar/${id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        // novo
        res = await fetch(`/pagrec/novo`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) throw new Error("Erro ao salvar");
      alert("Salvo com sucesso.");
      fecharModal();
      carregarPagRec();
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar lançamento.");
    }
  });

  function atualizarCamposBaixa() {
    if (fieldBaixa.checked) {
      grupoBaixa.classList.remove("hidden");
    } else {
      grupoBaixa.classList.add("hidden");

      // limpa os campos
      fieldValorBaixa.value = "";
      fieldDataBaixa.value = "";
    }
  }

  fieldBaixa.addEventListener("change", atualizarCamposBaixa);

  // inicializa lista
  carregarPagRec();
});
