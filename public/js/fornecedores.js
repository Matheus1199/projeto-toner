document.addEventListener("DOMContentLoaded", () => {
    const tabela = document.getElementById("tabelaFornecedores");

    // === CARREGAR LISTA DE FORNECEDORES ===
    async function carregarFornecedores() {
        try {
            const res = await fetch("/fornecedores");
            const data = await res.json();

            tabela.innerHTML = "";

            data.forEach(f => {
                const tr = document.createElement("tr");
                tr.className = "border-b hover:bg-gray-50";
                tr.innerHTML = `
                    <td class="py-2 px-3">${f.Id_Fornecedor}</td>
                    <td class="py-2 px-3">${f.Nome}</td>
                    <td class="py-2 px-3">${f.Status ? "Ativo" : "Inativo"}</td>
                    <td class="py-2 px-3 text-center">
                        <button class="bg-yellow-400 hover:bg-yellow-500 text-white px-3 py-1 rounded-lg mr-2 editar" data-id="${f.Id_Fornecedor}">
                            <i class='bx bx-edit'></i>
                        </button>
                        <button class="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg excluir" data-id="${f.Id_Fornecedor}">
                            <i class='bx bx-trash'></i>
                        </button>
                    </td>
                `;
                tabela.appendChild(tr);
            });

            // Atribui eventos aos botões depois de carregar a tabela
            document.querySelectorAll(".editar").forEach(btn => {
                btn.addEventListener("click", () => editarFornecedor(btn.dataset.id));
            });

            document.querySelectorAll(".excluir").forEach(btn => {
                btn.addEventListener("click", () => excluirFornecedor(btn.dataset.id));
            });
        } catch (err) {
            console.error("Erro ao carregar fornecedores:", err);
        }
    }

    carregarFornecedores();

    // === MODAL NOVO FORNECEDOR ===
    document.getElementById("btnNovoFornecedor").onclick = () => {
        document.getElementById("modalTitle").innerText = "Novo Fornecedor";
        document.getElementById("idFornecedor").value = "";
        document.getElementById("nomeFornecedor").value = "";
        document.getElementById("statusFornecedor").checked = true;
        document.getElementById("modal-bg").classList.remove("hidden");
    };

    window.fecharModal = function () {
        document.getElementById("modal-bg").classList.add("hidden");
    };

    // === EDITAR FORNECEDOR ===
    async function editarFornecedor(id) {
        try {
            const res = await fetch(`/fornecedores/${id}`);
            const f = await res.json();

            document.getElementById("modalTitle").innerText = "Editar Fornecedor";
            document.getElementById("idFornecedor").value = f.Id_Fornecedor;
            document.getElementById("nomeFornecedor").value = f.Nome;
            document.getElementById("statusFornecedor").checked = !!f.Status;
            document.getElementById("modal-bg").classList.remove("hidden");
        } catch (err) {
            console.error("Erro ao buscar fornecedor:", err);
        }
    }

    // === EXCLUIR FORNECEDOR ===
    async function excluirFornecedor(id) {
        if (!confirm("Tem certeza que deseja excluir este fornecedor?")) return;

        try {
            await fetch(`/fornecedores/${id}`, { method: "DELETE" });
            carregarFornecedores();
        } catch (err) {
            console.error("Erro ao excluir fornecedor:", err);
        }
    }

    // === SALVAR FORNECEDOR ===
    document.getElementById("salvarFornecedor").onclick = () => {
        const id = document.getElementById("idFornecedor").value;
        const data = {
            nome: document.getElementById("nomeFornecedor").value,
            status: document.getElementById("statusFornecedor").checked ? 1 : 0
        };

        const url = id ? `/fornecedores/${id}` : "/fornecedores";
        const method = id ? "PUT" : "POST";

        fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        }).then(() => {
            fecharModal();
            carregarFornecedores();
        });
    };
});
