// Variáveis globais
let currentUser = null;
let selectedDay = '';
let selectedTime = null; // Variável para armazenar o horário selecionado
let selectedServiceId = '';
let selectedCnpj = '';
let currentStartTime = '';
let currentEndTime = '';
let selectedWorkerId = null; // Variável para armazenar o ID do funcionário selecionado
let isRedirecting = false;
 
// Função para buscar dados pelo CNPJ
function fetchDataByCNPJ(cnpj) {
    const statusElement = document.getElementById('firebaseStatus');
    if (!cnpj) {
        statusElement.textContent = "Por favor, insira um CNPJ.";
        statusElement.classList.add('text-red-600');
        return;
    }
 
    console.log("Buscando dados para o CNPJ:", cnpj);
 
    // Buscar dados do estabelecimento pelo CNPJ
    db.collection("users").where("cnpj", "==", cnpj).get().then((userSnapshot) => {
        if (userSnapshot.empty) {
            statusElement.textContent = "Nenhum estabelecimento encontrado com este CNPJ.";
            statusElement.classList.add('text-red-600');
            return;
        }
 
        const userData = userSnapshot.docs[0].data();
        const userUid = userSnapshot.docs[0].id;
        const establishmentName = userData.establishmentName || 'N/A';
        const userEmail = userData.email || 'N/A';
        const userPhone = userData.phone || 'N/A';
        const logoUrl = userData.logoUrl || '';
 
        const dataList = document.getElementById('dataList');
        dataList.innerHTML = `
            <div class="text-center mb-8">
                ${logoUrl ? `<img src="${logoUrl}" alt="Logo do Estabelecimento" class="mx-auto mb-6 w-48 h-48 object-cover rounded-full border-4 border-orange-custom shadow-lg">` : ''}
                <h2 class="text-5xl font-extrabold text-orange-custom">${establishmentName}</h2>
            </div>
            <div class="bg-dark-surface p-6 rounded-lg shadow-lg mb-8">
                <p class="mb-2"><strong class="text-orange-custom"><i class="fas fa-id-card mr-2"></i>CNPJ:</strong> ${cnpj}</p>
                <p class="mb-2"><strong class="text-orange-custom"><i class="fas fa-envelope mr-2"></i>Email:</strong> ${userEmail}</p>
                <p><strong class="text-orange-custom"><i class="fas fa-phone mr-2"></i>Telefone:</strong> ${userPhone}</p>
            </div>
            <div id="comentariosContainer" class="bg-dark-surface p-6 rounded-lg shadow-lg mb-8">
                <h3 class="text-2xl font-bold mb-4 text-orange-custom"><i class="fas fa-comments mr-2"></i>Comentários dos Clientes</h3>
                <div id="comentariosList" class="space-y-4"></div>
            </div>
        `;
 
        // Buscar comentários dos clientes
        buscarComentarios(cnpj);
 
        // Buscar todos os serviços dentro da subcoleção "services" do usuário
        db.collection("users").doc(userUid).collection("services").get().then((querySnapshot) => {
            if (querySnapshot.empty) {
                statusElement.textContent = "Nenhum serviço encontrado para este CNPJ.";
                statusElement.classList.add('text-red-600');
                return;
            }
            const servicesContainer = document.createElement('div');
            servicesContainer.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';
            querySnapshot.forEach((doc) => {
                const serviceData = doc.data();
                const serviceCard = document.createElement('div');
                serviceCard.className = 'bg-dark-surface p-4 rounded-lg shadow-lg hover-grow fade-in';
                serviceCard.innerHTML = `
                    <h3 class="text-xl font-bold mb-3 text-orange-custom"><i class="fas fa-cut mr-2"></i>${serviceData.name || 'N/A'}</h3>
                    <p class="text-sm mb-3 text-gray-300">${serviceData.description || 'N/A'}</p>
                    <p class="font-bold mb-3 text-green-400"><i class="fas fa-dollar-sign mr-2"></i>R$ ${serviceData.price || 'N/A'}</p>
                    <img src="${serviceData.imageUrl || ''}" alt="Imagem do Serviço" class="w-full h-40 object-cover rounded-lg mb-3">
                    <button onclick="agendarServico('${doc.id}', '${serviceData.name}')" class="bg-orange-custom hover:bg-orange-600 text-white font-bold py-2 px-4 rounded w-full transition duration-300 hover:shadow-lg">
                        <i class="fas fa-calendar-plus mr-2"></i>Agendar
                    </button>
                `;
                servicesContainer.appendChild(serviceCard);
            });
            dataList.appendChild(servicesContainer);
            statusElement.textContent = "Dados carregados com sucesso!";
            statusElement.classList.add('text-green-600');
        }).catch((error) => {
            console.error("Erro ao buscar serviços: ", error);
            statusElement.textContent = "Erro ao carregar dados dos serviços.";
            statusElement.classList.add('text-red-600');
        });
    }).catch((error) => {
        console.error("Erro ao buscar estabelecimento: ", error);
        statusElement.textContent = "Erro ao carregar dados do estabelecimento.";
        statusElement.classList.add('text-red-600');
    });
}
 
