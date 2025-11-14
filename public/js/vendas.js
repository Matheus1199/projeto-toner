// ==============================
// vendas.js - TonerStock
// ==============================
document.addEventListener("DOMContentLoaded", () => {
    let carrinho = [];

    // === Abrir modal de nova venda ===
    document.getElementById("btnNovaVenda").addEventListener("click", async () => {
        await carregarClientes();
        await carregarToners();

        document.getElementById("modal-bg").classList.remove("hidden");
        atualizarCarrinho();
    });

    // === Fechar modal ===
    function fecharModal() {
        document.getElementById("modal-bg").classList.add("hidden");
        carrinho = [];
        atualizarCarrinho();
    }

    // === Buscar clientes ===
    async function carregarClientes() {
        const resp = await fetch("/clientes");
        const clientes = await resp.json();

        const select = document.getElementById("selectCliente");
        select.innerHTML = `<option value="">Selecione o cliente</option>`;
        clientes.forEach(c => {
            const opt = document.createElement("option");
            opt.value = c.Id_cliente;
            opt.textContent = c.Nome;
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
            opt.value = t.Cod_Produto;
            opt.textContent = `${t.Marca} - ${t.Modelo} (${t.Tipo})`;
            select.appendChild(opt);
        });
    }

    // === Adicionar toner ao carrinho ===
    document.getElementById("btnAdicionarItem").addEventListener("click", () => {
        const tonerSelect = document.getElementById("selectToner");
        const quantidade = parseInt(document.getElementById("inputQtd").value);
        const valorVenda = parseFloat(document.getElementById("inputValor").value);

        if (!tonerSelect.value || isNaN(quantidade) || quantidade <= 0 || isNaN(valorVenda) || valorVenda <= 0) {
            alert("Preencha todos os campos do item corretamente.");
            return;
        }

        const tonerId = parseInt(tonerSelect.value);
        const tonerNome = tonerSelect.options[tonerSelect.selectedIndex].text;

        const subtotal = quantidade * valorVenda;

        carrinho.push({
            Cod_Toner: tonerId,
            Nome_Toner: tonerNome,
            Quantidade: quantidade,
            Valor_Venda: valorVenda,
            Subtotal: subtotal
        });

        atualizarCarrinho();

        // limpa campos
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
                <td class="py-2 px-3">${item.Nome_Toner}</td>
                <td class="py-2 px-3 text-center">${item.Quantidade}</td>
                <td class="py-2 px-3 text-center">R$ ${item.Valor_Venda.toFixed(2)}</td>
                <td class="py-2 px-3 text-center font-semibold">R$ ${item.Subtotal.toFixed(2)}</td>
                <td class="py-2 px-3 text-center">
                    <button class="text-red-500 hover:text-red-700" data-index="${index}">
                        <i class='bx bx-trash'></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
            total += item.Subtotal;
        });

        document.getElementById("totalVenda").textContent = `R$ ${total.toFixed(2)}`;

        // Adiciona eventos de remoção de item
        document.querySelectorAll("#tbodyCarrinho button").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const idx = e.currentTarget.getAttribute("data-index");
                removerItem(idx);
            });
        });
    }

    // === Remover item do carrinho ===
    function removerItem(index) {
        carrinho.splice(index, 1);
        atualizarCarrinho();
    }

    // === Finalizar venda ===
    document.getElementById("btnFinalizarVenda").addEventListener("click", async () => {
        const Cod_Cliente = parseInt(document.getElementById("selectCliente").value);
        const NDoc = document.getElementById("inputDocumento").value;
        const Cond_Pagamento = document.getElementById("inputCondPgto").value;
        const Obs = document.getElementById("inputObs").value;

        if (!Cod_Cliente || !NDoc || carrinho.length === 0) {
            alert("Preencha todos os campos obrigatórios e adicione ao menos um item.");
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
                alert("Venda salva com sucesso!");
                fecharModal();
                listarVendas();
            } else {
                alert(data.error || "Erro ao salvar venda.");
            }
        } catch (err) {
            console.error(err);
            alert("Erro de conexão com o servidor.");
        }
    });

    // === Listar últimas 10 vendas ===
    async function listarVendas() {
        try {
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
        } catch (error) {
            console.error("Erro ao listar vendas:", error);
        }
    }

    // === Início ===
    listarVendas();
});
