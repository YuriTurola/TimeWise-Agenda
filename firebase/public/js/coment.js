function mostrarComentarios(index) {
    const user = firebase.auth().currentUser;
    if (!user) {
        alert("Você precisa estar logado para comentar.");
        return;
    }

    db.collection("appointments").doc(user.uid).get()
        .then((doc) => {
            if (doc.exists) {
                const appointments = doc.data().appointments;
                if (appointments[index]) {
                    const appointment = appointments[index];
                    exibirModalComentarios(appointment, index);
                } else {
                    throw new Error("Agendamento não encontrado");
                }
            } else {
                throw new Error("Documento de agendamentos não encontrado");
            }
        })
        .catch((error) => {
            console.error("Erro ao buscar informações do agendamento:", error);
            alert("Ocorreu um erro ao carregar os comentários. Por favor, tente novamente.");
        });
}

function exibirModalComentarios(appointment, index) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50 p-4';
    modal.innerHTML = `
        <div class="bg-dark-surface rounded-lg overflow-hidden shadow-2xl w-full max-w-md mx-auto">
            <div class="bg-orange-custom py-3 px-4">
                <h2 class="text-xl font-bold text-dark-surface flex items-center">
                    <i class="fas fa-comment mr-2"></i>
                    Comentário
                </h2>
            </div>
            <div class="p-4">
                <div id="comentarioExistente" class="mb-4"></div>
                <div id="formularioComentario">
                    <textarea id="novoComentario" class="w-full bg-gray-700 text-white rounded px-3 py-2 mb-2" placeholder="Escreva seu comentário..."></textarea>
                    <button id="enviarComentario" class="bg-orange-custom hover:bg-orange-600 text-white font-bold py-2 px-4 rounded transition duration-300 flex items-center justify-center w-full">
                        <i class="fas fa-paper-plane mr-2"></i>Enviar Comentário
                    </button>
                </div>
                <button id="fecharModal" class="mt-2 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded transition duration-300 flex items-center justify-center w-full">
                    <i class="fas fa-times mr-2"></i>Fechar
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const comentarioExistente = document.getElementById('comentarioExistente');
    const formularioComentario = document.getElementById('formularioComentario');
    const novoComentario = document.getElementById('novoComentario');
    const enviarComentario = document.getElementById('enviarComentario');
    const fecharModal = document.getElementById('fecharModal');

    // Verificar se já existe um comentário
    if (appointment.comentario) {
        console.log("User Photo URL in Comment:", appointment.comentario.userPhotoURL);
        comentarioExistente.innerHTML = `
            <div class="bg-gray-800 p-4 rounded mb-4">
                <div class="flex items-center mb-2">
                    <img src="${appointment.comentario.userPhotoURL || 'https://via.placeholder.com/40'}" alt="Foto do usuário" class="w-10 h-10 rounded-full mr-3">
                    <div>
                        <p class="font-bold text-orange-custom">${appointment.comentario.userName}</p>
                        <p class="text-sm text-gray-400">${appointment.comentario.data}</p>
                    </div>
                </div>
                <p class="text-white">${appointment.comentario.texto}</p>
            </div>
        `;
        formularioComentario.style.display = 'none';
    }

    enviarComentario.onclick = () => {
        const texto = novoComentario.value.trim();
        if (texto) {
            adicionarComentario(index, texto);
            modal.remove();
        } else {
            alert("Por favor, escreva um comentário antes de enviar.");
        }
    };

    fecharModal.onclick = () => {
        modal.remove();
    };
}

function adicionarComentario(index, texto) {
    const user = firebase.auth().currentUser;
    if (!user) {
        alert("Você precisa estar logado para comentar.");
        return;
    }

    console.log("User Photo URL:", user.photoURL); // Adicionando log aqui

    db.collection("appointments").doc(user.uid).get()
        .then((doc) => {
            if (doc.exists) {
                const appointments = doc.data().appointments;
                if (appointments[index]) {
                    const appointment = appointments[index];
                    const novoComentario = {
                        texto: texto,
                        data: new Date().toLocaleString(),
                        userId: user.uid,
                        userName: user.displayName || 'Usuário Anônimo',
                        userPhotoURL: user.photoURL || '',
                        workerName: appointment.workerName || 'Funcionário não especificado',
                        serviceName: appointment.serviceName || 'Serviço não especificado'
                    };

                    console.log("Novo Comentário:", novoComentario); // Adicionando log aqui

                    if (!appointment.comentario) {
                        appointments[index].comentario = novoComentario;
                        return db.collection("appointments").doc(user.uid).update({
                            appointments: appointments
                        });
                    } else {
                        throw new Error("Já existe um comentário para este serviço");
                    }
                } else {
                    throw new Error("Agendamento não encontrado");
                }
            } else {
                throw new Error("Documento de agendamentos não encontrado");
            }
        })
        .then(() => {
            alert("Obrigado pelo seu comentário!");
            carregarAgendamentos(user);
        })
        .catch((error) => {
            console.error("Erro ao adicionar comentário:", error);
            if (error.message === "Já existe um comentário para este serviço") {
                alert("Você já adicionou um comentário para este serviço.");
            } else {
                alert("Ocorreu um erro ao adicionar o comentário. Por favor, tente novamente.");
            }
        });
}