// Função para obter o parâmetro CNPJ da URL
function getCnpjFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('cnpj');
}
 
// Chamar a função para buscar dados pelo CNPJ quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    const cnpj = getCnpjFromUrl();
    if (cnpj) {
        fetchDataByCNPJ(cnpj);
    } else {
        const statusElement = document.getElementById('firebaseStatus');
        statusElement.textContent = "CNPJ não fornecido na URL.";
        statusElement.classList.add('text-red-600');
    }
});
 
let comentariosCarrossel = [];
let comentarioAtual = 0;
let carrosselInterval;
 
function buscarComentarios(cnpj) {
    const comentariosList = document.getElementById('comentariosList');
    comentariosList.innerHTML = '<p class="text-gray-400">Carregando comentários...</p>';
 
    db.collection("appointments").get().then((querySnapshot) => {
        comentariosCarrossel = [];
        querySnapshot.forEach((doc) => {
            const appointments = doc.data().appointments;
            if (Array.isArray(appointments)) {
                appointments.forEach(appointment => {
                    if (appointment.cnpj === cnpj && appointment.comentario) {
                        comentariosCarrossel.push(appointment.comentario);
                    }
                });
            }
        });
 
        if (comentariosCarrossel.length === 0) {
            comentariosList.innerHTML = '<p class="text-gray-400">Nenhum comentário encontrado.</p>';
            return;
        }
 
        comentariosList.innerHTML = `
            <div id="comentarioCarrossel" class="relative overflow-hidden w-full">
                <div id="comentarioSlider" class="flex transition-transform duration-500 ease-in-out">
                    ${comentariosCarrossel.map((comentario, index) => `
                        <div class="comentario-item w-1/4 flex-shrink-0 px-2">
                            <div class="bg-gray-800 p-4 rounded-lg h-full overflow-y-auto">
                                <div class="flex items-center mb-2">
                                    <img src="${comentario.userPhotoURL || 'https://via.placeholder.com/40'}" alt="Foto do usuário" class="w-10 h-10 rounded-full mr-3">
                                    <div>
                                        <p class="font-bold text-orange-custom">${comentario.userName || 'Usuário Anônimo'}</p>
                                        <p class="text-sm text-gray-400">${comentario.data}</p>
                                    </div>
                                </div>
                                <p class="text-gray-300 mb-2">${comentario.texto}</p>
                                <p class="text-sm text-gray-400"><strong>Funcionário:</strong> ${comentario.workerName}</p>
                                <p class="text-sm text-gray-400"><strong>Serviço:</strong> ${comentario.serviceName}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
 
        if (comentariosCarrossel.length > 4) {
            iniciarCarrosselAutomatico();
            iniciarArrasteCarrossel();
        }
 
    }).catch((error) => {
        console.error("Erro ao buscar comentários:", error);
        comentariosList.innerHTML = '<p class="text-red-500">Erro ao carregar comentários.</p>';
    });
}
 
function atualizarCarrossel() {
    const slider = document.getElementById('comentarioSlider');
    slider.style.transform = `translateX(-${comentarioAtual * 25}%)`;
}
 
