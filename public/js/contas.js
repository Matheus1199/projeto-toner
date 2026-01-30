async function carregarContas() {
            const res = await fetch("/contas/listar");
            const data = await res.json();

            const tbody = document.getElementById("tabelaContas");
            tbody.innerHTML = "";

            data.forEach(c => {
                tbody.innerHTML += `
                    <tr class="border-b">
                        <td class="p-2">${c.Id_Conta}</td>
                        <td class="p-2">${c.Nome}</td>
                        <td class="p-2">R$ ${c.Saldo.toFixed(2)}</td>
                        <td class="p-2">${c.Empresa}</td>
                        <td class="p-2">${c.Ativo ? "Sim" : "Não"}</td>
                        <td class="p-2">${new Date(c.Dt_Atualizacao).toLocaleDateString("pt-BR")}</td>
                    </tr>
                `;
            });
        }

        async function carregarContasSelect() {
            const res = await fetch("/contas/listar");
            const data = await res.json();
            const select = document.getElementById("conta");

            select.innerHTML = "";
            data.forEach(c => {
                select.innerHTML += `<option value="${c.Id_Conta}">${c.Nome}</option>`;
            });
        }

        function openModal() {
            carregarContasSelect();
            document.getElementById("modalLancamento").classList.remove("hidden");
            document.getElementById("modalLancamento").classList.add("flex");
        }

        function closeModal() {
            document.getElementById("modalLancamento").classList.add("hidden");
            document.getElementById("modalLancamento").classList.remove("flex");
        }

        document.getElementById("formLancamento").addEventListener("submit", async (e) => {
            e.preventDefault();

            const body = {
                conta: document.getElementById("conta").value,
                valor: document.getElementById("valor").value,
                operacao: document.getElementById("operacao").value,
                obs: document.getElementById("obs").value
            };

            const res = await fetch("/contas/lancar", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });

            if (res.ok) {
                closeModal();
                carregarContas();
                alert("Lançamento salvo!");
            } else {
                alert("Erro ao salvar lançamento.");
            }
        });

async function carregarSaldoTotal() {
  try {
    const res = await fetch("/contas/soma");
    const data = await res.json();

    document.getElementById("saldoTotal").textContent =
      data.total.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      });
  } catch (err) {
    console.error("Erro ao carregar saldo total:", err);
  }
}

let limiteAtual = 10;

document.addEventListener("DOMContentLoaded", () => {

    // registrar clique nos botões
    document.querySelectorAll(".filtro-btn").forEach(btn => {
        btn.addEventListener("click", () => {

            document.querySelectorAll(".filtro-btn")
                .forEach(b => b.classList.remove("ativo"));

            btn.classList.add("ativo");

            limiteAtual = btn.dataset.limit;
            carregarMovimentacoes();
        });
    });

    // primeira carga
    carregarMovimentacoes();
});

async function carregarMovimentacoes() {
    try {
        const res = await fetch(`/contas/movimentacoes?limit=${limiteAtual}`);
        const dados = await res.json();

        const tbody = document.getElementById("tabelaMovimentacoes");
        tbody.innerHTML = "";

        if (dados.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="p-4 text-center text-gray-500">
                        Nenhuma movimentação encontrada
                    </td>
                </tr>
            `;
            return;
        }

        dados.forEach(mov => {
            const tr = document.createElement("tr");

            tr.innerHTML = `
                <td class="p-2">${formatarData(mov.Data)}</td>
                <td class="p-2">${mov.Conta}</td>
                <td class="p-2 ${mov.Operacao === 1 ? 'text-green-600' : 'text-red-600'}">
                    ${mov.Operacao === 1 ? 'Crédito' : 'Débito'}
                </td>
                <td class="p-2 font-medium">
                    ${mov.Valor.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL"
                    })}
                </td>
                <td class="p-2">${mov.Obs || ''}</td>
            `;

            tbody.appendChild(tr);
        });

    } catch (err) {
        console.error("Erro ao carregar movimentações:", err);
    }
}

function formatarData(data) {
    return new Date(data).toLocaleDateString("pt-BR");
}



carregarContas();
carregarSaldoTotal();