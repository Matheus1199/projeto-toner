let toners = [];
let indexAtual = 0;
let respostas = [];
let divergenciasAtuais = [];
let contagemAtual = null;

// =======================
// INIT
// =======================
document.addEventListener("DOMContentLoaded", () => {
  carregarData();

  document
    .getElementById("btnIniciar")
    .addEventListener("click", iniciarContagem);

  document.getElementById("btnAnterior").addEventListener("click", anterior);

  document.getElementById("btnProximo").addEventListener("click", proximo);

  document
    .getElementById("estoqueFisico")
    .addEventListener("input", atualizarDiferenca);

  document
    .getElementById("btnSalvar")
    .addEventListener("click", salvarContagem);
});

document.getElementById("btnResumo").addEventListener("click", gerarResumo);

// =======================
// DATA
// =======================
function carregarData() {
  const hoje = new Date().toLocaleDateString("pt-BR");
  document.getElementById("dataHoje").innerText = hoje;
}

// =======================
// INICIAR CONTAGEM
// =======================
async function iniciarContagem() {
  document.getElementById("inicioContagem").classList.add("hidden");
  document.getElementById("cardContagem").classList.remove("hidden");

  const resp = await fetch("/estoque/saldo");
  toners = await resp.json();

  respostas = toners.map((t) => ({
    cod_toner: t.Cod_Produto,
    saldo_sistema: t.SaldoSistema,
    estoque_fisico: null,
    obs: "",
  }));

  indexAtual = 0;
  carregarToner();
}

// =======================
// CARREGAR TONER ATUAL
// =======================
function carregarToner() {
  const t = toners[indexAtual];
  const r = respostas[indexAtual];

  document.getElementById("contador").innerText = `Toner ${indexAtual + 1} de ${
    toners.length
  }`;

  document.getElementById("nomeToner").innerText = `${t.Marca} ${t.Modelo}`;

  document.getElementById("saldoSistema").innerText = t.SaldoSistema;
  document.getElementById("estoqueFisico").value = r.estoque_fisico;
  document.getElementById("obsItem").value = r.obs;

  atualizarDiferenca();

  document.getElementById("btnAnterior").disabled = indexAtual === 0;
  document.getElementById("btnProximo").innerText =
    indexAtual === toners.length - 1 ? "Finalizar →" : "Próximo →";
}

// =======================
// DIFERENÇA EM TEMPO REAL
// =======================
function atualizarDiferenca() {
  const saldo = toners[indexAtual].SaldoSistema;
  const fisico = Number(document.getElementById("estoqueFisico").value || 0);
  const diff = saldo - fisico;

  const el = document.getElementById("diferenca");
  el.innerText = diff;

  el.className =
    diff === 0 ? "font-bold text-green-600" : "font-bold text-red-600";
}

// =======================
// NAVEGAÇÃO
// =======================
function salvarEstadoAtual() {
  respostas[indexAtual].estoque_fisico = Number(
    document.getElementById("estoqueFisico").value || 0
  );

  respostas[indexAtual].obs = document.getElementById("obsItem").value || "";
}

function proximo() {
  const inputFisico = document.getElementById("estoqueFisico");
  const valor = inputFisico.value;

  if (valor === "" || valor === null) {
    inputFisico.classList.add("border-red-500");
    inputFisico.focus();
    return;
  }

  inputFisico.classList.remove("border-red-500");

  salvarEstadoAtual();

  if (indexAtual < toners.length - 1) {
    indexAtual++;
    carregarToner();
  } else {
    // Último toner → ir para contagem total
    mostrarCardTotal();
  }
}

function anterior() {
  salvarEstadoAtual();
  if (indexAtual > 0) {
    indexAtual--;
    carregarToner();
  }
}

function mostrarCardTotal() {
  document.getElementById("cardContagem").classList.add("hidden");
  document.getElementById("cardTotal").classList.remove("hidden");

  let totalSistema = 0;
  respostas.forEach((r) => (totalSistema += r.saldo_sistema));

  document.getElementById("totalSistemaResumo").innerText = totalSistema;
}


