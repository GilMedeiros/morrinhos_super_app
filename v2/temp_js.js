// Popular modal com detalhes
function populateModalDetalhes(disparo) {
    try {
        // Elementos básicos
        document.getElementById('modalDisparoNome').textContent = disparo.nome;
        document.getElementById('modalDataCriacao').textContent = formatarDataHora(disparo.data_disparo);
        document.getElementById('modalDescricao').textContent = disparo.descricao || 'Sem descrição';

        // Status
        const statusBadge = `<span class="badge ${getStatusClass(disparo.status)}">${getStatusText(disparo.status)}</span>`;
        document.getElementById('modalStatus').innerHTML = statusBadge;

        // Mensagem personalizada
        const mensagemTextarea = document.getElementById('modalMensagemPersonalizada');
        if (mensagemTextarea) {
            mensagemTextarea.value = disparo.mensagem_personalizada || '';
            // Desabilitar se o disparo já estiver em andamento ou concluído
            mensagemTextarea.disabled = ['executing', 'done'].includes(disparo.status);
        }

        // Progresso
        const total = disparo.total_solicitacoes || 0;
        const processadas = disparo.solicitacoes_enviadas || 0;
        const progresso = total > 0 ? Math.round((processadas / total) * 100) : 0;

        const progressBar = document.getElementById('modalProgressBar');
        progressBar.style.width = `${progresso}%`;
        progressBar.className = `progress-bar ${getProgressBarClass(progresso)}`;
        document.getElementById('modalProgressText').textContent = `${processadas} de ${total} processados`;

        // Lista de devedores
        const tbody = document.getElementById('modalListaDevedores');
        tbody.innerHTML = '';

        if (disparo.solicitacoes && disparo.solicitacoes.length > 0) {
            disparo.solicitacoes.forEach(sol => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>
                        <small class="text-muted">${sol.solicitacao_id || '-'}</small>
                    </td>
                    <td>${sol.data.nome || '-'}</td>
                    <td>${sol.data.telefone || '-'}</td>
                    <td>
                        <span class="badge ${getStatusSolicitacaoClass(sol.status)}">
                            ${getStatusSolicitacaoText(sol.status)}
                        </span>
                    </td>
                `;
                tbody.appendChild(row);
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Nenhum devedor encontrado</td></tr>';
        }

        // Configurar botões
        const btnExecutar = document.getElementById('btnExecutarDisparo');
        const btnPausar = document.getElementById('btnPausarDisparo');
        const btnDeletar = document.getElementById('btnDeletarDisparo');

        // Lógica de habilitação/desabilitação dos botões baseada no status
        const isExecutando = disparo.status === 'executing';
        const isConcluido = disparo.status === 'done';

        btnExecutar.disabled = isExecutando || isConcluido;
        btnPausar.disabled = !isExecutando;

        // Event listeners
        btnExecutar.onclick = () => executarDisparo(disparo.id);
        btnPausar.onclick = () => pausarDisparo(disparo.id, disparo.status);
        btnDeletar.onclick = () => deletarDisparo(disparo.id, disparo.nome);

    } catch (error) {
        console.error('Erro ao popular detalhes do modal:', error);
        mostrarToast('Erro ao carregar detalhes do disparo: ' + error.message, 'error');
    }
}

// Executar disparo
async function executarDisparo(disparoId) {
    const mensagemPersonalizada = document.getElementById('modalMensagemPersonalizada').value.trim();
    if (!mensagemPersonalizada) {
        mostrarToast('Por favor, digite a mensagem que será enviada.', 'warning');
        document.getElementById('modalMensagemPersonalizada').focus();
        return;
    }

    if (!confirm('Tem certeza que deseja executar este disparo? Esta ação não pode ser desfeita.')) {
        return;
    }

    try {
        mostrarToast('Iniciando execução do disparo...', 'info');

        const response = await fetch(`/api/disparos/${disparoId}/execute`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                mensagem_personalizada: mensagemPersonalizada
            })
        });

        const data = await response.json();

        if (data.status === 'success') {
            mostrarToast('Disparo iniciado com sucesso!', 'success');
            const modal = bootstrap.Modal.getInstance(document.getElementById('modalDetalhesDisparo'));
            if (modal) {
                modal.hide();
            }
            await loadDisparos();
            loadQueueStatus();
        } else {
            throw new Error(data.message || 'Erro ao executar disparo');
        }
    } catch (error) {
        console.error('Erro ao executar disparo:', error);
        mostrarToast('Erro ao executar disparo: ' + error.message, 'danger');
    }
}