function iniciarCarrosselAutomatico() {
    carrosselInterval = setInterval(() => {
        comentarioAtual = (comentarioAtual + 1) % (comentariosCarrossel.length - 3);
        atualizarCarrossel();
    }, 5000); // Muda a cada 5 segundos
}
 
function iniciarArrasteCarrossel() {
    const slider = document.getElementById('comentarioSlider');
    let startX;
    let isDragging = false;
 
    slider.addEventListener('mousedown', startDragging);
    slider.addEventListener('touchstart', startDragging);
 
    slider.addEventListener('mousemove', drag);
    slider.addEventListener('touchmove', drag);
 
    slider.addEventListener('mouseup', stopDragging);
    slider.addEventListener('mouseleave', stopDragging);
    slider.addEventListener('touchend', stopDragging);
 
    function startDragging(e) {
        isDragging = true;
        startX = e.type.includes('mouse') ? e.pageX : e.touches[0].pageX;
        clearInterval(carrosselInterval);
    }
 
    function drag(e) {
        if (!isDragging) return;
        e.preventDefault();
        const currentX = e.type.includes('mouse') ? e.pageX : e.touches[0].pageX;
        const diff = startX - currentX;
        const threshold = slider.offsetWidth / 4; // 25% do width total
 
        if (Math.abs(diff) > threshold) {
            if (diff > 0 && comentarioAtual < comentariosCarrossel.length - 4) {
                comentarioAtual++;
            } else if (diff < 0 && comentarioAtual > 0) {
                comentarioAtual--;
            }
            atualizarCarrossel();
            isDragging = false;
        }
    }
 
    function stopDragging() {
        isDragging = false;
        iniciarCarrosselAutomatico();
    }
}
 
function agendarServico(serviceId, serviceName) {
    selectedServiceId = serviceId;
    selectedCnpj = getCnpjFromUrl(); // Obter o CNPJ da URL
    const modal = document.getElementById('agendamentoModal');
    const servicoNome = document.getElementById('servicoNome');
    servicoNome.textContent = `Serviço: ${serviceName}`;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    modal.dataset.serviceId = serviceId;
 
    // Buscar o CNPJ na coleção "schedules"
    db.collection("schedules").where("cnpj", "==", selectedCnpj).get().then((querySnapshot) => {
        if (querySnapshot.empty) {
            document.getElementById('diasDisponiveis').innerHTML = '<p class="text-yellow-400">Nenhum agendamento encontrado para este CNPJ.</p>';
            document.getElementById('horariosDisponiveis').innerHTML = '';
        } else {
            const scheduleData = querySnapshot.docs[0].data();
            const days = scheduleData.days || [];
           
            let daysHtml = '<h3 class="text-xl font-bold mb-2 text-orange-custom"><i class="far fa-calendar-alt mr-2"></i>Dias Disponíveis:</h3>';
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);
 
            days.forEach(day => {
                if (day.selected) {
                    const proximaData = getProximaData(day.name);
                    if (proximaData >= hoje) {
                        const dataFormatada = formatarData(proximaData);
                        daysHtml += `<button onclick="mostrarHorarios('${day.name}', '${day.startTime}', '${day.endTime}', '${dataFormatada}')" class="bg-orange-custom hover:bg-orange-600 text-white font-bold py-2 px-4 rounded mr-2 mb-2 transition duration-300 hover:shadow-lg">${day.label} - ${dataFormatada}</button>`;
                    }
                }
            });
 
            document.getElementById('diasDisponiveis').innerHTML = daysHtml;
            document.getElementById('horariosDisponiveis').innerHTML = '';
        }
    }).catch((error) => {
        console.error("Erro ao buscar agendamentos: ", error);
        document.getElementById('diasDisponiveis').innerHTML = '<p class="text-red-400">Erro ao buscar agendamentos.</p>';
        document.getElementById('horariosDisponiveis').innerHTML = '';
    });
}
 
function getProximaData(diaDaSemana) {
    const diasDaSemana = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const hoje = new Date();
    const indiceAtual = hoje.getDay();
    const indiceAlvo = diasDaSemana.indexOf(diaDaSemana.toLowerCase());
    const diasParaAdicionar = (indiceAlvo + 7 - indiceAtual) % 7;
    const proximaData = new Date(hoje);
    proximaData.setDate(hoje.getDate() + diasParaAdicionar);
    return proximaData;
}
 
