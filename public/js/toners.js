document.addEventListener("DOMContentLoaded", () => {
  // =====================================================
  // ELEMENTOS
  // =====================================================
  const modal = document.getElementById("modal-bg");
  const btnNovoToner = document.getElementById("btnNovoToner");
  const salvarBtn = document.getElementById("salvarToner");

  const inputBusca = document.getElementById("pesquisaInteligente");
  const resultado = document.getElementById("resultado");

  let timeout;

  // =====================================================
  // DROPDOWN
  // =====================================================
  const dropdown = document.createElement("div");
  dropdown.className = `
  absolute left-0 right-0 top-full mt-2
  bg-gray-50/95 backdrop-blur
  border border-gray-200
  rounded-2xl shadow-2xl
  max-h-72 overflow-y-auto
  z-50 hidden
`;
dropdown.id = "dropdown-toner";
  inputBusca.parentNode.style.position = "relative";
  inputBusca.parentNode.appendChild(dropdown);

  // =====================================================
  // MODAL
  // =====================================================
  btnNovoToner.onclick = () => {
    document.getElementById("modalTitle").innerText = "Novo Toner";
    document.getElementById("codProduto").value = "";
    document.getElementById("modelo").value = "";
    document.getElementById("marca").value = "";
    document.getElementById("tipo").value = "";
    document.getElementById("locacao").checked = false;
    modal.classList.remove("hidden");
  };

  window.fecharModal = () => modal.classList.add("hidden");

  // =====================================================
  // SALVAR TONER
  // =====================================================
  salvarBtn.onclick = async () => {
    const id = document.getElementById("codProduto").value;

    const dados = {
      modelo: document.getElementById("modelo").value,
      marca: document.getElementById("marca").value,
      tipo: document.getElementById("tipo").value,
      locacao: document.getElementById("locacao").checked ? 1 : 0,
    };

    const url = id ? `/toners/${id}` : "/toners";
    const method = id ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });

    if (!res.ok) {
      alert("Erro ao salvar toner.");
      return;
    }

    alert("Toner salvo com sucesso!");
    fecharModal();
  };

  // =====================================================
  // BUSCA INTELIGENTE (DEBOUNCE)
  // =====================================================
  inputBusca.oninput = () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => buscarInteligente(), 300);
  };

  async function buscarInteligente() {
    const termo = inputBusca.value.trim();

    if (termo.length < 2) {
      dropdown.classList.add("hidden");
      resultado.classList.add("hidden");
      return;
    }

    dropdown.innerHTML = `
      <div class="px-4 py-3 text-sm text-gray-400">
        Buscando...
      </div>
    `;
    dropdown.classList.remove("hidden");

    const res = await fetch(
      `/toners/busca-inteligente?termo=${encodeURIComponent(termo)}`,
    );

    const data = await res.json();
    renderDropdown(data.resultados || []);
  }

  // =====================================================
  // RENDER DROPDOWN
  // =====================================================
  function renderDropdown(resultados) {
    if (!resultados.length) {
      dropdown.classList.add("hidden");
      return;
    }

    dropdown.innerHTML = resultados
      .map(
        (r) => `
    <div
      onclick='selecionarItem(${JSON.stringify(r)})'
      class="
        group flex items-center justify-between
        px-4 py-3 mx-2 my-1
        rounded-xl cursor-pointer
        hover:bg-white
        transition-all
      "
    >
      <div class="flex items-center gap-3">
        <!-- ÍCONE -->
        <div class="
          w-9 h-9 flex items-center justify-center
          rounded-lg
          ${iconeBg(r.tipo)}
        ">
          ${iconeTipo(r.tipo)}
        </div>

        <!-- TEXTO -->
        <div>
          <div class="text-sm font-semibold text-gray-800 leading-tight">
            ${r.label}
          </div>
          ${
            r.sub
              ? `
            <div class="text-xs text-gray-500">
              ${r.sub}
            </div>`
              : ""
          }
        </div>
      </div>

      <!-- BADGE -->
      <span class="
        text-[10px] uppercase tracking-wide
        px-2 py-1 rounded-full
        ${badgeClasse(r.tipo)}
      ">
        ${r.tipo}
      </span>
    </div>
  `,
      )
      .join("");

    dropdown.classList.remove("hidden");
  }


  function badgeClasse(tipo) {
    if (tipo === "modelo") return "bg-blue-50 text-blue-700";
    if (tipo === "marca") return "bg-green-50 text-green-700";
    return "bg-purple-50 text-purple-700";
  }


  // =====================================================
  // SELECIONAR ITEM
  // =====================================================
  window.selecionarItem = (item) => {
    dropdown.classList.add("hidden");
    inputBusca.value = item.label;

    if (item.tipo === "modelo") {
      carregarDetalheModelo(item.id);
    }

    if (item.tipo === "marca" || item.tipo === "tipo") {
      carregarLista(item.tipo, item.label);
    }
  };

  // =====================================================
  // DETALHE DO MODELO
  // =====================================================
  async function carregarDetalheModelo(codProduto) {
    const res = await fetch(
      `/toners/pesquisar?tipo=modelo&termo=${codProduto}&detalhado=true`,
    );

    const data = await res.json();
    montarResultadoDetalhado(data);
  }

  async function montarResultadoDetalhado(data) {
  resultado.classList.remove("hidden");

  const clientes = await carregarClientesDoToner(data.toner.codProduto);

  resultado.innerHTML = `
    <div class="space-y-8">

      <!-- DADOS DO TONER -->
      <div class="p-6 bg-white rounded-2xl shadow border">
        <h2 class="text-xl font-bold">${data.toner.modelo}</h2>
        <p><strong>Marca:</strong> ${data.toner.marca}</p>
        <p><strong>Tipo:</strong> ${data.toner.tipo}</p>

        <div class="mt-4 p-4 bg-blue-50 border-l-4 border-blue-600 rounded">
          <p class="font-semibold text-blue-800">
            Em estoque: ${data.toner.estoque} unidades
          </p>
        </div>
      </div>

      <!-- VENDAS -->
      ${tabelaHistorico("Últimas 5 vendas", data.vendas, "Cliente", "Valor_Venda", "Data_Venda")}

      <!-- COMPRAS -->
      ${tabelaHistorico("Últimas 5 compras", data.compras, "Fornecedor", "Valor_Compra", "Data_Compra")}

      <!-- CLIENTES -->
      ${renderClientes(clientes)}

    </div>
  `;
}

