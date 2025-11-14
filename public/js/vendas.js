// ==============================
// vendas.js - TonerStock
// ==============================
document.addEventListener("DOMContentLoaded", () => {
    let carrinho = [];

    // === Abrir modal ===
    document.getElementById("btnNovaVenda").addEventListener("click", async () => {
        await carregarClientes();
        document.getElementById("modal-bg").classList.remove("hidden");
        atualizarCarrinho();
    });

    // === Fechar modal ===
    window.fecharModal = function() {
        document.getElementById("modal-bg").classList.add("hidden");
        carrinho = [];
        loteSelecionado = null;
        atualizarCarrinho();
    };

    // ========================
    // PESQUISA DE TONER (ESTOQUE)
    // ========================
    const pesquisaInput = document.getElementById("inputPesquisaToner");
    const resultadoDiv = document.getElementById("resultadoPesquisa");

    let loteSelecionado = null;

    // === PESQUISA AUTOMÁTICA DO TONER NO ESTOQUE ===
    pesquisaInput.addEventListener("input", async () => {
        const termo = pesquisaInput.value.trim();

        if (termo.length < 2) {
            resultadoDiv.innerHTML = "";
            resultadoDiv.classList.add("hidden");
            loteSelecionado = null;
            return;
        }

        const resp = await fetch(`/estoque/buscar?termo=${encodeURIComponent(termo)}`);
        const dados = await resp.json();

        resultadoDiv.innerHTML = "";
        resultadoDiv.classList.remove("hidden");

        if (!dados.length) {
            resultadoDiv.innerHTML =
                "<p class='text-gray-600 p-2'>Nenhum toner encontrado com estoque.</p>";
            return;
        }

        dados.forEach(lote => {
            const card = document.createElement("div");
            card.className =
                "bg-white p-3 rounded-xl mb-2 border shadow-sm cursor-pointer hover:bg-gray-50 transition";

            card.innerHTML = `
                <p class="font-semibold">${lote.Marca} - ${lote.Modelo} (${lote.Tipo})</p>
                <p class="text-sm text-gray-600">Fornecedor: ${lote.Fornecedor}</p>
                <p class="text-sm text-gray-600">Compra #${lote.Cod_Compra}</p>
                <p class="text-sm text-gray-600">Valor de Compra: R$ ${lote.Valor_Compra.toFixed(2)}</p>
                <p class="text-sm text-gray-600">Saldo disponível: ${lote.Saldo}</p>
            `;

            card.addEventListener("click", () => {
                loteSelecionado = lote;
                pesquisaInput.value =
                    `${lote.Marca} - ${lote.Modelo} (${lote.Tipo}) - Saldo: ${lote.Saldo}`;
                resultadoDiv.classList.add("hidden");
            });

            resultadoDiv.appendChild(card);
        });
    });

    // ========================
    // CARREGAR CLIENTES
    // ========================
    async function carregarClientes() {
        const res = await fetch("/clientes");
        const clientes = await res.json();

        const select = document.getElementById("selectCliente");
        select.innerHTML = `<option value="">Selecione o cliente</option>`;

        clientes.forEach(c => {
            const opt = document.createElement("option");
            opt.value = c.Id_cliente;
            opt.textContent = c.Nome;
            select.appendChild(opt);
        });
    }

    // ========================
    // ADICIONAR ITEM AO CARRINHO
    // ========================
    document.getElementById("btnAdicionarItem").addEventListener("click", () => {
        const qtd = parseInt(document.getElementById("inputQtd").value);
        const valorVenda = parseFloat(document.getElementById("inputValor").value);

        if (!loteSelecionado) {
            alert("Selecione um toner do estoque pelo campo de pesquisa.");
            return;
        }

        if (qtd <= 0 || qtd > loteSelecionado.Saldo) {
            alert(`Quantidade inválida! Saldo disponível: ${loteSelecionado.Saldo}`);
            return;
        }

        if (isNaN(valorVenda) || valorVenda <= 0) {
            alert("Informe um valor de venda válido.");
            return;
        }

        const subtotal = qtd * valorVenda;

        carrinho.push({
            Cod_Toner: loteSelecionado.Cod_Toner,
            Id_ItemCompra: loteSelecionado.Id_ItemCompra,
            Nome_Produto: `${loteSelecionado.Marca} - ${loteSelecionado.Modelo}`,
            Quantidade: qtd,
            Valor_Compra: loteSelecionado.Valor_Compra,
            Valor_Venda: valorVenda,
            Subtotal: subtotal
        });

        loteSelecionado = null;
        pesquisaInput.value = "";
        resultadoDiv.innerHTML = "";

        document.getElementById("inputQtd").value = "";
        document.getElementById("inputValor").value = "";

        atualizarCarrinho();
    });

    // ========================
    // ATUALIZAR CARRINHO
    // ========================
    function atualizarCarrinho() {
        const tbody = document.getElementById("tbodyCarrinho");
        tbody.innerHTML = "";

        let total = 0;

        carrinho.forEach((item, i) => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td class="py-2 px-3">${item.Nome_Produto}</td>
                <td class="py-2 px-3 text-center">${item.Quantidade}</td>
                <td class="py-2 px-3 text-center">R$ ${item.Valor_Venda.toFixed(2)}</td>
                <td class="py-2 px-3 text-center font-semibold">R$ ${item.Subtotal.toFixed(2)}</td>
                <td class="py-2 px-3 text-center">
                    <button onclick="removerItem(${i})" class="text-red-500 hover:text-red-700">
                        <i class='bx bx-trash'></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
            total += item.Subtotal;
        });

        document.getElementById("totalVenda").textContent = `R$ ${total.toFixed(2)}`;
    }

    // === Remover item ===
    window.removerItem = function(i) {
        carrinho.splice(i, 1);
        atualizarCarrinho();
    };

    // ========================
    // FINALIZAR VENDA
    // ========================
    document.getElementById("btnFinalizarVenda").addEventListener("click", async () => {
        const Cod_Cliente = parseInt(document.getElementById("selectCliente").value);
        const NDoc = document.getElementById("inputDocumento").value;
        const Cond_Pagamento = document.getElementById("inputCondPgto").value;
        const Obs = document.getElementById("inputObs").value;

        if (!Cod_Cliente || carrinho.length === 0) {
            alert("Selecione um cliente e adicione ao menos um item.");
            return;
        }

        const dados = {
            Cod_Cliente,
            NDoc,
            Cond_Pagamento,
            Obs,
            Itens: carrinho
        };

        try {
            const resp = await fetch("/vendas/finalizar", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(dados)
            });

            const data = await resp.json();
            if (resp.ok) {
                alert("Venda finalizada com sucesso!");
                fecharModal();
                listarVendas();
            } else {
                alert(data.error || "Erro ao finalizar venda.");
            }
        } catch (err) {
            console.error(err);
            alert("Erro no servidor.");
        }
    });

    // ========================
    // LISTAR VENDAS
    // ========================
    async function listarVendas() {
        const resp = await fetch("/vendas/listar");
        const vendas = await resp.json();

        const tbody = document.getElementById("tabelaVendas");
        tbody.innerHTML = "";

        vendas.forEach(v => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td class="py-2 px-3">${v.Cod_Pedido}</td>
                <td class="py-2 px-3">${new Date(v.Data).toLocaleDateString()}</td>
                <td class="py-2 px-3">${v.Nome_Cliente}</td>
                <td class="py-2 px-3">R$ ${parseFloat(v.Valor_Total).toFixed(2)}</td>
                <td class="py-2 px-3">${v.NDoc}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    listarVendas();
});
