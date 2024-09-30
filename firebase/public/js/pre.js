// Variáveis globais
let currentUser = null;
let selectedDay = '';
let selectedTime = null;
let selectedServiceId = '';
let selectedCnpj = '';
let currentStartTime = '';
let currentEndTime = '';
let selectedWorkerId = null;
let isRedirecting = false;

// Função para buscar dados pelo CNPJ da URL
let fetchDataExecuted = false;

function fetchDataByCNPJ() {
    if (fetchDataExecuted) {
        console.log("fetchDataByCNPJ já foi executado. Ignorando chamada repetida.");
        return;
    }
    fetchDataExecuted = true;

    const urlParams = new URLSearchParams(window.location.search);
    const cnpj = urlParams.get('cnpj');
    const statusElement = document.getElementById('firebaseStatus');
    const dataList = document.getElementById('dataList');
    
    dataList.innerHTML = '';
    statusElement.textContent = '';
    statusElement.className = '';

    if (!cnpj) {
        statusElement.textContent = "CNPJ não fornecido na URL.";
        statusElement.classList.add('text-red-600');
        return;
    }

    console.log("Buscando dados para o CNPJ:", cnpj);

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
        const personalizacao = userData.personalizacao || {};
        const address = userData.address || 'Endereço não disponível'; // Buscar o endereço

        dataList.innerHTML = `
            <div class="text-center mb-8">
                ${logoUrl ? `<img id="estabelecimentoLogo" src="${logoUrl}" alt="Logo do Estabelecimento" class="mx-auto mb-6 w-48 h-48 object-cover rounded-full border-4 border-orange-custom shadow-lg">` : ''}
                <h2 class="text-5xl font-extrabold" style="color: var(--cor-texto);">${establishmentName}</h2>
            </div>
            <div class="bg-container-custom p-6 rounded-lg shadow-lg mb-8">
                <p class="mb-2"><strong style="color: var(--cor-texto);"><i class="fas fa-id-card mr-2"></i>CNPJ:</strong> <span style="color: var(--cor-texto);">${cnpj}</span></p>
                <p class="mb-2"><strong style="color: var(--cor-texto);"><i class="fas fa-envelope mr-2"></i>Email:</strong> <span style="color: var(--cor-texto);">${userEmail}</span></p>
                <p class="mb-2"><strong style="color: var(--cor-texto);"><i class="fas fa-phone mr-2"></i>Telefone:</strong> <span style="color: var(--cor-texto);">${userPhone}</span></p>
                <p><strong style="color: var(--cor-texto);"><i class="fas fa-map-marker-alt mr-2"></i>Endereço:</strong> <span style="color: var(--cor-texto);">${address}</span></p>
            </div>
        `;

        // Adicionar o slider se estiver ativado
        if (personalizacao.sliderAtivado && personalizacao.imagensSlider && personalizacao.imagensSlider.length > 0) {
            const sliderContainer = document.createElement('div');
            sliderContainer.className = 'slider-container';
            sliderContainer.innerHTML = `
                <div class="slider">
                    ${personalizacao.imagensSlider.map(img => `<img src="${img}" alt="Imagem do slider">`).join('')}
                </div>
                <button class="slider-prev">&#10094;</button>
                <button class="slider-next">&#10095;</button>
            `;

            const logoContainer = document.querySelector('.text-center.mb-8');
            if (personalizacao.posicaoSlider === 'acima') {
                logoContainer.parentNode.insertBefore(sliderContainer, logoContainer);
            } else {
                logoContainer.parentNode.insertBefore(sliderContainer, logoContainer.nextSibling);
            }

            initializeSlider();
        }

        // Buscar serviços
        db.collection("users").doc(userUid).collection("services").get().then((querySnapshot) => {
            if (querySnapshot.empty) {
                statusElement.textContent = "Nenhum serviço encontrado para este CNPJ.";
                statusElement.classList.add('text-red-600');
                return;
            }

            const servicesContainer = document.createElement('div');
            
            if (personalizacao.exibicaoServicos === 'carrossel') {
                servicesContainer.className = 'services-carousel';
                servicesContainer.innerHTML = `
                    <div class="carousel-container">
                        <div class="carousel-wrapper">
                            <div class="carousel-content"></div>
                        </div>
                        <button class="carousel-prev">&#10094;</button>
                        <button class="carousel-next">&#10095;</button>
                    </div>
                `;
                const carouselContent = servicesContainer.querySelector('.carousel-content');
                
                querySnapshot.forEach((doc) => {
                    const serviceData = doc.data();
                    const serviceCard = createServiceCard(doc.id, serviceData);
                    carouselContent.appendChild(serviceCard);
                });

                dataList.appendChild(servicesContainer);
                initializeCarousel();
            } else {
                servicesContainer.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';
                
                querySnapshot.forEach((doc) => {
                    const serviceData = doc.data();
                    const serviceCard = createServiceCard(doc.id, serviceData);
                    servicesContainer.appendChild(serviceCard);
                });

                dataList.appendChild(servicesContainer);
            }

            const comentariosContainer = document.createElement('div');
            comentariosContainer.id = 'comentariosContainer';
            comentariosContainer.className = 'bg-container-custom p-6 rounded-lg shadow-lg mb-8 mt-16';
            comentariosContainer.innerHTML = `
                <h3 class="text-2xl font-bold mb-4" style="color: var(--cor-texto);"><i class="fas fa-comments mr-2"></i>Comentários dos Clientes</h3>
                <div id="comentariosList" class="space-y-4"></div>
            `;
            dataList.appendChild(comentariosContainer);

            buscarComentarios(cnpj);

        }).catch((error) => {
            console.error("Erro ao buscar serviços:", error);
            statusElement.textContent = "Erro ao buscar serviços.";
            statusElement.classList.add('text-red-600');
        });

        carregarPopups(cnpj);

    }).catch((error) => {
        console.error("Erro ao buscar dados do estabelecimento:", error);
        statusElement.textContent = "Erro ao buscar dados do estabelecimento.";
        statusElement.classList.add('text-red-600');
    });
}

