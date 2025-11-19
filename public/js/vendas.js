// ==============================
// vendas.js - TonerStock (ATUALIZADO: modal com 2 abas, financeiro integrado)
// Mantém Id_ItemCompra (Modelo A)
// ==============================

document.addEventListener("DOMContentLoaded", () => {
    // ====== estado local ======
    let carrinho = []; // itens: {Cod_Toner, Id_ItemCompra, Nome_Produto, Quantidade, Valor_Compra, Valor_Venda, Subtotal}
    let listaFinanceiro = []; // parcelas: { vencimento, valor, ean, obs, conta, tipo=2, operacao=2 }
    let listaClientesCache = []; // opcional cache
    let listaTonersCache = [];   // opcional cache (se usar)

    // ====== DOM ======
    const btnNovaVenda = document.getElementById("btnNovaVenda");
    const modalBg = document.getElementById("modal-bg");

    // abas
    const tabButtons = document.querySelectorAll('.tab-item');
    const tabDetalhes = document.getElementById('tab-detalhes');
    const tabFinanceiro = document.getElementById('tab-financeiro');

    // cliente DOM
    const inputPesquisaCliente = document.getElementById("inputPesquisaCliente");
    const resultadoClientes = document.getElementById("resultadoClientes");
    const clienteSelecionadoHidden = document.getElementById("clienteSelecionado");

    // toner DOM
    const inputPesquisaToner = document.getElementById("inputPesquisaToner");
    const listaSugestoesToner = document.getElementById("listaSugestoesToner");
    const selectTonerHidden = document.getElementById("selectToner");
    const inputQtd = document.getElementById("inputQtd");
    const inputValor = document.getElementById("inputValor");
    const btnAdicionarItem = document.getElementById("btnAdicionarItem");

    // carrinho DOM
    const tbodyCarrinho = document.getElementById("tbodyCarrinho");
    const totalVendaEl = document.getElementById("totalVenda");

    // campos finais
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

    const btnSalvarVenda = document.getElementById("btnSalvarVenda");

    // controle de seleção do lote/toner
    let loteSelecionado = null;
    let indiceSugestao = -1;

    // ====== util ======
    const fmtBRL = v => `R$ ${Number(v || 0).toFixed(2)}`;
    const round2 = v => Number(Number(v || 0).toFixed(2));

    // ====== abrir modal ======
    btnNovaVenda && btnNovaVenda.addEventListener('click', () => {
        limparEstado();
        modalBg.classList.remove('hidden');
        setActiveTab('detalhes');
        // focar input cliente
        setTimeout(()=> inputPesquisaCliente.focus(), 50);
        listarVendas(); // opcional refresh
    });

    // fechar modal (usado pelo HTML)
    window.fecharModal = function() {
        modalBg.classList.add('hidden');
        limparEstado();
    };

    function limparEstado() {
        carrinho = [];
        listaFinanceiro = [];
        loteSelecionado = null;
        indiceSugestao = -1;
        inputPesquisaCliente.value = '';
        resultadoClientes.innerHTML = '';
        resultadoClientes.classList.add('hidden');
        clienteSelecionadoHidden.value = '';
        inputPesquisaToner.value = '';
        listaSugestoesToner.innerHTML = '';
        listaSugestoesToner.classList.add('hidden');
        inputQtd.value = '';
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

    // ====== abas ======
    function setActiveTab(tabName) {
        tabButtons.forEach(b => {
            if (b.dataset.tab === tabName) b.classList.add('border-blue-600','text-blue-600');
            else b.classList.remove('border-blue-600','text-blue-600');
        });
        if (tabName === 'detalhes') {
            tabDetalhes.classList.remove('hidden');
            tabFinanceiro.classList.add('hidden');
        } else {
            tabDetalhes.classList.add('hidden');
            tabFinanceiro.classList.remove('hidden');
        }
    }
    tabButtons.forEach(b => b.addEventListener('click', e => setActiveTab(e.currentTarget.dataset.tab)));

    // ====== listar vendas (reload) ======
    async function listarVendas() {
        try {
            const resp = await fetch('/vendas/listar');
            const data = await resp.json();
            const tbody = document.getElementById("tabelaVendas");
            if (!tbody) return;
            tbody.innerHTML = '';
            (data || []).forEach(v => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
          <td class="py-2 px-3">${v.Cod_Pedido}</td>
          <td class="py-2 px-3">${v.Data ? new Date(v.Data).toLocaleDateString() : ''}</td>
          <td class="py-2 px-3">${v.Nome_Cliente || ''}</td>
          <td class="py-2 px-3">${fmtBRL(v.Valor_Total || 0)}</td>
          <td class="py-2 px-3">${v.NDoc || ''}</td>
        `;
                tbody.appendChild(tr);
            });
        } catch (err) {
            console.warn('Erro listar vendas', err);
        }
    }
    // inicial
    listarVendas();

    // ====== AUTOCOMPLETE CLIENTE (mantido A) ======
    let clienteDebounce;
    inputPesquisaCliente && inputPesquisaCliente.addEventListener('input', () => {
        clearTimeout(clienteDebounce);
        clienteDebounce = setTimeout(async () => {
            const termo = inputPesquisaCliente.value.trim();
            if (termo.length < 2) {
                resultadoClientes.classList.add('hidden');
                resultadoClientes.innerHTML = '';
                clienteSelecionadoHidden.value = '';
                return;
            }
            try {
                const resp = await fetch(`/clientes/pesquisar?nome=${encodeURIComponent(termo)}`);
                const json = await resp.json();
                resultadoClientes.innerHTML = '';
                resultadoClientes.classList.remove('hidden');
                // API: pode retornar vários ou um; aqui suportamos array ou único
                const lista = Array.isArray(json) ? json : (json.clientes || (json.cliente ? [json.cliente] : []));
                if (!lista || !lista.length) {
                    resultadoClientes.innerHTML = "<p class='text-gray-600 p-2'>Nenhum cliente encontrado.</p>";
                    return;
                }
                lista.forEach(cli => {
                    const card = document.createElement('div');
                    card.className = "bg-white p-3 rounded-xl mb-2 border shadow-sm cursor-pointer hover:bg-gray-50";
                    card.innerHTML = `<p class="font-semibold">${cli.Nome || cli.nome}</p>
            <p class="text-sm text-gray-600">Status: ${cli.Ativo ? 'Ativo' : 'Inativo'}</p>`;
                    card.addEventListener('click', () => {
                        inputPesquisaCliente.value = cli.Nome || cli.nome;
                        clienteSelecionadoHidden.value = cli.Id_Cliente || cli.Id_cliente || cli.id;
                        resultadoClientes.classList.add('hidden');
                        resultadoClientes.innerHTML = '';
                    });
                    resultadoClientes.appendChild(card);
                });
            } catch (err) {
                console.warn('Erro pesquisar cliente', err);
            }
        }, 300);
    });

    // clicou fora fecha a lista
    document.addEventListener('click', (e) => {
        if (!inputPesquisaCliente.contains(e.target) && !resultadoClientes.contains(e.target)) {
            resultadoClientes.classList.add('hidden');
        }
    });

// =========================
// FIM PARTE 1 - prossiga para PARTE 2 abaixo

    // =========================
    // AUTOCOMPLETE TONER (lista de lotes)
    // =========================
    let tonerDebounce;
    inputPesquisaToner && inputPesquisaToner.addEventListener('input', () => {
        clearTimeout(tonerDebounce);
        tonerDebounce = setTimeout(async () => {
            const termo = inputPesquisaToner.value.trim();
            if (termo.length < 2) {
                listaSugestoesToner.classList.add('hidden');
                listaSugestoesToner.innerHTML = '';
                loteSelecionado = null;
                return;
            }
            try {
                const resp = await fetch(`/estoque/buscar?termo=${encodeURIComponent(termo)}`);
                const dados = await resp.json();
                listaSugestoesToner.innerHTML = '';
                if (!dados || !dados.length) {
                    listaSugestoesToner.innerHTML = `<div class="p-2 text-gray-600">Nenhum lote encontrado</div>`;
                    listaSugestoesToner.classList.remove('hidden');
                    return;
                }
                dados.forEach((lote, idx) => {
                    const div = document.createElement('div');
                    div.className = "px-3 py-2 cursor-pointer hover:bg-gray-100";
                    div.innerHTML = `<div class="font-semibold">${lote.Marca} - ${lote.Modelo} (${lote.Tipo || ''})</div>
                           <div class="text-sm text-gray-600">Compra #${lote.Cod_Compra} — Saldo: ${lote.Saldo}</div>
                           <div class="text-sm text-gray-600">Valor compra: R$ ${Number(lote.Valor_Compra).toFixed(2)}</div>`;
                    div.addEventListener('click', () => {
                        loteSelecionado = lote;
                        inputPesquisaToner.value = `${lote.Marca} - ${lote.Modelo} (${lote.Tipo || ''}) - Saldo: ${lote.Saldo}`;
                        selectTonerHidden.value = lote.Cod_Toner || lote.Cod_Produto;
                        listaSugestoesToner.classList.add('hidden');
                    });
                    listaSugestoesToner.appendChild(div);
                });
                listaSugestoesToner.classList.remove('hidden');
            } catch (err) {
                console.warn('Erro buscar lotes', err);
            }
        }, 250);
    });

    document.addEventListener('click', (e) => {
        if (!inputPesquisaToner.contains(e.target) && !listaSugestoesToner.contains(e.target)) {
            listaSugestoesToner.classList.add('hidden');
        }
    });

    // =========================
    // ADICIONAR ITEM AO CARRINHO (mantendo Id_ItemCompra)
    // =========================
    btnAdicionarItem && btnAdicionarItem.addEventListener('click', () => {
        if (!loteSelecionado) return alert('Selecione um toner (lote) válido do estoque.');

        const qtd = Number(inputQtd.value) || 0;
        const valorVenda = Number(inputValor.value) || 0;

        if (qtd <= 0) return alert('Quantidade inválida.');
        if (qtd > loteSelecionado.Saldo) return alert(`Saldo insuficiente. Saldo disponível: ${loteSelecionado.Saldo}`);
        if (valorVenda <= 0) return alert('Informe um valor de venda válido.');

        const subtotal = round2(qtd * valorVenda);

        carrinho.push({
            Cod_Toner: loteSelecionado.Cod_Toner || loteSelecionado.Cod_Produto,
            Id_ItemCompra: loteSelecionado.Id_ItemCompra,
            Nome_Produto: `${loteSelecionado.Marca} - ${loteSelecionado.Modelo}`,
            Quantidade: qtd,
            Valor_Compra: Number(loteSelecionado.Valor_Compra) || 0,
            Valor_Venda: round2(valorVenda),
            Subtotal: subtotal
        });

        // reset
        loteSelecionado = null;
        inputPesquisaToner.value = '';
        selectTonerHidden.value = '';
        listaSugestoesToner.innerHTML = '';
        listaSugestoesToner.classList.add('hidden');
        inputQtd.value = '';
        inputValor.value = '';

        atualizarCarrinho();
    });

    // atualizar carrinho UI
    function atualizarCarrinho() {
        tbodyCarrinho.innerHTML = '';
        let total = 0;
        carrinho.forEach((it, idx) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td class="py-2 px-3">${it.Nome_Produto}</td>
                      <td class="py-2 px-3 text-center">${it.Quantidade}</td>
                      <td class="py-2 px-3 text-center">${fmtBRL(it.Valor_Venda)}</td>
                      <td class="py-2 px-3 text-center font-semibold">${fmtBRL(it.Subtotal)}</td>
                      <td class="py-2 px-3 text-center">
                        <button data-idx="${idx}" class="btnRemoverItem text-red-500 hover:text-red-700">
                          <i class='bx bx-trash'></i>
                        </button>
                      </td>`;
            tbodyCarrinho.appendChild(tr);
            total += Number(it.Subtotal);
        });
        totalVendaEl.textContent = fmtBRL(total);
    }

    // remover item delegado
    tbodyCarrinho.addEventListener('click', (e) => {
        const btn = e.target.closest('.btnRemoverItem');
        if (!btn) return;
        const idx = Number(btn.dataset.idx);
        carrinho.splice(idx, 1);
        atualizarCarrinho();
    });

    // =========================
    // FINANCEIRO (recebimento) - adicionar parcela
    // =========================
    btnAddParcela && btnAddParcela.addEventListener('click', () => {
        const ven = lancVencimento.value;
        const val = Number(lancValor.value);
        const ean = lancEAN.value || '';
        const obs = lancObs.value || '';

        if (!ven) return alert('Informe data de vencimento.');
        if (isNaN(val) || val <= 0) return alert('Informe um valor válido (> 0).');

        listaFinanceiro.push({
            vencimento: ven,
            valor: round2(val),
            ean,
            obs,
            conta: null,
            tipo: 2,      // 2 = venda
            operacao: 2  // 2 = venda
        });

        // limpa campos
        lancVencimento.value = '';
        lancValor.value = '';
        lancEAN.value = '';
        lancObs.value = '';

        atualizarTabelaFinanceiro();
    });

    function atualizarTabelaFinanceiro() {
        tbodyFinanceiro.innerHTML = '';
        let total = 0;
        listaFinanceiro.forEach((f, idx) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td class="py-2 px-3">${f.vencimento}</td>
                      <td class="py-2 px-3">${Number(f.valor).toFixed(2)}</td>
                      <td class="py-2 px-3">${f.ean || ''}</td>
                      <td class="py-2 px-3">${f.obs || ''}</td>
                      <td class="py-2 px-3 text-center">
                        <button data-idx="${idx}" class="btnRemoverParcela text-red-500 hover:text-red-700">
                          <i class='bx bx-trash'></i>
                        </button>
                      </td>`;
            tbodyFinanceiro.appendChild(tr);
            total += Number(f.valor);
        });
        totalFinanceiroEl.textContent = fmtBRL(total);
    }

    // remover parcela delegado
    tbodyFinanceiro.addEventListener('click', (e) => {
        const btn = e.target.closest('.btnRemoverParcela');
        if (!btn) return;
        const idx = Number(btn.dataset.idx);
        listaFinanceiro.splice(idx, 1);
        atualizarTabelaFinanceiro();
    });

    // =========================
    // SALVAR VENDA (VALIDAÇÕES & POST)
    // =========================
    btnSalvarVenda && btnSalvarVenda.addEventListener('click', async () => {
        const Cod_Cliente = Number(clienteSelecionadoHidden.value) || null;
        const NDoc = inputDocumento.value || '';
        const Cond_Pagamento = inputCondPgto.value || '';
        const Obs = inputObs.value || '';

        if (!Cod_Cliente) return alert('Selecione um cliente.');
        if (!carrinho.length) return alert('Adicione ao menos um item.');

        const totalVenda = round2(carrinho.reduce((s, it) => s + Number(it.Subtotal), 0));
        const totalFin = round2(listaFinanceiro.reduce((s, f) => s + Number(f.valor), 0));

        if (totalFin <= 0) return alert('Você precisa adicionar ao menos um título (valor > 0).');

        if (Number(totalVenda.toFixed(2)) !== Number(totalFin.toFixed(2))) {
            return alert('O total financeiro não confere com o valor total da venda. Verifique os valores.');
        }

        // montar payload - itens com campos esperados
        const payload = {
            Cod_Cliente,
            NDoc,
            Cond_Pagamento,
            Obs,
            itens: carrinho.map(it => ({
                cod_toner: it.Cod_Toner,
                id_itemcompra: it.Id_ItemCompra,
                quantidade: it.Quantidade,
                valor_compra: Number(it.Valor_Compra),
                valor_venda: Number(it.Valor_Venda)
            })),
            financeiro: listaFinanceiro.map(f => ({
                vencimento: f.vencimento,
                valor: f.valor,
                ean: f.ean,
                obs: f.obs,
                conta: f.conta || null,
                tipo: f.tipo,
                operacao: f.operacao
            }))
        };

        try {
            const resp = await fetch('/vendas/finalizar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const json = await resp.json();
            if (!resp.ok) {
                return alert(json.error || 'Erro ao registrar venda.');
            }

            alert('Venda registrada com sucesso! Cod_Pedido: ' + (json.Cod_Pedido || '—'));
            limparEstado();
            modalBg.classList.add('hidden');
            listarVendas();
        } catch (err) {
            console.error('Erro ao salvar venda', err);
            alert('Erro de conexão ao salvar venda.');
        }
    });


}); // DOMContentLoaded end
