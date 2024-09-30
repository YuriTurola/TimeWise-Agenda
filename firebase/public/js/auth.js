// Verificar o estado de autenticação
auth.onAuthStateChanged((user) => {
    if (user) {
        showUserProfile(user);
        carregarAgendamentos(user);
    } else {
        window.location.href = '../page/LoginTimeWise.html';
    }
});

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
