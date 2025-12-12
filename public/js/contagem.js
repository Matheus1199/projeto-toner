document.addEventListener("DOMContentLoaded", () => {
  carregarData();
  carregarToners();
  document
    .getElementById("btnSalvar")
    .addEventListener("click", salvarContagem);
});

// Exibe a data formatada no card "Contagem do dia"
function carregarData() {
  const hoje = new Date().toLocaleDateString("pt-BR");
  document.getElementById("dataHoje").innerText = hoje;
}

// Função para carregar os toners do banco
async function carregarToners() {
  const tbody = document.getElementById("listaToners");
  tbody.innerHTML =
    "<tr><td colspan='5' class='p-4 text-center'>Carregando...</td></tr>";

  try {
    // Chama a API para buscar os toners
    const resp = await fetch("/estoque/saldo");
    const toners = await resp.json();

    tbody.innerHTML = "";

    // Preenche a tabela com os toners e o estoque
    toners.forEach((t) => {
      const linha = document.createElement("tr");

      linha.innerHTML = `
                <td class="p-2">${t.Marca} ${t.Modelo}</td>
                <td class="p-2 font-semibold text-blue-600">${t.SaldoSistema}</td>
                <td class="p-2">
                    <input type="number" 
                           class="border p-1 w-20 rounded estoqueInput"
                           data-cod="${t.Cod_Produto}"
                           data-saldo="${t.SaldoSistema}"
                           value="0" />
                </td>
                <td class="p-2 diffCell font-bold text-red-600">0</td>
                <td class="p-2">
                    <input type="text" class="border p-1 rounded obsInput" placeholder="OBS">
                </td>
            `;

      tbody.appendChild(linha);
    });

    configurarCalculo();
  } catch (e) {
    console.error(e);
  }
}

// Atualiza a diferença automaticamente quando o usuário insere o estoque físico
function configurarCalculo() {
  const inputs = document.querySelectorAll(".estoqueInput");

  inputs.forEach((input) => {
    input.addEventListener("input", () => {
      const saldo = parseInt(input.dataset.saldo);
      const fisico = parseInt(input.value || 0);
      const diff = saldo - fisico;

      input.closest("tr").querySelector(".diffCell").innerText = diff;
    });
  });
}

// Função para salvar a contagem do dia
async function salvarContagem() {
  const obsGeral = document.getElementById("obsGeral").value;

  const linhas = document.querySelectorAll("#listaToners tr");

  let itens = [];

  linhas.forEach((linha) => {
    const inputEstoque = linha.querySelector(".estoqueInput");
    const inputObs = linha.querySelector(".obsInput");
    const diff = linha.querySelector(".diffCell");

    itens.push({
      cod_toner: parseInt(inputEstoque.dataset.cod),
      estoque_fisico: Number(inputEstoque.value) || 0,
      saldo_sistema: Number(inputEstoque.dataset.saldo) || 0,
      obs: inputObs.value,
    });
  });

  const payload = {
    obs_geral: obsGeral,
    itens,
  };

  try {
    const resp = await fetch("/contagem/salvar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await resp.json();

    if (result.erro) {
      document.getElementById("mensagem").innerText = result.mensagem;
      document.getElementById("mensagem").className =
        "mt-4 text-red-600 font-bold";
    } else {
      document.getElementById("mensagem").innerText = result.mensagem;
      document.getElementById("mensagem").className =
        "mt-4 text-green-600 font-bold";
    }
  } catch (e) {
    console.error(e);
  }
}
