function getProximaData(diaDaSemana) {
    console.log("Dia da semana recebido:", diaDaSemana);
    const diasDaSemana = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const hoje = new Date();
    const indiceAtual = hoje.getDay();
    const indiceAlvo = diasDaSemana.indexOf(diaDaSemana.toLowerCase());
    console.log("Índice alvo:", indiceAlvo);
    if (indiceAlvo === -1) {
        console.error("Dia da semana inválido:", diaDaSemana);
        return null;
    }function getProximaData(diaDaSemana) {
    console.log("Dia da semana recebido:", diaDaSemana);
    const diasDaSemana = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const hoje = new Date();
    const indiceAtual = hoje.getDay();
    const indiceAlvo = diasDaSemana.indexOf(diaDaSemana.toLowerCase());
    console.log("Índice alvo:", indiceAlvo);
    if (indiceAlvo === -1) {
        console.error("Dia da semana inválido:", diaDaSemana);
        return null;
    }
    const diasParaAdicionar = (indiceAlvo + 7 - indiceAtual) % 7;
    const proximaData = new Date(hoje);
    proximaData.setDate(hoje.getDate() + diasParaAdicionar);
    console.log("Próxima data calculada:", proximaData);
    return proximaData;
}

function formatarData(data) {
    if (!(data instanceof Date) || isNaN(data)) {
        console.error("Data inválida:", data);
        return "Data inválida";
    }
    return data.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
}

window.getProximaData = getProximaData;
window.formatarData = formatarData;

    const diasParaAdicionar = (indiceAlvo + 7 - indiceAtual) % 7;
    const proximaData = new Date(hoje);
    proximaData.setDate(hoje.getDate() + diasParaAdicionar);
    console.log("Próxima data calculada:", proximaData);
    return proximaData;
}

function formatarData(data) {
    if (!(data instanceof Date) || isNaN(data)) {
        console.error("Data inválida:", data);
        return "Data inválida";
    }
    return data.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
}

window.getProximaData = getProximaData;
window.formatarData = formatarData;