let comentariosCarrossel = [];
let comentarioAtual = 0;
let carrosselInterval;

function buscarComentarios(cnpj) {
    const comentariosList = document.getElementById('comentariosList');
    comentariosList.innerHTML = '<p style="color: var(--cor-texto);">Carregando comentários...</p>';

    comentariosCarrossel = [];

    db.collection("appointments").get().then((querySnapshot) => {
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

        if (comentariosCarrossel.length > 0) {
            comentariosList.innerHTML = `
                <div id="comentarioCarrossel" class="relative overflow-hidden w-full">
                    <div id="comentarioSlider" class="flex flex-wrap">
                        ${comentariosCarrossel.map((comentario, index) => `
                            <div class="comentario-item flex-shrink-0 px-2 mb-4">
                                <div class="bg-container-custom p-4 rounded-lg h-full overflow-y-auto">
                                    <div class="flex items-center mb-2">
                                        <img src="${comentario.userPhotoURL || 'https://via.placeholder.com/40'}" alt="Foto do usuário" class="w-8 h-8 rounded-full mr-2">
                                        <div>
                                            <p class="font-bold text-sm" style="color: var(--cor-texto);">${comentario.userName || 'Usuário Anônimo'}</p>
                                            <p class="text-xs" style="color: var(--cor-texto);">${comentario.data}</p>
                                        </div>
                                    </div>
                                    <p class="text-sm" style="color: var(--cor-texto);">${comentario.texto}</p>
                                    <p class="text-xs mt-2" style="color: var(--cor-texto);"><strong>Funcionário:</strong> ${comentario.workerName}</p>
                                    <p class="text-xs" style="color: var(--cor-texto);"><strong>Serviço:</strong> ${comentario.serviceName}</p>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;

            // Remover a funcionalidade de carrossel automático para dispositivos móveis
            if (window.innerWidth <= 768) {
                clearInterval(carrosselInterval);
            } else {
                iniciarCarrosselAutomatico();
            }
        } else {
            comentariosList.innerHTML = '<p class="text-sm" style="color: var(--cor-texto);">Nenhum comentário encontrado.</p>';
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
    }, 5000);
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
        const threshold = slider.offsetWidth / 4;

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
    const urlParams = new URLSearchParams(window.location.search);
    selectedCnpj = urlParams.get('cnpj');
    const modal = document.getElementById('agendamentoModal');
    const servicoNome = document.getElementById('servicoNome');
    servicoNome.textContent = `Serviço: ${serviceName}`;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    modal.dataset.serviceId = serviceId;

    db.collection("schedules").where("cnpj", "==", selectedCnpj).get().then((querySnapshot) => {
        if (querySnapshot.empty) {
            document.getElementById('diasDisponiveis').innerHTML = '<p style="color: var(--cor-texto);">Nenhum agendamento encontrado para este CNPJ.</p>';
            document.getElementById('horariosDisponiveis').innerHTML = '';
        } else {
            const scheduleData = querySnapshot.docs[0].data();
            const days = scheduleData.days || [];
            
            let daysHtml = '<h3 class="text-xl font-bold mb-2" style="color: var(--cor-texto);"><i class="far fa-calendar-alt mr-2"></i>Dias Disponíveis:</h3>';
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);

            days.forEach(day => {
                if (day.selected) {
                    const proximaData = getProximaData(day.name);
                    if (proximaData >= hoje) {
                        const dataFormatada = formatarData(proximaData);
                        daysHtml += `<button onclick="selecionarData(this, '${day.name}', '${day.startTime}', '${day.endTime}', '${dataFormatada}')" class="btn-custom hover:bg-orange-600 text-white font-bold py-2 px-4 rounded mr-2 mb-2 transition duration-300 hover:shadow-lg">${day.label} - ${dataFormatada}</button>`;
                    }
                }
            });

            document.getElementById('diasDisponiveis').innerHTML = daysHtml;
            document.getElementById('horariosDisponiveis').innerHTML = '';
        }
    }).catch((error) => {
        console.error("Erro ao buscar agendamentos: ", error);
        document.getElementById('diasDisponiveis').innerHTML = '<p style="color: var(--cor-erro);">Erro ao buscar agendamentos.</p>';
        document.getElementById('horariosDisponiveis').innerHTML = '';
    });
}

