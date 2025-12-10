// ==============================
// clientes.js - TonerStock (AJUSTADO PARA NOVO BACKEND)
// ==============================
document.addEventListener("DOMContentLoaded", () => {
  const inputPesquisa = document.getElementById("pesquisaCliente");
  const resultadoDiv = document.getElementById("resultado");
  const tabelaCompras = document.getElementById("tabelaCompras");
  const isLocacao = document.getElementById("clienteLocacao");
  const caixaSugestoes = document.getElementById("autocompleteClientes");

  let timeout = null;

  // ============================
  // 🟦 Autocomplete
  // ============================
  inputPesquisa.addEventListener("input", () => {
    const texto = inputPesquisa.value.trim();

    if (texto.length === 0) {
      caixaSugestoes.innerHTML = "";
      caixaSugestoes.classList.add("hidden");
      return;
    }

    clearTimeout(timeout);
    timeout = setTimeout(() => {
      buscarSugestoes(texto);
    }, 200);
  });

  async function buscarSugestoes(texto) {
    try {
      const r = await fetch(
        `/clientes/pesquisar?nome=${encodeURIComponent(texto)}`
      );
      if (!r.ok) return;

      const lista = await r.json();

      if (!Array.isArray(lista) || lista.length === 0) {
        caixaSugestoes.innerHTML =
          "<div class='p-2 text-gray-500'>Nenhum cliente encontrado</div>";
        caixaSugestoes.classList.remove("hidden");
        return;
      }

      caixaSugestoes.innerHTML = lista
        .map(
          (c) => `
                <div class="p-2 hover:bg-gray-100 cursor-pointer" data-id="${c.Id_Cliente}">
                    ${c.Nome}
                </div>
            `
        )
        .join("");

      caixaSugestoes.classList.remove("hidden");

      caixaSugestoes.querySelectorAll("div[data-id]").forEach((item) => {
        item.addEventListener("click", () => {
          selecionarCliente(item.dataset.id, item.textContent);
        });
      });
    } catch (erro) {
      console.error("Erro ao buscar sugestões", erro);
    }
  }

  // ============================
  // 🟦 Quando clica no cliente do autocomplete
  // ============================
  function selecionarCliente(id, nome) {
    inputPesquisa.value = nome;
    caixaSugestoes.classList.add("hidden");
    caixaSugestoes.innerHTML = "";

    carregarDetalhesCliente(id);
  }

  // ============================
  // 🔍 Buscar DETALHES do cliente pelo ID
  // ============================
  async function carregarDetalhesCliente(id) {
    try {
      const r = await fetch(`/clientes/detalhes/${id}`);
      const data = await r.json();

      if (!r.ok) {
        resultadoDiv.classList.remove("hidden");
        resultadoDiv.innerHTML = `<p class="text-red-600">${data.error}</p>`;
        return;
      }

      const cliente = data.cliente;
      const compras = data.compras;
      const historico = data.historico;

      resultadoDiv.classList.remove("hidden");

      document.getElementById("nomeCliente").textContent = cliente.Nome;
      document.getElementById("statusCliente").textContent = cliente.Ativo
        ? "Ativo"
        : "Inativo";

      const canais = {
        1: "Barsotti",
        6: "Whatsapp",
        7: "Google",
      };

      document.getElementById("vendedorCliente").textContent =
        canais[cliente.Id_Vendedor] || "Desconhecido";

      // Limpa tabela
      tabelaCompras.innerHTML = "";

      // Últimas compras
      for (const compra of compras) {
        const listaToners =
          compra.itens && compra.itens.length > 0
            ? compra.itens
                .map(
                  (i) =>
                    `${i.Modelo} (${i.Quantidade} un • R$ ${Number(
                      i.Valor_Venda
                    ).toFixed(2)})`
                )
                .join("<br>")
            : "-";

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td class="py-3 border-b font-medium text-center">${new Date(
              compra.Data
            ).toLocaleDateString()}</td>
            <td class="py-3 border-b font-medium text-center">#${
              compra.Cod_Pedido
            }</td>
            <td class="py-3 border-b font-medium text-center">${
              compra.QuantidadeTotal
            }</td>
            <td class="py-3 border-b font-medium text-green-700 text-center">R$ ${compra.Valor_Total.toFixed(
              2
            )}</td>
            <td class="py-3 border-b text-center text-gray-700">${listaToners}</td>
        `;
        tabelaCompras.appendChild(tr);
      }

      // Histórico
      const blocos = document.getElementById("blocosHistorico");
      blocos.innerHTML = "";

      historico.forEach((item) => {
        const div = document.createElement("div");
        div.className =
          "p-4 rounded-lg shadow-md bg-gray-100 text-center border hover:bg-gray-200 transition";

        div.innerHTML = `
            <p class="font-bold text-gray-800 text-sm leading-tight">${item.Modelo}</p>
            <p class="text-xl font-semibold text-blue-700 mt-1">${item.QuantidadeTotal}</p>
        `;

        blocos.appendChild(div);
      });
    } catch (err) {
      console.error("Erro ao carregar detalhes do cliente:", err);
    }
  }

  // ===============================
  // 🎯 Modal
  // ===============================
  const btnNovoCliente = document.getElementById("btnNovoCliente");
  const modal = document.getElementById("modal-bg");

  btnNovoCliente.addEventListener("click", () =>
    modal.classList.remove("hidden")
  );
  window.fecharModal = () => modal.classList.add("hidden");

  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.classList.add("hidden");
  });

  // ===============================
  // 💾 Salvar Novo Cliente
  // ===============================
  const btnSalvar = document.getElementById("salvarCliente");

  btnSalvar.addEventListener("click", async () => {
    const nome = document.getElementById("nome").value.trim();
    const ativo = document.getElementById("ativo").checked;
    const id_vendedor = document.getElementById("idVendedor").value;
    const tipoCliente = isLocacao.checked ? 4 : 2;

    if (!nome) {
      alert("Digite o nome do cliente.");
      return;
    }

    try {
      const res = await fetch("/clientes/cadastrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome,
          ativo,
          id_vendedor,
          tipo: tipoCliente,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert("Erro ao salvar: " + (data.error || "Erro desconhecido"));
        return;
      }

      alert("Cliente cadastrado com sucesso!");

      // limpar form
      document.getElementById("nome").value = "";
      document.getElementById("ativo").checked = false;
      document.getElementById("idVendedor").value = "1";
      isLocacao.checked = false;

      fecharModal();
    } catch (error) {
      console.error("Erro ao salvar cliente:", error);
    }
  });
});
