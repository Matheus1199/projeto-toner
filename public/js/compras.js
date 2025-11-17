// ==============================
// compras.js - TonerStock
// ==============================
document.addEventListener("DOMContentLoaded", () => {

    let carrinho = [];
    let listaToners = [];
    let indiceSelecionado = -1;

    const inputPesquisa = document.getElementById("inputPesquisaToner");
    const listaSugestoes = document.getElementById("listaSugestoesToner");
    const inputTonerHidden = document.getElementById("selectToner");

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
        listaToners = await resp.json();

        inputPesquisa.value = "";
        inputTonerHidden.value = "";
    }

    // ============================================================
    // AUTOCOMPLETE AVANÇADO DO TONER
    // ============================================================

    function atualizarSugestoes(texto) {
        listaSugestoes.innerHTML = "";
        indiceSelecionado = -1;

        const termo = texto.toLowerCase().trim();
        if (termo.length < 2) {
            listaSugestoes.classList.add("hidden");
            return;
        }

        const filtrados = listaToners.filter(t =>
            `${t.Marca} ${t.Modelo} ${t.Tipo}`.toLowerCase().includes(termo)
        );

        if (filtrados.length === 0) {
            listaSugestoes.classList.add("hidden");
            return;
        }

        filtrados.forEach((t, index) => {
            const div = document.createElement("div");
            div.className = "px-3 py-2 cursor-pointer hover:bg-gray-100";
            div.textContent = `${t.Marca} - ${t.Modelo} (${t.Tipo})`;
            div.dataset.id = t.Cod_Produto;

            div.addEventListener("click", () => selecionarToner(index, filtrados));

            listaSugestoes.appendChild(div);
        });

        listaSugestoes.classList.remove("hidden");
    }

    function selecionarToner(indice, filtrados) {
        const item = filtrados[indice];
        if (!item) return;

        inputPesquisa.value = `${item.Marca} - ${item.Modelo} (${item.Tipo})`;
        inputTonerHidden.value = item.Cod_Produto;

        listaSugestoes.classList.add("hidden");
    }

    // Digitação
    inputPesquisa.addEventListener("input", () => {
        atualizarSugestoes(inputPesquisa.value);
    });

    // Navegação por teclado
    inputPesquisa.addEventListener("keydown", (e) => {
        const itens = Array.from(listaSugestoes.children);

        if (e.key === "ArrowDown") {
            e.preventDefault();
            if (indiceSelecionado < itens.length - 1) indiceSelecionado++;
            atualizarDestaque(itens);
        }

        if (e.key === "ArrowUp") {
            e.preventDefault();
            if (indiceSelecionado > 0) indiceSelecionado--;
            atualizarDestaque(itens);
        }

        if (e.key === "Enter") {
            if (indiceSelecionado >= 0 && itens[indiceSelecionado]) {
                const filtrados = listaToners.filter(t =>
                    `${t.Marca} ${t.Modelo} ${t.Tipo}`.toLowerCase()
                        .includes(inputPesquisa.value.toLowerCase().trim())
                );
                selecionarToner(indiceSelecionado, filtrados);
            }
        }

        if (e.key === "Escape") {
            listaSugestoes.classList.add("hidden");
        }
    });

    function atualizarDestaque(itens) {
        itens.forEach((div, i) => {
            div.classList.toggle("bg-gray-200", i === indiceSelecionado);
        });
    }

    // Fecha quando clica fora
    document.addEventListener("click", (e) => {
        if (!inputPesquisa.contains(e.target) && !listaSugestoes.contains(e.target)) {
            listaSugestoes.classList.add("hidden");
        }
    });

    // ============================================================
    // ADICIONAR ITEM AO CARRINHO
    // ============================================================

    document.getElementById("btnAdicionarItem").addEventListener("click", () => {
        const tonerId = parseInt(inputTonerHidden.value);
        const tonerNome = inputPesquisa.value;
        const quantidade = parseInt(document.getElementById("inputQtd").value);
        const valorUnitario = parseFloat(document.getElementById("inputValor").value);

        if (!tonerId || tonerNome.trim() === "" || quantidade <= 0 || isNaN(valorUnitario)) {
            alert("Preencha todos os campos do item corretamente.");
            return;
        }

        const subtotal = quantidade * valorUnitario;

        carrinho.push({
            Cod_Produto: tonerId,
            Nome_Produto: tonerNome,
            Quantidade: quantidade,
            ValorUnitario: valorUnitario,
            Subtotal: subtotal
        });

        atualizarCarrinho();

        inputPesquisa.value = "";
        inputTonerHidden.value = "";
        document.getElementById("inputQtd").value = "1";
        document.getElementById("inputValor").value = "";
    });

    // ============================================================
    // CARRINHO
    // ============================================================

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

    window.removerItem = function(index) {
        carrinho.splice(index, 1);
        atualizarCarrinho();
    };

    // ============================================================
    // FINALIZAR COMPRA
    // ============================================================

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

    // ============================================================
    // LISTAR ÚLTIMAS COMPRAS
    // ============================================================

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