function renderClientes(clientes) {
  if (!clientes.length) return "";

  return `
    <div>
      <h3 class="text-lg font-semibold mb-4">
        Clientes que compram este toner
      </h3>

      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        ${clientes.map(c => `
          <div class="bg-gray-50 border rounded-xl shadow-sm p-4 text-center">
            <h4 class="font-semibold text-gray-800 truncate">
              ${c.Cliente}
            </h4>

            <p class="text-blue-600 text-xl font-bold mt-2">
              ${c.Total_Comprado}
            </p>

            <p class="text-xs text-gray-500">
              toners comprados
            </p>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}


  function tabelaHistorico(titulo, dados, nomeCampo, valorCampo, dataCampo) {
    return `
      <div>
        <h3 class="font-semibold text-lg mb-2">${titulo}</h3>
        <div class="overflow-x-auto">
          <table class="min-w-full border text-sm">
            <thead>
              <tr class="bg-gray-100">
                <th class="p-2 text-center">Data</th>
                <th class="p-2 text-center">${nomeCampo}</th>
                <th class="p-2 text-center">Qtd</th>
                <th class="p-2 text-center">Valor</th>
              </tr>
            </thead>
            <tbody>
              ${
                dados && dados.length
                  ? dados
                      .map(
                        (d) => `
                    <tr class="border-t">
                      <td class="p-2 text-center">${new Date(d[dataCampo]).toLocaleDateString()}</td>
                      <td class="p-2 text-center">${d[nomeCampo]}</td>
                      <td class="p-2 text-center">${d.Quantidade}</td>
                      <td class="p-2 text-center">R$ ${parseFloat(d[valorCampo]).toFixed(2)}</td>
                    </tr>
                  `,
                      )
                      .join("")
                  : `<tr><td colspan="4" class="p-3 text-gray-500 text-center">
                      Nenhum registro encontrado.
                     </td></tr>`
              }
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // =====================================================
  // LISTAGEM (MARCA / TIPO)
  // =====================================================
  async function carregarLista(tipo, termo) {
    const res = await fetch(
      `/toners/pesquisar?tipo=${tipo}&termo=${encodeURIComponent(termo)}`,
    );

    const data = await res.json();
    resultado.classList.remove("hidden");

    resultado.innerHTML = `
      <div class="p-6 bg-white rounded-2xl shadow border">
        <h2 class="text-xl font-bold mb-4">Resultados</h2>

        <div class="overflow-x-auto">
          <table class="min-w-full border text-sm">
            <thead>
              <tr class="bg-gray-100">
                <th class="p-3">Modelo</th>
                <th class="p-3">Marca</th>
                <th class="p-3">Tipo</th>
                <th class="p-3 text-center">Estoque</th>
              </tr>
            </thead>
            <tbody>
              ${data.toners
                .map(
                  (t) => `
                <tr class="border-t hover:bg-gray-50">
                  <td class="p-3">${t.Modelo}</td>
                  <td class="p-3">${t.Marca}</td>
                  <td class="p-3">${t.Tipo}</td>
                  <td class="p-3 text-center font-medium">${t.Estoque}</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function iconeTipo(tipo) {
    if (tipo === "modelo") {
      return `<i class='bx bxs-printer text-blue-600 text-lg'></i>`;
    }
    if (tipo === "marca") {
      return `<i class='bx bxs-factory text-green-600 text-lg'></i>`;
    }
    return `<i class='bx bxs-category text-purple-600 text-lg'></i>`;
  }

  function iconeBg(tipo) {
    if (tipo === "modelo") return "bg-blue-100";
    if (tipo === "marca") return "bg-green-100";
    return "bg-purple-100";
  }

  async function carregarClientesDoToner(codProduto) {
  const res = await fetch(`/toners/${codProduto}/clientes`);
  return await res.json();
}


  // =====================================================
  // FECHAR DROPDOWN AO CLICAR FORA
  // =====================================================
  document.addEventListener("click", (e) => {
    if (!inputBusca.contains(e.target)) {
      dropdown.classList.add("hidden");
    }
  });
});
