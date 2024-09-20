function carregarAgendamentos(user) {
    console.log("Iniciando carregamento de agendamentos para o usuário:", user.uid);
    const agendamentosList = document.getElementById('agendamentosList');
    const agendamentosRealizados = document.getElementById('agendamentosRealizados');
    const agendamentosRealizadosSection = document.getElementById('agendamentosRealizadosSection');
    agendamentosList.innerHTML = '<div class="col-span-full text-center"><i class="fas fa-spinner fa-spin text-4xl text-orange-custom"></i></div>';
    agendamentosRealizados.innerHTML = '';

    db.collection("appointments").doc(user.uid).get()
        .then((doc) => {
            console.log("Documento obtido:", doc.exists ? "existe" : "não existe");
            agendamentosList.innerHTML = '';
            if (doc.exists && doc.data().appointments) {
                const appointments = doc.data().appointments;
                console.log("Número de agendamentos:", appointments.length);
                let hasRealizados = false;
                appointments.forEach((appointment, index) => {
                    console.log("Dados do agendamento:", appointment);
                    const dataHoraExata = appointment.dataHoraExata || 'Data não disponível';
                    console.log("Data e hora do agendamento:", dataHoraExata);

                    const card = document.createElement('div');
                    card.className = 'bg-dark-surface rounded-lg overflow-hidden shadow-lg hover-grow fade-in';
                    card.style.animationDelay = `${index * 0.1}s`;
                    card.innerHTML = `
                        <div class="bg-orange-custom text-white p-4 flex justify-between items-center">
                            <h3 class="text-xl font-bold">${appointment.serviceName}</h3>
                            <i class="fas fa-cut text-2xl"></i>
                        </div>
                        <div class="p-6">
                            <p class="text-lg mb-2 text-gray-400"><strong><i class="far fa-calendar-alt mr-2"></i>Agendado para:</strong></p>
                            <p class="text-2xl font-bold mb-4 text-orange-custom">${dataHoraExata}</p>
                            <div class="bg-gray-800 p-3 rounded-lg mb-4 flex justify-between items-center">
                                <span class="text-gray-400"><i class="fas fa-tag mr-2"></i>Preço:</span>
                                <span class="text-2xl font-bold text-orange-custom">R$ ${typeof appointment.price === 'number' ? appointment.price.toFixed(2) : appointment.price}</span>
                            </div>
                            <p class="mb-2"><strong class="text-gray-400"><i class="fas fa-user mr-2"></i>Funcionário:</strong> ${appointment.workerName}</p>
                            <p class="mb-2"><strong class="text-gray-400"><i class="fas fa-building mr-2"></i>Estabelecimento:</strong> ${appointment.establishmentName}</p>
                            <p class="mb-2"><strong class="text-gray-400"><i class="fas fa-info-circle mr-2"></i>Status:</strong> <span class="${appointment.realizado ? 'text-green-400' : 'text-yellow-400'} font-bold">${appointment.realizado ? 'Realizado' : 'Pendente'}</span></p>
                            <p class="mb-2"><strong class="text-gray-400"><i class="fas fa-money-bill-wave mr-2"></i>Pagamento:</strong> <span class="${appointment.pagamento ? 'text-green-400' : 'text-red-400'} font-bold">${appointment.pagamento ? 'Pago' : 'Não Pago'}</span></p>
                            ${!appointment.pagamento ? `
                                <button onclick="realizarPagamento(${index})" class="mt-2 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded w-full transition duration-300 hover:shadow-lg flex items-center justify-center">
                                    <i class="fas fa-credit-card mr-2"></i>Pagar Agora
                                </button>
                            ` : ''}
                            <button onclick="mostrarComentarios(${index})" class="mt-2 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded w-full transition duration-300 hover:shadow-lg flex items-center justify-center">
                                <i class="fas fa-comment mr-2"></i>${appointment.comentario ? 'Ver Comentário' : 'Comentar'}
                            </button>
                            <p id="cronometro-${index}" class="text-sm mt-4 ${appointment.pagamento ? 'text-green-400' : ''}"></p>
                            ${!appointment.pagamento ? `
                                <button onclick="cancelarAgendamento(${index})" class="mt-4 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded w-full transition duration-300 hover:shadow-lg flex items-center justify-center">
                                    <i class="fas fa-times-circle mr-2"></i>Cancelar Agendamento
                                </button>
                            ` : ''}
                        </div>
                    `;

                    if (appointment.pagamento) {
                        card.className += ' w-1/4 m-2'; // Ajuste o tamanho e margens dos cards realizados
                        agendamentosRealizados.appendChild(card);
                        hasRealizados = true;
                    } else {
                        agendamentosList.appendChild(card);
                    }

                    iniciarCronometro(index, appointment.dataHoraExata, appointment.pagamento);
                });

                if (!hasRealizados) {
                    agendamentosRealizadosSection.style.display = 'none';
                } else {
                    agendamentosRealizadosSection.style.display = 'block';
                }
            } else {
                console.log("Nenhum agendamento encontrado");
                agendamentosList.innerHTML = '<p class="text-gray-400 text-center text-lg col-span-full fade-in"><i class="fas fa-calendar-times mr-2"></i>Você não tem agendamentos.</p>';
            }
        })
        .catch((error) => {
            console.error("Erro ao carregar agendamentos:", error);
            agendamentosList.innerHTML = '<p class="text-red-400 text-center text-lg col-span-full fade-in"><i class="fas fa-exclamation-triangle mr-2"></i>Erro ao carregar agendamentos. Por favor, tente novamente mais tarde.</p>';
        });
}