// =======================
// SALVAR CONTAGEM
// =======================
async function salvarContagem() {
  const obsGeral = document.getElementById("obsGeral").value;

  let totalSistema = 0;
  let totalFisico = 0;

  respostas.forEach((r) => {
    totalSistema += r.saldo_sistema;
    totalFisico += r.estoque_fisico;
  });

  const payload = {
    obs_geral: obsGeral,
    total_sistema: totalSistema,
    total_fisico: totalFisico,
    itens: respostas,
  };

  try {
    const resp = await fetch("/contagem/salvar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await resp.json();

    const msg = document.getElementById("mensagem");
    msg.innerText = result.mensagem;
    msg.className = result.erro
      ? "mt-4 text-red-600 font-bold"
      : "mt-4 text-green-600 font-bold";

    // ✅ SE SALVOU COM SUCESSO → REINICIA A TELA
    if (!result.erro) {
      setTimeout(() => {
        window.location.reload();
      }, 1500); // 1,5 segundos para o usuário ver a mensagem
    }
  } catch (e) {
    console.error(e);
  }
}


function gerarResumo() {
  const container = document.getElementById("listaDivergencias");
  container.innerHTML = "";

  respostas.forEach((r, i) => {
    const diff = r.saldo_sistema - r.estoque_fisico;
    if (diff === 0) return;

    const t = toners[i];

    const div = document.createElement("div");
    div.className = "border rounded-lg p-4 bg-red-50";

    div.innerHTML = `
      <div class="font-semibold mb-2">${t.Marca} ${t.Modelo}</div>

      <div class="flex justify-between text-sm mb-2">
        <span>Saldo:</span>
        <span>${r.saldo_sistema}</span>
      </div>

      <label class="text-sm">Estoque Físico</label>
      <input type="number"
             class="w-full border p-2 rounded mt-1"
             value="${r.estoque_fisico}"
             onchange="atualizarItem(${i}, this.value)">

      <label class="text-sm mt-2 block">OBS</label>
      <input type="text"
             class="w-full border p-2 rounded"
             value="${r.obs || ""}"
             onchange="atualizarObs(${i}, this.value)">
    `;

    container.appendChild(div);
  });

  document.getElementById("cardTotal").classList.add("hidden");
  document.getElementById("cardResumo").classList.remove("hidden");
  document.getElementById("btnSalvar").classList.remove("hidden");
}

function atualizarItem(index, valor) {
  respostas[index].estoque_fisico = Number(valor || 0);
}

function atualizarObs(index, valor) {
  respostas[index].obs = valor;
}

async function carregarUltimasContagens() {
  const container = document.getElementById("ultimasContagens");
  container.innerHTML = "";

  try {
    const resp = await fetch("/contagem/ultimas-divergencias");
    const dados = await resp.json();

    dados.forEach((c) => {
      const card = document.createElement("div");
      card.className = "bg-white p-5 rounded-2xl shadow-sm border";

      card.innerHTML = `
        <h4 class="font-semibold text-gray-700 mb-2">
          ${c.NomeContagem}
        </h4>

        <p class="text-sm text-gray-500 mb-2">
          Usuário: <strong>${c.Usuario}</strong>
        </p>

        <p class="text-lg font-bold text-red-600 mb-4">
          ${c.QtdDivergencias} divergência(s)
        </p>

        <button
          onclick="verDivergencias(${c.Id_Contagem})"
          class="text-blue-600 font-semibold hover:underline">
          Ver divergências →
        </button>
      `;

      container.appendChild(card);
    });
  } catch (e) {
    console.error(e);
  }
}

async function verDivergencias(idContagem) {
  const modal = document.getElementById("modalDivergencias");
  const container = document.getElementById("listaModalDivergencias");

  container.innerHTML = "Carregando...";
  modal.classList.remove("hidden");
  modal.classList.add("flex");

  try {
    const resp = await fetch(`/contagem/divergencias/${idContagem}`);
    const dados = await resp.json();

    container.innerHTML = "";

    if (dados.length === 0) {
      container.innerHTML =
        "<p class='text-center text-gray-500'>Nenhuma divergência encontrada.</p>";
      return;
    }

    dados.forEach((d) => {
      const diff = d.SaldoSistema - d.EstoqueFisico;

      const div = document.createElement("div");
      div.className = "border rounded-xl p-4 bg-gray-50";

      div.innerHTML = `
        <div class="font-semibold text-gray-800 mb-2">
          ${d.Marca} ${d.Modelo}
        </div>

        <div class="grid grid-cols-2 gap-4 text-sm mb-2">
          <div>Saldo Sistema: <strong>${d.SaldoSistema}</strong></div>
          <div>Estoque Físico: <strong>${d.EstoqueFisico}</strong></div>
        </div>

        <div class="text-sm mb-2">
          Diferença:
          <strong class="${diff === 0 ? "text-green-600" : "text-red-600"}">
            ${diff}
          </strong>
        </div>

        <div class="text-sm text-gray-600">
          OBS: ${d.Obs || "-"}
        </div>
      `;

      container.appendChild(div);
    });
  } catch (e) {
    container.innerHTML =
      "<p class='text-center text-red-600'>Erro ao carregar divergências.</p>";
  }
}


function fecharModal() {
  const modal = document.getElementById("modalDivergencias");
  modal.classList.add("hidden");
  modal.classList.remove("flex");
}


carregarUltimasContagens();