function selecionarData(button, day, startTime, endTime, dataFormatada) {
    // Remover a seleção de todos os botões de data
    const dateButtons = document.querySelectorAll('#diasDisponiveis button');
    dateButtons.forEach(btn => {
        btn.classList.remove('bg-green-700');
        btn.classList.add('btn-custom', 'hover:bg-orange-600');
    });

    // Destacar o botão selecionado
    button.classList.remove('btn-custom', 'hover:bg-orange-600');
    button.classList.add('bg-green-700');

    // Chamar a função para mostrar os horários
    mostrarHorarios(day, startTime, endTime, dataFormatada);
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
    const horariosContainer = document.createElement('div');
    horariosContainer.className = 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2';

    const horarios = gerarHorarios(startTime, endTime);
    const agora = new Date();
    const hoje = agora.toLocaleDateString('pt-BR', { weekday: 'long' }).toLowerCase();
    const diaAtual = agora.getDate();
    const mesAtual = agora.getMonth();
    const anoAtual = agora.getFullYear();

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
                
                const isHorarioPastado = horarioData < agora;
                const isHorarioAgendado = agendamentosExistentes.has(horario);

                if (isHorarioPastado || isHorarioAgendado) {
                    button.className = 'bg-red-500 text-white font-bold py-2 px-4 rounded mr-2 mb-2 opacity-50 cursor-not-allowed';
                    button.disabled = true;
                    button.title = isHorarioPastado ? 'Horário já passou' : 'Horário já agendado';
                } else {
                    button.className = 'btn-custom hover:bg-orange-600 text-white font-bold py-2 px-4 rounded mr-2 mb-2 transition duration-300 hover:shadow-lg';
                    button.onclick = () => {
                        selecionarHorario(button, horario);
                        mostrarFuncionarios();
                    };
                }
                
                horariosContainer.appendChild(button);
            });

            if (horariosContainer.children.length === 0) {
                horariosContainer.innerHTML += '<p style="color: var(--cor-texto);">Nenhum horário disponível para este dia.</p>';
            }

            horariosDisponiveis.appendChild(horariosContainer);
        })
        .catch((error) => {
            console.error("Erro ao buscar agendamentos existentes: ", error);
            horariosDisponiveis.innerHTML += '<p style="color: var(--cor-erro);">Erro ao carregar horários. Por favor, tente novamente.</p>';
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

function mostrarFuncionarios() {
    const workersContainer = document.getElementById('workersDisponiveis');
    workersContainer.innerHTML = '<h3 class="text-xl font-bold mb-2 text-orange-custom"><i class="fas fa-user-tie mr-2"></i>Funcionários Disponíveis:</h3>';
    const workerButtons = document.createElement('div');
    workerButtons.className = 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2';

    db.collection("workers").where("cnpj", "==", selectedCnpj).get().then((workerSnapshot) => {
        if (workerSnapshot.empty) {
            workersContainer.innerHTML = '<p style="color: var(--cor-texto);">Nenhum funcionário encontrado para este estabelecimento.</p>';
            return;
        }

        workerSnapshot.forEach((doc) => {
            const workerData = doc.data();
            const workerButton = document.createElement('button');
            workerButton.className = 'flex items-center bg-dark-surface text-white font-bold py-2 px-4 rounded mb-2 mr-2 transition duration-300 hover:shadow-lg btn-custom';
            workerButton.onclick = () => selecionarFuncionario(workerButton, workerData.id);
            workerButton.setAttribute('data-worker-id', workerData.id);
            
            workerButton.innerHTML = `
                <img src="${workerData.imageUrl || ''}" alt="${workerData.name}" class="w-10 h-10 rounded-full mr-2">
                <span style="color: var(--cor-texto);">${workerData.name}</span>
            `;
            
            workerButtons.appendChild(workerButton);
        });

        workersContainer.appendChild(workerButtons);
    }).catch((error) => {
        console.error("Erro ao buscar funcionários:", error);
        workersContainer.innerHTML = '<p style="color: var(--cor-erro);">Erro ao carregar funcionários. Por favor, tente novamente.</p>';
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
    selectedTime = horario;
    const timeButtons = document.querySelectorAll('#horariosDisponiveis button');
    timeButtons.forEach(btn => {
        btn.classList.remove('bg-green-700');
        btn.classList.add('btn-custom', 'hover:bg-orange-600');
    });
    button.classList.remove('btn-custom', 'hover:bg-orange-600');
    button.classList.add('bg-green-700');
}

function selecionarFuncionario(button, workerId) {
    selectedWorkerId = workerId;
    console.log("Funcionário selecionado:", selectedWorkerId);

    const workerButtons = document.querySelectorAll('#workersDisponiveis button');
    workerButtons.forEach(btn => {
        btn.classList.remove('bg-green-700');
        btn.classList.add('btn-custom');
    });

    button.classList.remove('btn-custom');
    button.classList.add('bg-green-700');

    document.getElementById('confirmButton').disabled = false;
}

function desmarcarSelecoes() {
    selectedTime = null;
    const timeButtons = document.querySelectorAll('#horariosDisponiveis button');
    timeButtons.forEach(btn => {
        btn.classList.remove('bg-green-700');
        btn.classList.add('btn-custom');
    });

    selectedWorkerId = null;
    const workerButtons = document.querySelectorAll('#workersDisponiveis button');
    workerButtons.forEach(btn => {
        btn.classList.remove('bg-green-700');
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
                dataHoraExata: dataHoraExata,
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

function redirecionarParaLogin() {
    if (!isRedirecting) {
        isRedirecting = true;
        const currentPage = window.location.pathname + window.location.search;
        sessionStorage.setItem('returnUrl', currentPage);
        console.log("Redirecionando para login. returnUrl:", currentPage);
        window.location.href = "../page/LoginTimeWise.html";
    }
}

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

function showUserProfile(user) {
    const userProfile = document.getElementById('userProfile');
    const userName = document.getElementById('userName');
    userProfile.classList.remove('hidden');
    userName.textContent = user.displayName || user.email;

    const menuButton = document.getElementById('menuButton');
    menuButton.addEventListener('click', toggleDropdown);

    document.addEventListener('click', closeDropdown);
}

function hideUserProfile() {
    const userProfile = document.getElementById('userProfile');
    userProfile.classList.add('hidden');

    const menuButton = document.getElementById('menuButton');
    menuButton.removeEventListener('click', toggleDropdown);

    document.removeEventListener('click', closeDropdown);
}

document.getElementById('logoutButton').addEventListener('click', () => {
    firebase.auth().signOut().then(() => {
        console.log('Usuário deslogado');
        hideUserProfile();
        redirecionarParaLogin();
    }).catch((error) => {
        console.error('Erro ao fazer logout:', error);
    });
});

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

function chamarFetchDataByCNPJ() {
    console.log("Chamando fetchDataByCNPJ após personalizações");
    fetchDataByCNPJ();
}

function carregarPopups(cnpj) {
    console.log("Carregando pop-up para o CNPJ:", cnpj);
    db.collection("users").where("cnpj", "==", cnpj).get().then((querySnapshot) => {
        if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            const userData = userDoc.data();
            if (userData && userData.popups && Array.isArray(userData.popups) && userData.popups.length > 0) {
                const popupData = userData.popups[0]; // Pega apenas o primeiro pop-up
                if (popupData) {
                    console.log("Pop-up encontrado:", popupData);
                    exibirPopup(popupData);
                } else {
                    console.log("O pop-up é inválido");
                }
            } else {
                console.log("Nenhum pop-up encontrado para este CNPJ");
            }
        } else {
            console.log("Nenhum usuário encontrado com este CNPJ");
        }
    }).catch((error) => {
        console.error("Erro ao carregar pop-up:", error);
    });
}

function exibirPopup(popupData) {
    console.log("Exibindo pop-up:", popupData);
    const popupContainer = document.getElementById('popupContainer');
    
    // Remover qualquer pop-up existente
    while (popupContainer.firstChild) {
        popupContainer.removeChild(popupContainer.firstChild);
    }

    const popupElement = document.createElement('div');
    popupElement.className = 'popup';
    popupElement.id = 'popup-' + Date.now();

    // ... (resto do código para criar o conteúdo do pop-up) ...

    // Criar o botão de fechar personalizado
    const closeButton = document.createElement('button');
    closeButton.className = 'popup-close-btn';
    closeButton.innerHTML = '&times;'; // Símbolo "X"

    // Aplicar estilos personalizados
    if (popupData.botaoFechar) {
        if (popupData.botaoFechar.corFundo) {
            closeButton.style.setProperty('--cor-botao-fechar', popupData.botaoFechar.corFundo);
        }
        if (popupData.botaoFechar.corTexto) {
            closeButton.style.setProperty('--cor-texto-botao-fechar', popupData.botaoFechar.corTexto);
        }
        if (popupData.botaoFechar.tamanho) {
            closeButton.style.setProperty('--tamanho-fonte-botao-fechar', popupData.botaoFechar.tamanho);
        }
        if (popupData.botaoFechar.corHover) {
            closeButton.style.setProperty('--cor-botao-fechar-hover', popupData.botaoFechar.corHover);
        }
    }

    closeButton.addEventListener('click', () => fecharPopup(popupElement));

    popupElement.appendChild(closeButton);
    popupContainer.appendChild(popupElement);
    console.log("Pop-up criado com ID:", popupElement.id);
}

function createServiceCard(docId, serviceData) {
    const serviceCard = document.createElement('div');
    serviceCard.className = 'bg-container-custom p-4 rounded-lg shadow-lg hover-grow fade-in mb-4';
    serviceCard.innerHTML = `
        <h3 class="text-lg font-bold mb-2" style="color: var(--cor-texto);"><i class="fas fa-cut mr-2"></i>${serviceData.name || 'N/A'}</h3>
        <p class="text-sm mb-2" style="color: var(--cor-texto);">${serviceData.description || 'N/A'}</p>
        <p class="font-bold mb-2" style="color: var(--cor-texto);"><i class="fas fa-dollar-sign mr-2"></i>R$ ${serviceData.price || 'N/A'}</p>
        <img src="${serviceData.imageUrl || ''}" alt="Imagem do Serviço" class="w-full h-32 object-cover rounded-lg mb-2">
        <button onclick="agendarServico('${docId}', '${serviceData.name}')" class="agendar-btn text-white font-bold py-2 px-4 rounded w-full transition duration-300 hover:shadow-lg text-sm">
            <i class="fas fa-calendar-plus mr-2"></i>Agendar
        </button>
    `;
    return serviceCard;
}

function initializeCarousel() {
    const carousel = document.querySelector('.carousel-container');
    if (!carousel) {
        console.warn('Elemento do carrossel não encontrado');
        return;
    }

    const content = carousel.querySelector('.carousel-content');
    const items = content.children;

    if (items.length === 0) {
        console.warn('Nenhum item encontrado no carrossel');
        return;
    }

    // Remover botões de navegação e permitir rolagem horizontal
    const prev = carousel.querySelector('.carousel-prev');
    const next = carousel.querySelector('.carousel-next');
    if (prev) prev.remove();
    if (next) next.remove();

    // Adicionar evento de rolagem suave
    let isDown = false;
    let startX;
    let scrollLeft;

    content.addEventListener('mousedown', (e) => {
        isDown = true;
        startX = e.pageX - content.offsetLeft;
        scrollLeft = content.scrollLeft;
    });

    content.addEventListener('mouseleave', () => {
        isDown = false;
    });

    content.addEventListener('mouseup', () => {
        isDown = false;
    });

    content.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - content.offsetLeft;
        const walk = (x - startX) * 2;
        content.scrollLeft = scrollLeft - walk;
    });
}

function fecharPopup(element) {
    if (element && !element.classList.contains('closing')) {
        element.classList.add('closing');
        element.style.animationName = 'fadeOut';
        setTimeout(() => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
        }, 500); // Duração da animação
    }
}

function initializeSlider() {
    const slider = document.querySelector('.slider');
    const prevButton = document.querySelector('.slider-prev');
    const nextButton = document.querySelector('.slider-next');
    let slideIndex = 0;

    function showSlide(index) {
        const slides = slider.querySelectorAll('img');
        if (index >= slides.length) slideIndex = 0;
        if (index < 0) slideIndex = slides.length - 1;
        slider.style.transform = `translateX(-${slideIndex * 100}%)`;
    }

    prevButton.addEventListener('click', () => {
        slideIndex--;
        showSlide(slideIndex);
    });

    nextButton.addEventListener('click', () => {
        slideIndex++;
        showSlide(slideIndex);
    });

    showSlide(slideIndex);
}
