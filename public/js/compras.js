// ==============================
// compras.js - TonerStock (ATUALIZADO para modal com 2 abas)
// ==============================

let compraRecemCriada = null;

document.addEventListener("DOMContentLoaded", () => {

    // ===== memória local (antes de inserir no banco) =====
    let carrinho = [];
    let listaToners = [];
    let listaFornecedores = [];
    let listaFinanceiro = []; // { vencimento, valor, ean, obs, conta, tipo, operacao }

    let indiceSelecionado = -1;

    // ===== DOM =====
    const inputPesquisa = document.getElementById("inputPesquisaToner");
    const listaSugestoes = document.getElementById("listaSugestoesToner");
    const inputTonerHidden = document.getElementById("selectToner");

    const btnNovaCompra = document.getElementById("btnNovaCompra");
    const modalBg = document.getElementById("modal-bg");

    const tbodyCarrinho = document.getElementById("tbodyCarrinho");
    const totalCompraEl = document.getElementById("totalCompra");
    const selectFornecedor = document.getElementById("selectFornecedor");
    const inputQtd = document.getElementById("inputQtd");
    const inputValor = document.getElementById("inputValor");
    const inputDocumento = document.getElementById("inputDocumento");
    const inputCondPgto = document.getElementById("inputCondPgto");
    const inputObs = document.getElementById("inputObs");

    // financeiro DOM
    const lancVencimento = document.getElementById("lancVencimento");
    const lancValor = document.getElementById("lancValor");
    const lancEAN = document.getElementById("lancEAN");
    const lancObs = document.getElementById("lancObs");
    const btnAddParcela = document.getElementById("btnAddParcela");
    const tbodyFinanceiro = document.getElementById("tbodyFinanceiro");
    const totalFinanceiroEl = document.getElementById("totalFinanceiro");
    const inputRMA = document.getElementById("inputRMA");
    const fieldSemFinanceiro = document.getElementById("fieldSemFinanceiro");
    const btnSalvarCompra = document.getElementById("btnSalvarCompra");

    // Tabs
    const tabButtons = document.querySelectorAll('.tab-item');
    const tabDetalhes = document.getElementById('tab-detalhes');
    const tabFinanceiro = document.getElementById('tab-financeiro');

    // ===== util =====
    const formatBRL = (v) => `R$ ${Number(v || 0).toFixed(2)}`;

    // ===== abre modal =====
    btnNovaCompra && btnNovaCompra.addEventListener("click", async () => {
        await carregarFornecedores();
        await carregarToners();
        limparEstado();
        modalBg.classList.remove("hidden");
        // garantir aba detalhes inicialmente
        setActiveTab('detalhes');
        atualizarCarrinho();
        atualizarTabelaFinanceiro();
    });

    // fechar modal (usado no HTML)
    window.fecharModal = function() {
        modalBg.classList.add("hidden");
        limparEstado();
    };

    function limparEstado() {
        carrinho = [];
        listaFinanceiro = [];
        inputPesquisa.value = '';
        inputTonerHidden.value = '';
        inputQtd.value = '1';
        inputValor.value = '';
        inputDocumento.value = '';
        inputCondPgto.value = '';
        inputObs.value = '';
        lancVencimento.value = '';
        lancValor.value = '';
        lancEAN.value = '';
        lancObs.value = '';
        atualizarCarrinho();
        atualizarTabelaFinanceiro();
    }

    // ===== carregar selects =====
    async function carregarFornecedores() {
        try {
            const resp = await fetch("/fornecedores/listar");
            const fornecedores = await resp.json();
            listaFornecedores = fornecedores || [];
            selectFornecedor.innerHTML = `<option value="">Selecione o fornecedor</option>`;
            listaFornecedores.forEach(f => {
                const opt = document.createElement('option');
                opt.value = f.Id_Fornecedor || f.id || f.Id;
                opt.textContent = f.Nome || f.nome;
                selectFornecedor.appendChild(opt);
            });
        } catch (err) {
            console.warn('Erro carregar fornecedores', err);
            selectFornecedor.innerHTML = `<option value="">Erro ao carregar</option>`;
        }
    }

    async function carregarToners() {
        try {
            const resp = await fetch("/toners/listar");
            listaToners = await resp.json();
            inputPesquisa.value = '';
            inputTonerHidden.value = '';
        } catch (err) {
            console.warn('Erro carregar toners', err);
            listaToners = [];
        }
    }

    // =========================
    // AUTOCOMPLETE TONER
    // =========================

    function atualizarSugestoes(texto) {
        listaSugestoes.innerHTML = "";
        indiceSelecionado = -1;

        const termo = texto.toLowerCase().trim();
        if (termo.length < 2) {
            listaSugestoes.classList.add("hidden");
            return;
        }

        const filtrados = listaToners.filter(t =>
            `${t.Marca || ''} ${t.Modelo || ''} ${t.Tipo || ''}`.toLowerCase().includes(termo)
        );

        if (filtrados.length === 0) {
            listaSugestoes.classList.add("hidden");
            return;
        }

        filtrados.forEach((t, index) => {
            const div = document.createElement("div");
            div.className = "px-3 py-2 cursor-pointer hover:bg-gray-100";
            div.textContent = `${t.Marca || ''} - ${t.Modelo || ''} ${t.Tipo ? '(' + t.Tipo + ')' : ''}`.trim();
            div.dataset.id = t.Cod_Produto;

            div.addEventListener("click", () => {
                selecionarToner(index, filtrados);
            });

            listaSugestoes.appendChild(div);
        });

        listaSugestoes.classList.remove("hidden");
    }

    function selecionarToner(indice, filtrados) {
        const item = filtrados[indice];
        if (!item) return;
        inputPesquisa.value = `${item.Marca || ''} - ${item.Modelo || ''} ${item.Tipo ? '(' + item.Tipo + ')' : ''}`.trim();
        inputTonerHidden.value = item.Cod_Produto;
        listaSugestoes.classList.add("hidden");
    }

    inputPesquisa && inputPesquisa.addEventListener("input", () => {
        atualizarSugestoes(inputPesquisa.value);
    });

    inputPesquisa && inputPesquisa.addEventListener("keydown", (e) => {
        const itens = Array.from(listaSugestoes.children);
        if (!itens.length) return;

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
            e.preventDefault();
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

    // fechar sugestões ao clicar fora
    document.addEventListener("click", (e) => {
        if (!inputPesquisa.contains(e.target) && !listaSugestoes.contains(e.target)) {
            listaSugestoes.classList.add("hidden");
        }
    });

    // =========================
    // ADICIONAR ITEM AO CARRINHO
    // =========================

    document.getElementById("btnAdicionarItem") && document.getElementById("btnAdicionarItem").addEventListener("click", () => {
        const tonerId = parseInt(inputTonerHidden.value);
        const tonerNome = inputPesquisa.value;
        const quantidade = parseInt(inputQtd.value);
        const valorUnitario = parseFloat(inputValor.value);

        if (!tonerId || !tonerNome || isNaN(quantidade) || quantidade <= 0 || isNaN(valorUnitario) || valorUnitario <= 0) {
            alert("Preencha todos os campos do item corretamente (produto, quantidade > 0, valor unitário > 0).");
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

        // reset campos item
        inputPesquisa.value = '';
        inputTonerHidden.value = '';
        inputQtd.value = '1';
        inputValor.value = '';

        atualizarCarrinho();
    });

    // atualizar tabela do carrinho
    function atualizarCarrinho() {
        tbodyCarrinho.innerHTML = '';
        let total = 0;

        carrinho.forEach((item, idx) => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td class="py-2 px-3">${item.Nome_Produto}</td>
                <td class="py-2 px-3 text-center">${item.Quantidade}</td>
                <td class="py-2 px-3 text-center">R$ ${Number(item.ValorUnitario).toFixed(2)}</td>
                <td class="py-2 px-3 text-center font-semibold">R$ ${Number(item.Subtotal).toFixed(2)}</td>
                <td class="py-2 px-3 text-center">
                    <button data-idx="${idx}" class="btnRemoverItem text-red-500 hover:text-red-700">
                        <i class='bx bx-trash'></i>
                    </button>
                </td>
            `;
            tbodyCarrinho.appendChild(tr);
            total += Number(item.Subtotal);
        });

        totalCompraEl.textContent = formatBRL(total);
    }

    // remover item delegado
    tbodyCarrinho.addEventListener('click', (e) => {
        if (e.target.closest('.btnRemoverItem')) {
            const btn = e.target.closest('.btnRemoverItem');
            const idx = Number(btn.dataset.idx);
            carrinho.splice(idx, 1);
            atualizarCarrinho();
        }
    });

    // =========================
    // FINANCEIRO (aba)
    // =========================

    btnAddParcela && btnAddParcela.addEventListener('click', () => {
        const ven = lancVencimento.value;
        const val = parseFloat(lancValor.value);
        const ean = lancEAN.value || '';
        const obs = lancObs.value || '';

        if (!ven) return alert('Informe a data de vencimento.');
        if (isNaN(val) || val <= 0) return alert('Informe um valor válido (> 0).');

        listaFinanceiro.push({
            vencimento: ven,
            valor: Number(Number(val).toFixed(2)),
            ean,
            obs,
            conta: null,
            tipo: 1,      // 1 = compra
            operacao: 1   // 1 = compra
        });

        // limpa campos
        lancVencimento.value = '';
        lancValor.value = '';
        lancEAN.value = '';
        lancObs.value = '';

        atualizarTabelaFinanceiro();
    });

    function atualizarTabelaFinanceiro() {
      tbodyFinanceiro.innerHTML = "";
      let totalParcelas = 0;

      listaFinanceiro.forEach((f, idx) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td class="py-2 px-3">${f.vencimento}</td>
            <td class="py-2 px-3">${Number(f.valor).toFixed(2)}</td>
            <td class="py-2 px-3">${f.ean || ""}</td>
            <td class="py-2 px-3">${f.obs || ""}</td>
            <td class="py-2 px-3 text-center">
                <button data-idx="${idx}" class="btnRemoverParcela text-red-500 hover:text-red-700">
                    <i class='bx bx-trash'></i>
                </button>
            </td>
        `;
        tbodyFinanceiro.appendChild(tr);
        totalParcelas += Number(f.valor);
      });

      const valorRMA = parseFloat(inputRMA?.value) || 0;

      // 🔽 RMA AUMENTA O TOTAL VISUAL
      const totalVisual = totalParcelas + valorRMA;

      totalFinanceiroEl.textContent = formatBRL(totalVisual);
    }

    // remover parcela delegated
    tbodyFinanceiro.addEventListener('click', (e) => {
        if (e.target.closest('.btnRemoverParcela')) {
            const idx = Number(e.target.closest('.btnRemoverParcela').dataset.idx);
            listaFinanceiro.splice(idx, 1);
            atualizarTabelaFinanceiro();
        }
    });

    // =========================
    // TABS UI
    // =========================

    function setActiveTab(tabName) {
        tabButtons.forEach(b => {
            if (b.dataset.tab === tabName) {
                b.classList.add('border-blue-600', 'text-blue-600');
            } else {
                b.classList.remove('border-blue-600', 'text-blue-600');
            }
        });

        if (tabName === 'detalhes') {
            tabDetalhes.classList.remove('hidden');
            tabFinanceiro.classList.add('hidden');
        } else {
            tabDetalhes.classList.add('hidden');
            tabFinanceiro.classList.remove('hidden');
        }
    }

    tabButtons.forEach(b => {
        b.addEventListener('click', (e) => {
            setActiveTab(e.currentTarget.dataset.tab);
        });
    });

    // =========================
    // SALVAR COMPRA (VALIDAÇÕES E ENVIO)
    // =========================

    btnSalvarCompra && btnSalvarCompra.addEventListener('click', async () => {
      const Cod_Fornecedor = Number(selectFornecedor.value) || null;
      const NDocumento = inputDocumento.value || "";
      const Cond_Pagamento = inputCondPgto.value || "";
      const Obs = inputObs.value || "";

      // valida itens
      if (!Cod_Fornecedor) return alert("Selecione um fornecedor.");
      if (carrinho.length === 0)
        return alert("Adicione ao menos um item na compra.");

      // calcula totais
      const totalItens = carrinho.reduce(
        (acc, it) => acc + (Number(it.Subtotal) || 0),
        0,
      );
      const totalFin = listaFinanceiro.reduce(
        (acc, f) => acc + (Number(f.valor) || 0),
        0,
      );

      // Se o usuário marcar "Lançar sem Financeiro", ignoramos todas as regras financeiras
      const semFinanceiro = fieldSemFinanceiro.checked;

      if (!semFinanceiro) {
        // validações financeiras normais
        if (Number(totalFin.toFixed(2)) <= 0) {
          return alert(
            'Você precisa lançar ao menos um título financeiro com valor maior que 0 ou marcar "Lançar sem Financeiro".',
          );
        }
      }

      // montar objeto que será enviado ao backend
      const dados = {
        Cod_Fornecedor,
        NDocumento,
        Cond_Pagamento,
        Obs,
        semFinanceiro, // envia ao backend esta flag
        RMA: parseFloat(inputRMA?.value) || 0,
        carrinho: carrinho.map((it) => ({
          cod_toner: it.Cod_Produto,
          quantidade: it.Quantidade,
          valor_compra: Number(Number(it.ValorUnitario).toFixed(2)),
        })),
        financeiro: semFinanceiro
          ? [] // se for sem financeiro, não envia nada
          : listaFinanceiro.map((f) => ({
              vencimento: f.vencimento,
              valor: Number(Number(f.valor).toFixed(2)),
              ean: f.ean,
              obs: f.obs,
              conta: f.conta || null,
              tipo: f.tipo,
              operacao: f.operacao,
            })),
      };

      // enviar para o servidor (apenas agora, depois de tudo preenchido)
      try {
        const resp = await fetch("/compras/finalizar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dados),
        });

        const json = await resp.json();

        if (!resp.ok) {
          return alert(json.error || "Erro ao registrar compra.");
        }

        // sucesso
        compraRecemCriada = json; // pode conter Cod_Compra
        alert(
          "Compra registrada com sucesso! Cod_Compra: " +
            (json.Cod_Compra || "—"),
        );
        limparEstado();
        modalBg.classList.add("hidden");
        listarCompras();

        // (opcional) abrir aba financeiro ou exibir detalhe: você pode customizar aqui.
        // exemplo: setActiveTab('financeiro');
      } catch (err) {
        console.error("Erro salvar compra", err);
        alert("Erro de conexão ao salvar compra.");
      }
    });

    // =========================
    // LISTAR ÚLTIMAS COMPRAS
    // =========================

    async function listarCompras() {
        try {
            const resp = await fetch("/compras/listar");
            const compras = await resp.json();
            const tbody = document.getElementById("tabelaCompras");
            tbody.innerHTML = "";

            (compras || []).forEach(c => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td class="py-2 px-3 text-center">${c.Cod_Compra}</td>
                    <td class="py-2 px-3 text-center">${c.Data_Compra ? new Date(c.Data_Compra).toLocaleDateString() : ''}</td>
                    <td class="py-2 px-3 text-center">${c.Nome_Fornecedor}</td>
                    <td class="py-2 px-3 text-center">${formatBRL(parseFloat(c.Valor_Total || 0))}</td>
                    <td class="py-2 px-3 text-center">${c.NDocumento || ''}</td>
                `;
                tbody.appendChild(tr);
            });
        } catch (err) {
            console.warn('Erro listar compras', err);
        }
    }

    async function buscarCompra() {
      const codCompra = document.getElementById("codCompra").value;
      const tbody = document.getElementById("itensCompra");
      const totalSpan = document.getElementById("totalCompraPesquisa");
      const resultado = document.getElementById("resultadoCompra");

      if (!codCompra) {
        resultado.classList.add("hidden");
        return alert("Informe o código da compra");
      }

      tbody.innerHTML = "";
      totalSpan.textContent = "0,00";
      resultado.classList.add("hidden");

      try {
        const res = await fetch(`/compras/${codCompra}`);
        if (!res.ok) throw new Error("Compra não encontrada");

        const data = await res.json();

        data.itens.forEach((item) => {
          const tr = document.createElement("tr");

          tr.innerHTML = `
        <td class="py-3 px-4 text-center">
            ${data.compra.Cod_Compra}
        </td>

        <td class="py-3 px-4 text-center">
            ${new Date(data.compra.Data_Compra).toLocaleDateString("pt-BR")}
        </td>

        <td class="py-3 px-4 text-center">
            ${data.compra.Nome_Fornecedor || "-"}
        </td>

        <td class="py-3 px-4 text-center">
            ${item.Marca} ${item.Modelo}
        </td>

        <td class="py-3 px-4 text-center">
            ${item.Quantidade}
        </td>

        <td class="py-3 px-4 text-center">
            R$ ${Number(item.Subtotal).toFixed(2)}
        </td>
    `;

          tbody.appendChild(tr);
        });

        totalSpan.textContent = data.total.toFixed(2);
        resultado.classList.remove("hidden");
      } catch (err) {
        resultado.classList.add("hidden");
        alert(err.message);
      }
    }

    window.buscarCompra = buscarCompra;
    // inicial
    listarCompras();

    inputRMA &&
      inputRMA.addEventListener("input", () => {
        atualizarTabelaFinanceiro();
      });

}); // DOMContentLoaded end