function formatarData(data) {
    return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
 
function mostrarHorarios(day, startTime, endTime, dataFormatada) {
    selectedDay = day;
    currentStartTime = startTime;
    currentEndTime = endTime;
    const horariosDisponiveis = document.getElementById('horariosDisponiveis');
    horariosDisponiveis.innerHTML = `<h3 class="text-xl font-bold mb-2 text-orange-custom"><i class="far fa-clock mr-2"></i>Horários Disponíveis para ${dataFormatada}:</h3>`;
 
    const horarios = gerarHorarios(startTime, endTime);
    const agora = new Date();
    const hoje = agora.toLocaleDateString('pt-BR', { weekday: 'long' }).toLowerCase();
    const diaAtual = agora.getDate();
    const mesAtual = agora.getMonth();
    const anoAtual = agora.getFullYear();
 
    // Função para obter a data do próximo dia da semana
    function getProximaData(diaDaSemana) {
        const diasDaSemana = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const hoje = new Date();
        const indiceAtual = hoje.getDay();
        const indiceAlvo = diasDaSemana.indexOf(diaDaSemana.toLowerCase());
        const diasParaAdicionar = (indiceAlvo + 7 - indiceAtual) % 7;
        const proximaData = new Date(hoje);
        proximaData.setDate(hoje.getDate() + diasParaAdicionar);
        return proximaData;
    }
    // Buscar todos os agendamentos para o dia e serviço selecionados
    db.collection("appointments")
        .where("day", "==", selectedDay)
        .where("serviceId", "==", selectedServiceId)
        .get()
        .then((querySnapshot) => {
            const agendamentosExistentes = new Set();
            querySnapshot.forEach((doc) => {
                const appointments = doc.data().appointments;
                if (Array.isArray(appointments)) {
                    appointments.forEach(appointment => {
                        if (appointment.time) {
                            agendamentosExistentes.add(appointment.time);
                        }
                    });
                }
            });
 
            const diaSelecionadoTraduzido = traduzirDiaParaPortugues(day).toLowerCase();
            const dataSelecionada = getProximaData(diaSelecionadoTraduzido);
 
            horarios.forEach(horario => {
                const button = document.createElement('button');
                button.textContent = horario;
               
                const [hora, minuto] = horario.split(':');
                const horarioData = new Date(dataSelecionada.getFullYear(), dataSelecionada.getMonth(), dataSelecionada.getDate(), parseInt(hora), parseInt(minuto));
               
                if (horarioData < agora) {
                    button.disabled = true;
                    button.classList.add('bg-gray-600', 'cursor-not-allowed');
                } else if (agendamentosExistentes.has(horario)) {
                    button.disabled = true;
                    button.classList.add('bg-red-600', 'cursor-not-allowed');
                } else {
                    button.classList.add('bg-orange-custom', 'hover:bg-orange-600');
                    button.onclick = () => selecionarHorario(button, horario);
                }
 
                horariosDisponiveis.appendChild(button);
            });
        })
        .catch((error) => {
            console.error("Erro ao buscar agendamentos:", error);
            horariosDisponiveis.innerHTML = '<p class="text-red-400">Erro ao buscar agendamentos.</p>';
        });
}
 
function traduzirDiaParaPortugues(dia) {
    const diasDaSemana = {
        'Sunday': 'domingo',
        'Monday': 'segunda-feira',
        'Tuesday': 'terça-feira',
        'Wednesday': 'quarta-feira',
        'Thursday': 'quinta-feira',
        'Friday': 'sexta-feira',
        'Saturday': 'sábado'
    };
    return diasDaSemana[dia] || dia;
}
 
// Função para mostrar os funcionários
function mostrarFuncionarios() {
    const workersContainer = document.getElementById('workersDisponiveis');
    workersContainer.innerHTML = ''; // Limpa o container antes de adicionar novos funcionários
 
    // Buscar os funcionários disponíveis associados ao CNPJ atual
    db.collection("workers").where("cnpj", "==", selectedCnpj).get().then((workerSnapshot) => {
        if (workerSnapshot.empty) {
            workersContainer.innerHTML = '<p class="text-yellow-400">Nenhum funcionário encontrado para este estabelecimento.</p>';
            return;
        }
 
        workersContainer.innerHTML = '<h3 class="text-xl font-bold mb-2 text-orange-custom"><i class="fas fa-user-tie mr-2"></i>Funcionários Disponíveis:</h3>';
        const workerButtons = document.createElement('div');
        workerButtons.className = 'flex flex-wrap'; // Para exibir em linha horizontal
 
        workerSnapshot.forEach((doc) => {
            const workerData = doc.data();
            const workerButton = document.createElement('button');
            workerButton.className = 'flex items-center bg-dark-surface text-white font-bold py-2 px-4 rounded mb-2 mr-2 transition duration-300 hover:shadow-lg';
            workerButton.onclick = () => selecionarFuncionario(workerData.id);
            workerButton.setAttribute('data-worker-id', workerData.id); // Adiciona o ID do trabalhador
           
            // Adiciona a imagem do funcionário
            workerButton.innerHTML = `
                <img src="${workerData.imageUrl || ''}" alt="${workerData.name}" class="w-10 h-10 rounded-full mr-2">
                ${workerData.name}
            `;
           
            workerButtons.appendChild(workerButton);
        });
 
        workersContainer.appendChild(workerButtons);
    }).catch((error) => {
        console.error("Erro ao buscar funcionários:", error);
        workersContainer.innerHTML = '<p class="text-red-500">Erro ao carregar funcionários. Por favor, tente novamente.</p>';
    });
}
 
function gerarHorarios(startTime, endTime) {
    const horarios = [];
    let currentTime = new Date(`2000-01-01T${startTime}`);
    const endDateTime = new Date(`2000-01-01T${endTime}`);
 
    while (currentTime < endDateTime) {
        horarios.push(currentTime.toTimeString().slice(0, 5));
        currentTime.setMinutes(currentTime.getMinutes() + 30);
    }
 
    return horarios;
}
 
function selecionarHorario(button, horario) {
    selectedTime = horario; // Armazena o horário selecionado
    // Remover a seleção de todos os botões de horário
    const timeButtons = document.querySelectorAll('#horariosDisponiveis button');
    timeButtons.forEach(btn => {
        btn.classList.remove('bg-green-700'); // Remove a classe de destaque
        btn.classList.add('bg-orange-custom'); // Restaura a cor original
    });
    // Destacar o horário selecionado
    button.classList.remove('bg-orange-custom', 'hover:bg-orange-600');
    button.classList.add('bg-green-700'); // Adiciona a classe de destaque
}
 
// Função para selecionar um funcionário
function selecionarFuncionario(workerId) {
    selectedWorkerId = workerId; // Armazena o ID do funcionário selecionado
    // Atualizar a interface para mostrar o funcionário selecionado
    console.log("Funcionário selecionado:", selectedWorkerId);
 
    // Remover a seleção de todos os botões de funcionário
    const workerButtons = document.querySelectorAll('#workersDisponiveis button');
    workerButtons.forEach(btn => {
        btn.classList.remove('bg-green-700'); // Remove a classe de destaque
    });
 
    // Destacar o botão do funcionário selecionado
    const selectedButton = document.querySelector(`#workersDisponiveis button[data-worker-id="${workerId}"]`);
    if (selectedButton) {
        selectedButton.classList.add('bg-green-700'); // Adiciona a classe de destaque
    }
 
    // Habilitar o botão de confirmação se um funcionário for selecionado
    document.getElementById('confirmButton').disabled = false; // Habilita o botão de confirmação
}
 
function desmarcarSelecoes() {
    // Desmarcar horário
    selectedTime = null;
    const timeButtons = document.querySelectorAll('#horariosDisponiveis button');
    timeButtons.forEach(btn => {
        btn.classList.remove('bg-green-700'); // Remove a classe de destaque
        btn.classList.add('bg-orange-custom'); // Restaura a cor original
    });
 
    // Desmarcar funcionário
    selectedWorkerId = null;
    const workerButtons = document.querySelectorAll('#workersDisponiveis button');
    workerButtons.forEach(btn => {
        btn.classList.remove('bg-green-700'); // Remove a classe de destaque
    });
}
 
function confirmarAgendamento() {
    console.log("Função confirmarAgendamento iniciada");
    if (!currentUser) {
        console.error("Erro: Usuário não está logado");
        alert("Por favor, faça login para confirmar o agendamento.");
        redirecionarParaLogin();
        return;
    }
 
    selectedCnpj = getCnpjFromUrl(); // Obter o CNPJ da URL
 
    console.log("Dados do agendamento:", {
        selectedCnpj,
        selectedServiceId,
        selectedDay,
        selectedTime,
        selectedWorkerId
    });
 
    if (!selectedCnpj || !selectedServiceId || !selectedDay || !selectedTime || !selectedWorkerId) {
        console.error("Erro: Dados de agendamento incompletos");
        alert("Por favor, preencha todos os dados necessários para o agendamento.");
        return;
    }
 
    let establishmentName = '';
    let workerName = '';
    let serviceData = null;
    let userName = currentUser.displayName || 'Usuário Anônimo';
    let userPhotoURL = currentUser.photoURL || '';
 
    // Calcular a data exata do agendamento
    const dataExata = calcularDataExata(selectedDay);
    const dataHoraExata = `${dataExata} ${selectedTime}`;
 
    console.log("Verificando disponibilidade do horário...");
   
    db.collection("appointments")
        .doc(currentUser.uid)
        .get()
        .then((doc) => {
            const appointments = doc.exists ? doc.data().appointments || [] : [];
            const isTimeBooked = appointments.some(appointment =>
                appointment.cnpj === selectedCnpj &&
                appointment.day === selectedDay &&
                appointment.time === selectedTime &&
                appointment.workerId === selectedWorkerId
            );
 
            if (isTimeBooked) {
                console.warn("Aviso: Horário já agendado");
                alert("Este horário já foi agendado para o funcionário selecionado. Por favor, escolha outro horário.");
                desmarcarSelecoes();
                mostrarHorarios(selectedDay, currentStartTime, currentEndTime);
                return Promise.reject("Horário já agendado");
            }
 
            console.log("Buscando informações do estabelecimento e serviço...");
            return db.collection("users").where("cnpj", "==", selectedCnpj).get();
        })
        .then((userQuerySnapshot) => {
            if (userQuerySnapshot.empty) {
                throw new Error("Estabelecimento não encontrado");
            }
            const userDoc = userQuerySnapshot.docs[0];
            establishmentName = userDoc.data().establishmentName || '';
            console.log("Nome do estabelecimento:", establishmentName);
 
            return userDoc.ref.collection("services").doc(selectedServiceId).get();
        })
        .then((serviceDoc) => {
            if (!serviceDoc.exists) {
                throw new Error("Serviço não encontrado");
            }
            serviceData = serviceDoc.data();
            if (!serviceData || !serviceData.name || !serviceData.price) {
                throw new Error("Dados do serviço incompletos");
            }
 
            console.log("Buscando informações do funcionário...");
            return db.collection("workers").where("id", "==", selectedWorkerId).where("cnpj", "==", selectedCnpj).get();
        })
        .then((workerQuerySnapshot) => {
            if (workerQuerySnapshot.empty) {
                throw new Error("Funcionário não encontrado");
            }
            const workerDoc = workerQuerySnapshot.docs[0];
            workerName = workerDoc.data().name || 'Nome não disponível';
            console.log("Nome do funcionário:", workerName);
 
            const appointmentId = `${currentUser.uid}_${Date.now()}`;
 
            const newAppointment = {
                id: appointmentId,
                cnpj: selectedCnpj,
                establishmentName: establishmentName,
                serviceName: serviceData.name,
                workerId: selectedWorkerId,
                workerName: workerName,
                day: selectedDay,
                time: selectedTime,
                dataHoraExata: dataHoraExata, // Adicionando a data e hora exatas
                price: serviceData.price,
                createdAt: new Date().toISOString(),
                realizado: false,
                userId: currentUser.uid,
                userName: userName,
                userPhotoURL: userPhotoURL
            };
 
            console.log("Novo agendamento a ser salvo:", newAppointment);
 
            console.log("Salvando novo agendamento...");
            return db.collection("appointments").doc(currentUser.uid).set({
                appointments: firebase.firestore.FieldValue.arrayUnion(newAppointment)
            }, { merge: true });
        })
        .then(() => {
            console.log("Agendamento salvo com sucesso.");
            const diaTraduzido = traduzirDiaParaPortugues(selectedDay);
            alert(`Agendamento confirmado para ${diaTraduzido}, ${dataHoraExata} com ${workerName}`);
            fecharModal();
            mostrarHorarios(selectedDay, currentStartTime, currentEndTime);
        })
        .catch((error) => {
            console.error("Erro durante o processo de agendamento:", error);
            if (error === "Horário já agendado") {
                console.log("Processo interrompido devido a horário já agendado");
            } else {
                console.error("Stack trace do erro:", error.stack);
                alert(`Ocorreu um erro durante o agendamento: ${error.message}`);
            }
        });
}
 
// Função auxiliar para calcular a data exata
function calcularDataExata(selectedDay) {
    const diasDaSemana = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const hoje = new Date();
    const indiceAtual = hoje.getDay();
    const indiceAlvo = diasDaSemana.indexOf(selectedDay.toLowerCase());
    const diasParaAdicionar = (indiceAlvo + 7 - indiceAtual) % 7;
    const dataAgendamento = new Date(hoje);
    dataAgendamento.setDate(hoje.getDate() + diasParaAdicionar);
    return dataAgendamento.toLocaleDateString('pt-BR');
}
 
function fecharModal() {
    const modal = document.getElementById('agendamentoModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}
 
// Função para redirecionar para a página de login
function redirecionarParaLogin() {
    if (!isRedirecting) {
        isRedirecting = true;
        const currentPage = window.location.pathname + window.location.search;
        sessionStorage.setItem('returnUrl', currentPage);
        console.log("Redirecionando para login. returnUrl:", currentPage);
        window.location.href = "../page/LoginTimeWise.html";
    }
}
 
// Adicione estas funções no início do arquivo pre.js
 
function toggleDropdown() {
    const dropdownMenu = document.getElementById('dropdownMenu');
    dropdownMenu.classList.toggle('hidden');
}
 
function closeDropdown(event) {
    const dropdownMenu = document.getElementById('dropdownMenu');
    const menuButton = document.getElementById('menuButton');
    if (!menuButton.contains(event.target) && !dropdownMenu.contains(event.target)) {
        dropdownMenu.classList.add('hidden');
    }
}
 
// Modifique a função showUserProfile para incluir o evento de clique no botão do menu
function showUserProfile(user) {
    const userProfile = document.getElementById('userProfile');
    const userName = document.getElementById('userName');
    userProfile.classList.remove('hidden');
    userName.textContent = user.displayName || user.email;
 
    const menuButton = document.getElementById('menuButton');
    menuButton.addEventListener('click', toggleDropdown);
 
    document.addEventListener('click', closeDropdown);
}
 
// Modifique a função hideUserProfile para remover os event listeners
function hideUserProfile() {
    const userProfile = document.getElementById('userProfile');
    userProfile.classList.add('hidden');
 
    const menuButton = document.getElementById('menuButton');
    menuButton.removeEventListener('click', toggleDropdown);
 
    document.removeEventListener('click', closeDropdown);
}
 
// Adicione este código no final do arquivo pre.js
document.getElementById('logoutButton').addEventListener('click', () => {
    firebase.auth().signOut().then(() => {
        console.log('Usuário deslogado');
        hideUserProfile();
        redirecionarParaLogin();
    }).catch((error) => {
        console.error('Erro ao fazer logout:', error);
    });
});
 
// Chamar a função para verificar o estado de autenticação quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOMContentLoaded em pre.js");
    firebase.auth().onAuthStateChanged((user) => {
        console.log("Estado de autenticação mudou. Usuário:", user ? user.uid : "não autenticado");
        if (user) {
            currentUser = user;
            showUserProfile(user);
        } else {
            currentUser = null;
            hideUserProfile();
            redirecionarParaLogin();
        }
    });
});
 
