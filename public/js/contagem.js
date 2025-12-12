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
    let totalSistema = 0;

    toners.forEach((t) => {
    totalSistema += Number(t.SaldoSistema);

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

    // ADICIONAR AGORA A LINHA TOTAL
    adicionarLinhaTotal(totalSistema);
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

function adicionarLinhaTotal(totalSistema) {
  const tbody = document.getElementById("listaToners");

  const linha = document.createElement("tr");
  linha.innerHTML = `
        <td class="p-2 font-bold text-gray-700">TOTAL</td>
        <td id="totalSistemaCell" class="p-2 font-bold text-blue-600">${totalSistema}</td>
        <td class="p-2">
            <input id="totalFisico" type="number" class="border p-1 w-24 rounded" value="0">
        </td>
        <td class="p-2">—</td>
        <td class="p-2">
            <input id="obsTotal" type="text" class="border p-1 w-24 rounded" placeholder="OBS">
        </td>
    `;

  tbody.appendChild(linha);
}




// Função para salvar a contagem do dia
async function salvarContagem() {
  const obsGeral = document.getElementById("obsGeral").value;

  const linhas = document.querySelectorAll("#listaToners tr");

  let itens = [];

  linhas.forEach((linha) => {
    const inputEstoque = linha.querySelector(".estoqueInput");

    // Se a linha não for de item (ex: TOTAL), pula
    if (!inputEstoque) return;

    const inputObs = linha.querySelector(".obsInput");

    itens.push({
      cod_toner: parseInt(inputEstoque.dataset.cod),
      saldo_sistema: parseInt(inputEstoque.dataset.saldo),
      estoque_fisico: parseInt(inputEstoque.value || 0),
      obs: inputObs.value || "",
    });
  });

  const totalSistema = Number(
    document.getElementById("totalSistemaCell").innerText
  );
  const totalFisico = Number(document.getElementById("totalFisico").value || 0);
  const obsTotal = document.getElementById("obsTotal").value || "";

  const payload = {
    obs_geral: obsGeral,
    obs_total: obsTotal,
    total_sistema: totalSistema,
    total_fisico: totalFisico,
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
