// ==============================
// pagrec.js - TonerStock
// ==============================

document.addEventListener("DOMContentLoaded", () => {

    // -------------------------------
    // ABRIR MODAL PELO DROPDOWN
    // -------------------------------
    const selectTipoOperacao = document.getElementById("selectTipoOperacao");
    const modal = document.getElementById("modal-bg");

    selectTipoOperacao.addEventListener("change", (e) => {
        const tipo = e.target.value;
        if (!tipo) return;

        // Título do modal
        document.getElementById("modalTitle").textContent =
            tipo === "compra" ? "Novo Pagamento (Compra)" : "Novo Recebimento (Venda)";

        // Tipo correto no banco:
        // Compra = 1, Venda = 2
        document.getElementById("tipoLancamento").value = tipo === "compra" ? 1 : 2;

        // Limpa campos
        document.getElementById("idLancamento").value = "";
        document.getElementById("operacaoLanc").value = "";
        document.getElementById("valorLanc").value = "";
        document.getElementById("vencimentoLanc").value = "";
        document.getElementById("obsLanc").value = "";

        // Abre modal
        modal.classList.remove("hidden");

        // Reset dropdown
        setTimeout(() => selectTipoOperacao.value = "", 200);
    });

    // -------------------------------
    // FECHAR MODAL
    // -------------------------------
    window.fecharModal = function () {
        modal.classList.add("hidden");
    };


    // ==============================
    // LISTAR TODOS LANÇAMENTOS
    // ==============================
    async function carregarLancamentos() {
        try {
            const res = await fetch("/pagrec/listar");
            const dados = await res.json();

            const tbody = document.getElementById("tabelaPagRec");
            if (!tbody) return; // caso página tenha apenas pendentes
            tbody.innerHTML = "";

            if (dados.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center py-4 text-gray-400">
                            Nenhum lançamento encontrado
                        </td>
                    </tr>`;
                return;
            }

            dados.forEach(l => {
                const tr = document.createElement("tr");

                const tipoTexto = l.Tipo === 1 ? "Compra (Pagar)" : "Venda (Receber)";
                const cor = l.Tipo === 1 ? "text-red-600" : "text-green-600";

                tr.innerHTML = `
                    <td class="py-2 px-3">${l.Id_Lancamento}</td>
                    <td class="py-2 px-3 font-semibold ${cor}">${tipoTexto}</td>
                    <td class="py-2 px-3">${l.Operacao}</td>
                    <td class="py-2 px-3">R$ ${Number(l.Valor).toFixed(2)}</td>
                    <td class="py-2 px-3">${new Date(l.Data_Vencimento).toLocaleDateString()}</td>
                    <td class="py-2 px-3">${l.Baixa ? "Sim" : "Não"}</td>
                    <td class="py-2 px-3 text-center">
                        <button class="text-blue-600 hover:text-blue-800 mr-3"
                                onclick="editarLancamento(${l.Id_Lancamento})">
                            <i class='bx bx-edit'></i>
                        </button>
                        <button class="text-red-600 hover:text-red-800"
                                onclick="excluirLancamento(${l.Id_Lancamento})">
                            <i class='bx bx-trash'></i>
                        </button>
                    </td>
                `;

                tbody.appendChild(tr);
            });

        } catch (err) {
            console.error("Erro ao carregar lançamentos:", err);
        }
    }


    // ==============================
    // LISTAR LANÇAMENTOS PENDENTES
    // ==============================
    async function carregarPendentes() {
        try {
            const res = await fetch("/pagrec/pendentes");
            const dados = await res.json();

            const tbody = document.getElementById("tabelaPendentes");
            tbody.innerHTML = "";

            if (dados.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" class="text-center py-4 text-gray-400">
                            Nenhum lançamento pendente
                        </td>
                    </tr>`;
                return;
            }

            dados.forEach(l => {
                const tr = document.createElement("tr");

                tr.innerHTML = `
                    <td class="py-2 px-3">${l.Id_Lancamento}</td>
                    <td class="py-2 px-3">${l.Id_Operacao}</td>
                    <td class="py-2 px-3">${l.Fornecedor || "-"}</td>
                    <td class="py-2 px-3">${new Date(l.Data_Vencimento).toLocaleDateString()}</td>
                    <td class="py-2 px-3">R$ ${Number(l.Valor).toFixed(2)}</td>

                    <td class="py-2 px-3 text-center">
                        <button class="text-blue-600 hover:text-blue-800 mr-3"
                                onclick="editarLancamento(${l.Id_Lancamento})">
                            <i class='bx bx-edit'></i>
                        </button>

                        <button class="text-red-600 hover:text-red-800"
                                onclick="excluirLancamento(${l.Id_Lancamento})">
                            <i class='bx bx-trash'></i>
                        </button>
                    </td>
                `;

                tbody.appendChild(tr);
            });

        } catch (err) {
            console.error("Erro ao carregar pendentes:", err);
        }
    }


    // ==============================
    // SALVAR NOVO OU EDITAR LANÇAMENTO
    // ==============================
    document.getElementById("salvarLancamento")?.addEventListener("click", async () => {

        const payload = {
            Id_Lancamento: document.getElementById("idLancamento").value || null,
            Tipo: Number(document.getElementById("tipoLancamento").value),
            Operacao: Number(document.getElementById("operacaoLanc").value),
            Valor: Number(document.getElementById("valorLanc").value),
            Data_Vencimento: document.getElementById("vencimentoLanc").value,
            Obs: document.getElementById("obsLanc").value
        };

        if (!payload.Operacao || !payload.Valor || !payload.Data_Vencimento) {
            alert("Preencha todos os campos obrigatórios.");
            return;
        }

        try {
            const res = await fetch("/pagrec/salvar", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (res.ok) {
                alert("Lançamento salvo com sucesso!");
                fecharModal();
                carregarLancamentos();
                carregarPendentes();
            } else {
                alert(data.error || "Erro ao salvar lançamento");
            }

        } catch (err) {
            console.error("Erro ao salvar:", err);
            alert("Erro de conexão");
        }
    });


    // ==============================
    // EDITAR LANÇAMENTO (abre modal)
    // ==============================
    window.editarLancamento = async (id) => {
        try {
            const res = await fetch(`/pagrec/buscar/${id}`);
            const lanc = await res.json();

            if (!res.ok) {
                alert("Erro ao buscar lançamento");
                return;
            }

            document.getElementById("modalTitle").textContent = "Editar Lançamento";

            document.getElementById("idLancamento").value = lanc.Id_Lancamento;
            document.getElementById("tipoLancamento").value = Number(lanc.Tipo);
            document.getElementById("operacaoLanc").value = lanc.Operacao;
            document.getElementById("valorLanc").value = lanc.Valor;
            document.getElementById("vencimentoLanc").value = lanc.Data_Vencimento.split("T")[0];
            document.getElementById("obsLanc").value = lanc.Obs || "";

            modal.classList.remove("hidden");

        } catch (err) {
            console.error("Erro ao editar:", err);
        }
    };


    // ==============================
    // EXCLUIR LANÇAMENTO
    // ==============================
    window.excluirLancamento = async (id) => {
        if (!confirm("Deseja excluir este lançamento?")) return;

        try {
            const res = await fetch(`/pagrec/excluir/${id}`, { method: "DELETE" });

            if (res.ok) {
                alert("Lançamento excluído");
                carregarLancamentos();
                carregarPendentes();
            } else {
                alert("Erro ao excluir");
            }

        } catch (err) {
            console.error("Erro ao excluir:", err);
        }
    };


    // ==============================
    // INICIAR
    // ==============================
    carregarLancamentos();
    carregarPendentes();

});
