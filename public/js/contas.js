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

carregarContas();