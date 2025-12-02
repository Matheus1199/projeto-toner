// ==============================
// pagrec.js - TonerStock
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
    const tblReceberBody = document.querySelector("#tblReceber tbody");
    const tblPagarBody = document.querySelector("#tblPagar tbody");
    const grupoBaixa = document.getElementById("grupoBaixa");
    const fieldValorBaixa = document.getElementById("fieldValorBaixa");
    const fieldDataBaixa = document.getElementById("fieldDataBaixa");
    const fieldContaBaixa = document.getElementById("fieldContaBaixa");

    // formatações
    const fmtValor = v => "R$ " + parseFloat(v || 0).toFixed(2);
    function fmtDataISOtoInput(value) {
        if (!value) return "";
        // aceita "YYYY-MM-DDTHH:MM:SS..." -> retorna "YYYY-MM-DD"
        return String(value).split("T")[0];
    }
    function fmtDataReadable(value) {
        if (!value) return "-";
        const only = String(value).split("T")[0];
        const d = new Date(only + "T00:00:00");
        return isNaN(d.getTime()) ? "-" : d.toLocaleDateString("pt-BR");
    }

    // -----------------------
    // Listar
    // -----------------------
    async function carregarPagRec() {
        const res = await fetch("/pagrec/listar");
        if (!res.ok) return console.error("Erro listar pagrec");
        const data = await res.json();

        tblReceberBody.innerHTML = "";
        tblPagarBody.innerHTML = "";

        // receber (Tipo=2 Operacao=2 conforme sua última regra)
        (data.receber || []).forEach(rec => {
            const row = document.createElement("tr");
            row.className = "border";

            row.innerHTML = `
                <td class="p-2">${rec.Id_Lancamento}</td>
                <td class="p-2">${fmtDataReadable(rec.Data)}</td>
                <td class="p-2">${rec.Cliente ?? "-"}</td>
                <td class="p-2">${rec.Documento ?? "-"}</td>
                <td class="p-2">${fmtValor(rec.Valor)}</td>
                <td class="p-2">${rec.Cond_Pagamento ?? "-"}</td>
                <td class="p-2">
                    <div class="inline-flex gap-2">
                        <button class="px-2 py-1 bg-blue-500 text-white rounded text-xs" onclick="editarLancamento(${rec.Id_Lancamento})">Editar</button>
                        <button class="px-2 py-1 bg-red-500 text-white rounded text-xs" onclick="excluirLancamento(${rec.Id_Lancamento})">Excluir</button>
                    </div>
                </td>
            `;
            tblReceberBody.appendChild(row);
        });

        // pagar (Tipo=1 Operacao=1)
        (data.pagar || []).forEach(pag => {
            const row = document.createElement("tr");
            row.className = "border";

            row.innerHTML = `
                <td class="p-2">${pag.Id_Lancamento}</td>
                <td class="p-2">${fmtDataReadable(pag.Data)}</td>
                <td class="p-2">${pag.Fornecedor ?? "-"}</td>
                <td class="p-2">${pag.Documento ?? "-"}</td>
                <td class="p-2">${fmtValor(pag.Valor)}</td>
                <td class="p-2">${pag.Cond_Pagamento ?? "-"}</td>
                <td class="p-2">
                    <div class="inline-flex gap-2">
                        <button class="px-2 py-1 bg-blue-500 text-white rounded text-xs" onclick="editarLancamento(${pag.Id_Lancamento})">Editar</button>
                        <button class="px-2 py-1 bg-red-500 text-white rounded text-xs" onclick="excluirLancamento(${pag.Id_Lancamento})">Excluir</button>
                    </div>
                </td>
            `;
            tblPagarBody.appendChild(row);
        });
    }

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
    btnCancelar.addEventListener("click", (e) => { e.preventDefault(); fecharModal(); });
    modalBg.addEventListener("click", (e) => { if (e.target === modalBg) fecharModal(); });

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
            fieldDataBaixa.value = rec.Data_Baixa ? fmtDataISOtoInput(rec.Data_Baixa) : "";
            fieldContaBaixa.value = rec.Conta ?? "";

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
            Id_Operacao: fieldIdOperacao.value ? parseInt(fieldIdOperacao.value) : null,
            Data_Vencimento: fieldData.value ? fieldData.value + "T00:00:00" : null,
            Valor: fieldValor.value ? parseFloat(fieldValor.value) : 0,
            Obs: fieldObs.value || null,
            Baixa: fieldBaixa.checked ? 1 : 0,
            Valor_Baixa: fieldBaixa.checked ? (fieldValorBaixa.value || null) : null,
            Data_Baixa: fieldBaixa.checked ? (fieldDataBaixa.value || null) : null,
            Conta: fieldBaixa.checked ? (fieldContaBaixa.value || null) : null
        };

        const id = fieldId.value;

        try {
            let res;
            if (id) {
                // editar
                res = await fetch(`/pagrec/editar/${id}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });
            } else {
                // novo
                res = await fetch(`/pagrec/novo`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
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
        fieldContaBaixa.value = "";
        }
    }

    fieldBaixa.addEventListener("change", atualizarCamposBaixa);

    // inicializa lista
    carregarPagRec();

});