function iniciarCronometro(index, dataHoraExata, pago) {
    const cronometroElement = document.getElementById(`cronometro-${index}`);
    const dataHoraAgendamento = new Date(dataHoraExata.replace(/(\d{2})\/(\d{2})\/(\d{4})/, '$3-$2-$1'));

    const limiteParaCancelamento = new Date(dataHoraAgendamento.getTime() - 90 * 60000); // 1h30min antes

    function atualizarCronometro() {
        const agora = new Date();
        const tempoAteLimite = limiteParaCancelamento - agora;

        if (pago) {
            cronometroElement.innerHTML = `
                <strong class="text-green-400"><i class="fas fa-check-circle mr-2"></i>Agendamento confirmado</strong>
            `;
        } else if (tempoAteLimite > 0) {
            const horas = Math.floor(tempoAteLimite / (1000 * 60 * 60));
            const minutos = Math.floor((tempoAteLimite % (1000 * 60 * 60)) / (1000 * 60));
            const segundos = Math.floor((tempoAteLimite % (1000 * 60)) / 1000);

            cronometroElement.innerHTML = `
                <strong class="text-gray-400"><i class="fas fa-hourglass-half mr-2"></i>Tempo para cancelar sem taxa:</strong>
                <span class="text-orange-custom">${horas}h ${minutos}m ${segundos}s</span>
            `;
            setTimeout(atualizarCronometro, 1000);
        } else if (agora < dataHoraAgendamento) {
            cronometroElement.innerHTML = '<strong class="text-yellow-400"><i class="fas fa-exclamation-triangle mr-2"></i>Cancelamento sujeito a taxa</strong>';
        } else {
            cronometroElement.innerHTML = '<strong class="text-red-400"><i class="fas fa-exclamation-triangle mr-2"></i>Agendamento expirado</strong>';
        }
    }

    atualizarCronometro();
}

function cancelarAgendamento(index) {
    const user = auth.currentUser;
    if (user) {
        db.collection("appointments").doc(user.uid).get().then((doc) => {
            if (doc.exists) {
                const appointments = doc.data().appointments;
                const appointment = appointments[index];
                const dataHoraAgendamento = getDataHoraAgendamento(appointment.day, appointment.time);
                const agora = new Date();
                const limiteParaCancelamento = new Date(dataHoraAgendamento.getTime() - 90 * 60000); // 1h30min antes

                let mensagem = "Tem certeza que deseja cancelar este agendamento?";
                if (agora > limiteParaCancelamento) {
                    mensagem += "\nAtenção: Será cobrada uma taxa de cancelamento.";
                }

                if (confirm(mensagem)) {
                    appointments.splice(index, 1);
                    db.collection("appointments").doc(user.uid).update({
                        appointments: appointments
                    }).then(() => {
                        alert("Agendamento cancelado com sucesso!");
                        carregarAgendamentos(user);
                    }).catch((error) => {
                        console.error("Erro ao cancelar agendamento:", error);
                        alert("Erro ao cancelar agendamento. Por favor, tente novamente.");
                    });
                }
            }
        });
    }
}

function getDataHoraAgendamento(day, time) {
    const dataAgendamento = getProximaData(day);
    const [hora, minuto] = time.split(':');
    dataAgendamento.setHours(parseInt(hora), parseInt(minuto));
    return dataAgendamento;
}
