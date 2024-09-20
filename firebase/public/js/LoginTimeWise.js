// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBrG14qUCGOIMucxBArrhzZ2hG2ilidwnU",
    authDomain: "time-wise-agendamentos.firebaseapp.com",
    projectId: "time-wise-agendamentos",
    storageBucket: "time-wise-agendamentos.appspot.com",
    messagingSenderId: "833338728870",
    appId: "1:833338728870:web:f4f87d0e3f9c7dc92f6f67",
    measurementId: "G-63ZD6V69EV"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firestore
const db = firebase.firestore();

// DOM references for forms and messages
const loginSection = document.getElementById('loginSection');
const registerSection = document.getElementById('registerSection');
const resetPasswordSection = document.getElementById('resetPasswordSection');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const resetPasswordForm = document.getElementById('resetPasswordForm');
const message = document.getElementById('message');

// Function to display messages and automatically hide them after 4 seconds
function showMessage(text, color) {
    message.textContent = text;
    message.style.color = color;
    message.style.display = 'block';

    // Hide the message after 4 seconds
    setTimeout(() => {
        message.textContent = "";
        message.style.display = 'none';
    }, 4000);
}

// Toggle between forms
document.getElementById('showRegister').addEventListener('click', () => {
    loginSection.style.display = 'none';
    registerSection.style.display = 'block';
    resetPasswordSection.style.display = 'none';
});

document.getElementById('showLogin').addEventListener('click', () => {
    registerSection.style.display = 'none';
    loginSection.style.display = 'block';
    resetPasswordSection.style.display = 'none';
});

document.getElementById('showResetPassword').addEventListener('click', () => {
    loginSection.style.display = 'none';
    resetPasswordSection.style.display = 'block';
    registerSection.style.display = 'none';
});

document.getElementById('showLoginFromReset').addEventListener('click', () => {
    resetPasswordSection.style.display = 'none';
    loginSection.style.display = 'block';
    registerSection.style.display = 'none';
});

// Login form submission
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    firebase.auth().signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            showMessage("Login bem-sucedido!", "#4CAF50"); // Success message in green
            // Redirect handled by onAuthStateChanged
        })
        .catch((error) => {
            showMessage("Erro no login: " + error.message, "#ff4444"); // Error message in red
        });
});

// Register form submission
registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;

    firebase.auth().createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            sessionStorage.setItem('isNewUser', true);

            // Save user data in Firestore
            return db.collection('usersweb').doc(user.uid).set({
                name: name,
                email: user.email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        })
        .then(() => {
            showMessage("Cadastro realizado com sucesso! Agora faça login.", "#4CAF50"); // Success message in green

            // Sign out the user to prevent automatic login after registration
            return firebase.auth().signOut();
        })
        .then(() => {
            // Show login form after signing out
            registerSection.style.display = 'none';
            loginSection.style.display = 'block';
        })
        .catch((error) => {
            let errorMessage = "";
            switch (error.code) {
                case 'auth/weak-password':
                    errorMessage = "A senha deve ter pelo menos 6 caracteres.";
                    break;
                case 'auth/email-already-in-use':
                    errorMessage = "Este email já está em uso. Tente fazer login ou use outro email.";
                    break;
                case 'auth/invalid-email':
                    errorMessage = "Email inválido. Por favor, verifique o email inserido.";
                    break;
                default:
                    errorMessage = "Erro no cadastro: " + error.message;
            }
            showMessage(errorMessage, "#ff4444"); // Error message in red
        });
});

// Password reset form submission
resetPasswordForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('resetEmail').value;

    firebase.auth().sendPasswordResetEmail(email)
        .then(() => {
            showMessage("Email de recuperação de senha enviado. Verifique sua caixa de entrada.", "#4CAF50");
            resetPasswordSection.style.display = 'none';
            loginSection.style.display = 'block';
        })
        .catch((error) => {
            showMessage("Erro ao enviar email de recuperação: " + error.message, "#ff4444"); // Error message in red
        });
});

// Handle authentication state changes
firebase.auth().onAuthStateChanged((user) => {
    const currentPage = window.location.pathname;

    if (user) {
        // Check if the user is newly registered
        const isNewUser = sessionStorage.getItem('isNewUser');

        if (isNewUser) {
            sessionStorage.removeItem('isNewUser');
            // Show login form for newly registered users
            registerSection.style.display = 'none';
            loginSection.style.display = 'block';
        } else {
            // Redirect logged-in users to "estabelecimento.html"
            if (currentPage !== '/estabelecimento.html') {
                window.location.href = 'estabelecimento.html';
            }
        }
    } else {
        // If no user is logged in, display the login form
        loginSection.style.display = 'block';
        registerSection.style.display = 'none';
        resetPasswordSection.style.display = 'none';
    }
});
