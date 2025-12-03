async function carregarDashboard() {
    try {
        const res = await fetch("/dashboard");
        if (!res.ok) throw new Error("Resposta inválida do servidor");
        const data = await res.json();

        // Valores numéricos
        const totalEstoque = Number(data.totalEstoque || 0);
        const totalModelos = Number(data.totalModelos || 0);
        const valorEstoque = Number(data.valorEstoque || 0);
        const vendasMes = Number(data.vendasMes || 0);
        const qtdVendasMes = Number(data.qtdVendasMes || 0);
        
        // Atualiza DOM (verifique se os ids existem no HTML)
        const maybeSetText = (id, text) => {
            const el = document.getElementById(id);
            if (el) el.textContent = text;
        };

        maybeSetText('totalEstoqueValue', totalEstoque);
        maybeSetText('totalModelos', `${totalModelos} modelos`);
        maybeSetText('valorEstoqueValue', `R$ ${valorEstoque.toFixed(2)}`);
        maybeSetText('vendasMesValue', `R$ ${vendasMes.toFixed(2)}`);
        maybeSetText('qtdVendasMes', `${qtdVendasMes} vendas`);
        
        // opcional: formatar milhares (pt-BR)
        const fmt = (n) => n.toLocaleString('pt-BR');

        // Se preferir com formatação local:
        // maybeSetText('totalEstoqueValue', fmt(totalEstoque));
        // maybeSetText('totalModelos', `${fmt(totalModelos)} modelos`);
        // maybeSetText('valorEstoqueValue', `R$ ${valorEstoque.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

    } catch (err) {
        console.error("Erro ao carregar dashboard:", err);
    }
}

// =============================
// 🔵 Toners de Locação em Estoque
// =============================
async function carregarLocacao() {
    try {
        const res = await fetch('/dashboard/locacao');
        if (!res.ok) {
            console.error('Erro ao buscar locação:', res.status);
            return;
        }
        const dados = await res.json(); // array de { Cod_Produto, Modelo, Marca, Saldo_Disponivel }

        // total unidades e total de modelos
        const totalUnidades = dados.reduce((s, it) => s + (Number(it.Saldo_Disponivel) || 0), 0);
        const totalModelos = dados.length;

        // atualiza DOM (card)
        document.getElementById('locacaoEstoqueValue').textContent = totalUnidades;
        document.getElementById('locacaoModelos').textContent = `${totalModelos} modelo${totalModelos === 1 ? '' : 's'}`;

        // opcional: criar/atualizar uma lista curta dentro do card para visibilidade rápida
        // checa se já existe uma div para a listagem; se não, cria
        let card = document.getElementById('cardLocacaoList');
        if (!card) {
            const container = document.createElement('div');
            container.id = 'cardLocacaoList';
            container.className = 'mt-3';
            const parent = document.querySelector('#locacaoEstoqueValue').closest('.bg-white');
            parent.appendChild(container);
            card = container;
        }

        if (dados.length === 0) {
            card.innerHTML = `<p class="text-sm text-gray-500">Nenhum toner de locação com saldo disponível.</p>`;
        } else {
            // mostra até 6 itens (para não poluir o card), com link para página de toners
            const maxShow = 6;
            card.innerHTML = `
        <ul class="mt-2 space-y-2">
          ${dados.slice(0, maxShow).map(it => `
            <li class="flex justify-between items-center">
              <div>
                <div class="text-sm font-medium">${escapeHtml(it.Marca)} - ${escapeHtml(it.Modelo)}</div>
                <div class="text-xs text-gray-400">${it.Cod_Produto ? `ID ${it.Cod_Produto}` : ''}</div>
              </div>
              <div class="text-sm font-semibold text-blue-600">${it.Saldo_Disponivel}</div>
            </li>
          `).join('')}
        </ul>
        ${dados.length > maxShow ? `<div class="text-xs text-gray-400 mt-2">e mais ${dados.length - maxShow}...</div>` : ''}
      `;
        }

    } catch (err) {
        console.error("Erro ao carregar locação:", err);
    }
}

// helper para escapar texto (evita injeção)
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

// =============================
// 🔵 Vendas Recentes
// =============================
async function carregarVendasRecentes() {
    try {
        const res = await fetch('/dashboard/vendas-recentes');
        if (!res.ok) throw new Error("Erro ao buscar vendas recentes");

        const vendas = await res.json();
        // vendas deve vir como:
        // [{ Cliente: "...", Modelo: "...", Quantidade: 2, Valor: 150.00 }]

        const tbody = document.getElementById("tbodyVendasRecentes");
        tbody.innerHTML = "";

        if (vendas.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center py-6 text-gray-400">
                        Nenhuma venda registrada
                    </td>
                </tr>`;
            return;
        }

        vendas.slice(0, 5).forEach(v => {
            const tr = document.createElement("tr");
            tr.className = "border-b hover:bg-gray-50";

            tr.innerHTML = `
                <td class="py-2 px-3">${escapeHtml(v.Cliente)}</td>
                <td class="py-2 px-3">${escapeHtml(v.Toner)}</td>
                <td class="py-2 px-3 text-center">${v.Quantidade}</td>
                <td class="py-2 px-3 text-center">R$ ${Number(v.Valor).toFixed(2)}</td>
            `;

            tbody.appendChild(tr);
        });

    } catch (err) {
        console.error("Erro ao carregar vendas recentes:", err);
    }
}

async function carregarResumo() {
  try {
    const req = await fetch("/dashboard/resumo-pagrec");
    const data = await req.json();

    if (!data.ok) return;

    const periodos = {
      7: { r: 0, p: 0 },
      14: { r: 0, p: 0 },
      21: { r: 0, p: 0 },
    };

    data.periodos.forEach((item) => {
      const periodo = item.Periodo;

      // Ignora o período MES, porque não usamos mais
      if (!periodos[periodo]) return;

      const tipo = item.Tipo === 1 ? "r" : "p";
      periodos[periodo][tipo] = item.Total;
    });

    // Preencher no DOM
    document.getElementById("r7").innerText = periodos["7"].r.toLocaleString(
      "pt-BR",
      { style: "currency", currency: "BRL" }
    );
    document.getElementById("p7").innerText = periodos["7"].p.toLocaleString(
      "pt-BR",
      { style: "currency", currency: "BRL" }
    );

    document.getElementById("r14").innerText = periodos["14"].r.toLocaleString(
      "pt-BR",
      { style: "currency", currency: "BRL" }
    );
    document.getElementById("p14").innerText = periodos["14"].p.toLocaleString(
      "pt-BR",
      { style: "currency", currency: "BRL" }
    );

    document.getElementById("r21").innerText = periodos["21"].r.toLocaleString(
      "pt-BR",
      { style: "currency", currency: "BRL" }
    );
    document.getElementById("p21").innerText = periodos["21"].p.toLocaleString(
      "pt-BR",
      { style: "currency", currency: "BRL" }
    );
  } catch (e) {
    console.log("Erro ao carregar resumo:", e);
  }
}

// Executa ao carregar e a cada 30s
carregarVendasRecentes()
carregarLocacao();
carregarDashboard();
carregarResumo();
setInterval(carregarDashboard, 30000);

// Logout
const logoutBtn = document.getElementById('logout');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        window.location.href = '/';
    });
}