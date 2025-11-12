// ==============================
// compras.js - TonerStock
// ==============================
document.addEventListener("DOMContentLoaded", () => {
    let carrinho = [];

    // === Abrir modal de nova compra ===
    document.getElementById("btnNovaCompra").addEventListener("click", async () => {
        await carregarFornecedores();
        await carregarToners();

        document.getElementById("modal-bg").classList.remove("hidden");
        atualizarCarrinho();
    });

    // === Fechar modal ===
    window.fecharModal = function() {
        document.getElementById("modal-bg").classList.add("hidden");
        carrinho = [];
        atualizarCarrinho();
    };

    // === Buscar fornecedores ===
    async function carregarFornecedores() {
        const resp = await fetch("/fornecedores/listar");
        const fornecedores = await resp.json();

        const select = document.getElementById("selectFornecedor");
        select.innerHTML = `<option value="">Selecione o fornecedor</option>`;
        fornecedores.forEach(f => {
            const opt = document.createElement("option");
            opt.value = f.Id_Fornecedor;
            opt.textContent = f.Nome;
            select.appendChild(opt);
        });
    }

    // === Buscar toners ===
    async function carregarToners() {
        const resp = await fetch("/toners/listar");
        const toners = await resp.json();

        const select = document.getElementById("selectToner");
        select.innerHTML = `<option value="">Selecione o toner</option>`;
        toners.forEach(t => {
            const opt = document.createElement("option");
            opt.value = t.Cod_Toner;
            opt.textContent = `${t.Marca} - ${t.Modelo} (${t.Tipo})`;
            select.appendChild(opt);
        });
    }

    // === Adicionar toner ao carrinho ===
    document.getElementById("btnAdicionarItem").addEventListener("click", () => {
        const tonerSelect = document.getElementById("selectToner");
        const quantidade = parseInt(document.getElementById("inputQtd").value);
        const valorUnitario = parseFloat(document.getElementById("inputValor").value);

        // Validação simples e robusta
        if (!tonerSelect.value || quantidade <= 0 || isNaN(valorUnitario) || valorUnitario <= 0) {
            alert("Preencha todos os campos do item corretamente.");
            return;
        }

        const tonerId = parseInt(tonerSelect.value);
        const tonerNome = tonerSelect.options[tonerSelect.selectedIndex].text;
        const subtotal = quantidade * valorUnitario;

        carrinho.push({
            Cod_Produto: tonerId,
            Nome_Produto: tonerNome,
            Quantidade: quantidade,
            ValorUnitario: valorUnitario,
            Subtotal: subtotal
        });

        atualizarCarrinho();

        // Limpa campos
        document.getElementById("selectToner").value = "";
        document.getElementById("inputQtd").value = "";
        document.getElementById("inputValor").value = "";
    });

    // === Atualizar visual do carrinho ===
    function atualizarCarrinho() {
        const tbody = document.getElementById("tbodyCarrinho");
        tbody.innerHTML = "";

        let total = 0;

        carrinho.forEach((item, index) => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td class="py-2 px-3">${item.Nome_Produto}</td>
                <td class="py-2 px-3 text-center">${item.Quantidade}</td>
                <td class="py-2 px-3 text-center">R$ ${item.ValorUnitario.toFixed(2)}</td>
                <td class="py-2 px-3 text-center font-semibold">R$ ${item.Subtotal.toFixed(2)}</td>
                <td class="py-2 px-3 text-center">
                    <button onclick="removerItem(${index})" class="text-red-500 hover:text-red-700">
                        <i class='bx bx-trash'></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
            total += item.Subtotal;
        });

        document.getElementById("totalCompra").textContent = `R$ ${total.toFixed(2)}`;
    }

    // === Remover item do carrinho ===
    window.removerItem = function(index) {
        carrinho.splice(index, 1);
        atualizarCarrinho();
    };

    // === Finalizar compra ===
    document.getElementById("btnFinalizarCompra").addEventListener("click", async () => {
        const Cod_Fornecedor = parseInt(document.getElementById("selectFornecedor").value);
        const NDocumento = document.getElementById("inputDocumento").value;
        const Cond_Pagamento = document.getElementById("inputCondPgto").value;
        const Obs = document.getElementById("inputObs").value;

        if (!Cod_Fornecedor || !NDocumento || carrinho.length === 0) {
            alert("Preencha todos os campos obrigatórios e adicione ao menos um item.");
            return;
        }

        const dados = {
            Cod_Fornecedor,
            NDocumento,
            Cond_Pagamento,
            Obs,
            carrinho
        };

        try {
            const resp = await fetch("/compras/finalizar", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(dados)
            });

            const data = await resp.json();

            if (resp.ok) {
                alert("Compra salva com sucesso!");
                fecharModal();
                listarCompras();
            } else {
                alert(data.error || "Erro ao salvar compra.");
            }
        } catch (err) {
            console.error(err);
            alert("Erro de conexão com o servidor.");
        }
    });

    // === Carregar as últimas 10 compras ===
    async function listarCompras() {
        const resp = await fetch("/compras/listar");
        const compras = await resp.json();

        const tbody = document.getElementById("tabelaCompras");
        tbody.innerHTML = "";

        compras.forEach(c => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td class="py-2 px-3">${c.Cod_Compra}</td>
                <td class="py-2 px-3">${new Date(c.Data_Compra).toLocaleDateString()}</td>
                <td class="py-2 px-3">${c.Nome_Fornecedor}</td>
                <td class="py-2 px-3">R$ ${parseFloat(c.Valor_Total).toFixed(2)}</td>
                <td class="py-2 px-3">${c.NDocumento}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    // === Início ===
    listarCompras();
});