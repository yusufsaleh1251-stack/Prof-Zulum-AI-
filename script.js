// Import Firebase functions
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    signOut 
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";

import { 
    collection, 
    addDoc, 
    getDocs, 
    getDoc, 
    updateDoc, 
    deleteDoc, 
    doc, 
    query, 
    where, 
    orderBy,
    setDoc,
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

import { 
    ref, 
    uploadBytes, 
    getDownloadURL 
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-storage.js";

// Application State
let currentUser = null;
let examQuestions = [];
let caQuestions = [];
let currentExam = null;
let currentTimer = null;

// Wait for Firebase to be available
let auth, db, storage;

document.addEventListener('DOMContentLoaded', function() {
    // Check if Firebase is loaded
    const checkFirebase = setInterval(() => {
        if (window.firebase) {
            clearInterval(checkFirebase);
            auth = window.firebase.auth;
            db = window.firebase.db;
            storage = window.firebase.storage;
            initializeApp();
            setupEventListeners();
            
            // Show splash screen for 4 seconds then login
            setTimeout(() => {
                showScreen('login');
            }, 4000);
        }
    }, 100);
});

function initializeApp() {
    // Load questions
    loadExamQuestions();
    loadCAQuestions();
    
    // Check if user is already logged in
    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            checkUserRole(user.uid);
        }
    });
}

function setupEventListeners() {
    // Login form
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    
    // Logout buttons
    document.getElementById('student-logout').addEventListener('click', handleLogout);
    document.getElementById('admin-logout').addEventListener('click', handleLogout);
    
    // Navigation tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', handleTabChange);
    });
    
    // Payment modal
    document.getElementById('pay-now-btn').addEventListener('click', showPaymentModal);
    document.querySelector('.close-modal').addEventListener('click', hidePaymentModal);
    document.getElementById('transferred-btn').addEventListener('click', showPaymentForm);
    document.getElementById('transaction-form').addEventListener('submit', handlePaymentSubmission);
    
    // Admin functionality
    document.getElementById('create-user-form').addEventListener('submit', handleCreateUser);
    document.getElementById('enable-exams').addEventListener('change', toggleExams);
    document.getElementById('enable-ca-test').addEventListener('change', toggleCATest);
    
    // Exam functionality
    document.getElementById('submit-exam').addEventListener('click', () => submitExam('exam'));
    document.getElementById('submit-ca').addEventListener('click', () => submitExam('ca'));
    
    // Keyboard navigation for exams
    document.addEventListener('keydown', handleKeyboardNavigation);
}

// Screen Management
function showScreen(screenName) {
    const screens = {
        splash: document.getElementById('splash-screen'),
        login: document.getElementById('login-screen'),
        student: document.getElementById('student-dashboard'),
        admin: document.getElementById('admin-dashboard')
    };
    
    Object.values(screens).forEach(screen => {
        screen.classList.add('hidden');
    });
    screens[screenName].classList.remove('hidden');
}

// Authentication
async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorElement = document.getElementById('login-error');
    
    try {
        // For demo purposes - admin login
        if (username === 'admin' && password === '371384') {
            // Simulate admin login
            currentUser = { uid: 'admin', email: 'admin@zulumai.com', role: 'admin' };
            showScreen('admin');
            loadAdminData();
        } else {
            // Regular user login - using email pattern
            const userCredential = await signInWithEmailAndPassword(auth, username + '@zulumai.com', password);
            currentUser = userCredential.user;
            await checkUserRole(currentUser.uid);
        }
    } catch (error) {
        errorElement.textContent = 'Invalid username or password';
        errorElement.classList.remove('hidden');
        console.error('Login error:', error);
    }
}

async function checkUserRole(uid) {
    if (uid === 'admin') {
        showScreen('admin');
        loadAdminData();
        return;
    }
    
    try {
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            document.getElementById('student-name').textContent = `Welcome, ${userData.fullName}`;
            showScreen('student');
            loadStudentData();
        }
    } catch (error) {
        console.error('Error checking user role:', error);
    }
}

function handleLogout() {
    signOut(auth);
    currentUser = null;
    showScreen('login');
    document.getElementById('login-form').reset();
}

// Tab Navigation
function handleTabChange(e) {
    const tab = e.currentTarget;
    const tabId = tab.getAttribute('data-tab');
    
    // Update active tab
    document.querySelectorAll('.nav-tab').forEach(t => {
        t.classList.remove('active');
    });
    tab.classList.add('active');
    
    // Show corresponding content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(tabId).classList.add('active');
}

// Question Management
function loadExamQuestions() {
    // Computer Introduction & Windows (50 questions)
    const computerIntroQuestions = [
        {
            question: "What is the full meaning of CPU?",
            options: ["Central Processing Unit", "Computer Processing Unit", "Central Program Unit", "Computer Program Unit"],
            correctAnswer: 0
        },
        {
            question: "Which of these is an input device?",
            options: ["Monitor", "Printer", "Keyboard", "Speaker"],
            correctAnswer: 2
        },
        {
            question: "What does RAM stand for?",
            options: ["Random Access Memory", "Read Access Memory", "Random Available Memory", "Read Available Memory"],
            correctAnswer: 0
        },
        {
            question: "Which key is used to create a new folder in Windows?",
            options: ["Ctrl+N", "Ctrl+Shift+N", "Alt+N", "Shift+N"],
            correctAnswer: 1
        },
        {
            question: "What is the primary function of an operating system?",
            options: ["Run applications", "Manage hardware resources", "Create documents", "Browse the internet"],
            correctAnswer: 1
        },
        {
            question: "Which of these is NOT an operating system?",
            options: ["Windows", "Linux", "Microsoft Office", "macOS"],
            correctAnswer: 2
        },
        {
            question: "What is the smallest unit of data in computing?",
            options: ["Byte", "Bit", "Kilobyte", "Megabyte"],
            correctAnswer: 1
        },
        {
            question: "Which component is known as the brain of the computer?",
            options: ["RAM", "Hard Drive", "CPU", "Motherboard"],
            correctAnswer: 2
        },
        {
            question: "What does URL stand for?",
            options: ["Uniform Resource Locator", "Universal Resource Link", "Uniform Resource Link", "Universal Resource Locator"],
            correctAnswer: 0
        },
        {
            question: "Which of these is a web browser?",
            options: ["Windows Explorer", "Google Chrome", "Microsoft Word", "Adobe Reader"],
            correctAnswer: 1
        }
        // Add 40 more computer introduction questions...
    ];
    
    // Microsoft Office (20 questions)
    const officeQuestions = [
        {
            question: "In Microsoft Word, what does the 'Ctrl+B' shortcut do?",
            options: ["Bold text", "Italic text", "Underline text", "Bullet points"],
            correctAnswer: 0
        },
        {
            question: "Which tab in Excel contains the Sort & Filter options?",
            options: ["Home", "Insert", "Data", "View"],
            correctAnswer: 2
        },
        {
            question: "In PowerPoint, which view shows thumbnails of all slides?",
            options: ["Normal view", "Slide Sorter", "Reading view", "Notes view"],
            correctAnswer: 1
        },
        {
            question: "What is the default file extension for Word documents?",
            options: [".txt", ".docx", ".pdf", ".xlsx"],
            correctAnswer: 1
        },
        {
            question: "Which function in Excel adds up a range of cells?",
            options: ["TOTAL", "ADD", "SUM", "CALCULATE"],
            correctAnswer: 2
        },
        {
            question: "In Word, which feature allows you to see changes made to a document?",
            options: ["Track Changes", "Review Mode", "Edit Tracking", "Change Log"],
            correctAnswer: 0
        },
        {
            question: "What is the purpose of the 'Slide Master' in PowerPoint?",
            options: ["Create animations", "Design slide layouts", "Add transitions", "Record narration"],
            correctAnswer: 1
        },
        {
            question: "Which Excel feature allows you to display data visually?",
            options: ["Formulas", "Charts", "Filters", "PivotTables"],
            correctAnswer: 1
        },
        {
            question: "In Word, what is the shortcut to save a document?",
            options: ["Ctrl+S", "Ctrl+P", "Ctrl+N", "Ctrl+O"],
            correctAnswer: 0
        },
        {
            question: "Which view in Excel shows the worksheet without gridlines and headers?",
            options: ["Normal", "Page Layout", "Page Break", "Full Screen"],
            correctAnswer: 1
        }
        // Add 10 more Office questions...
    ];
    
    examQuestions = [...computerIntroQuestions, ...officeQuestions];
    shuffleArray(examQuestions);
}

function loadCAQuestions() {
    // 30 questions for C.A Test with similar ratio
    caQuestions = [
        {
            question: "What is the brain of the computer?",
            options: ["RAM", "CPU", "Hard Drive", "Motherboard"],
            correctAnswer: 1
        },
        {
            question: "Which of these is a volatile memory?",
            options: ["ROM", "RAM", "Hard Disk", "CD-ROM"],
            correctAnswer: 1
        },
        {
            question: "What does URL stand for?",
            options: ["Uniform Resource Locator", "Universal Resource Link", "Uniform Resource Link", "Universal Resource Locator"],
            correctAnswer: 0
        },
        {
            question: "In Windows, which key combination opens the Task Manager?",
            options: ["Ctrl+Alt+Del", "Ctrl+Shift+Esc", "Alt+F4", "Windows Key+R"],
            correctAnswer: 1
        },
        {
            question: "Which Microsoft application is used for presentations?",
            options: ["Word", "Excel", "PowerPoint", "Access"],
            correctAnswer: 2
        },
        {
            question: "What is the function of the ALU in a CPU?",
            options: ["Store data", "Control operations", "Perform calculations", "Manage memory"],
            correctAnswer: 2
        },
        {
            question: "Which of these is an output device?",
            options: ["Mouse", "Scanner", "Printer", "Keyboard"],
            correctAnswer: 2
        },
        {
            question: "What does PDF stand for?",
            options: ["Portable Document Format", "Personal Data File", "Printed Document File", "Public Document Format"],
            correctAnswer: 0
        },
        {
            question: "Which key is used to delete text to the right of the cursor?",
            options: ["Backspace", "Delete", "Shift", "Enter"],
            correctAnswer: 1
        },
        {
            question: "What is the purpose of an operating system?",
            options: ["Create documents", "Manage computer resources", "Browse the internet", "Play games"],
            correctAnswer: 1
        }
        // Add 20 more C.A test questions...
    ];
    shuffleArray(caQuestions);
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// Exam Management
function startExam(type) {
    const questions = type === 'exam' ? examQuestions : caQuestions;
    const containerId = type === 'exam' ? 'exam-questions' : 'ca-questions';
    const statusId = type === 'exam' ? 'exam-status' : 'ca-status';
    const containerElementId = type === 'exam' ? 'exam-container' : 'ca-container';
    const timerId = type === 'exam' ? 'exam-timer' : 'ca-timer';
    const duration = type === 'exam' ? 30 : 20; // minutes
    
    document.getElementById(statusId).classList.add('hidden');
    document.getElementById(containerElementId).classList.remove('hidden');
    
    // Display questions
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    
    questions.forEach((q, index) => {
        const questionElement = document.createElement('div');
        questionElement.className = 'question-card';
        questionElement.innerHTML = `
            <div class="question-text">${index + 1}. ${q.question}</div>
            <div class="options-list">
                ${q.options.map((option, optIndex) => `
                    <div class="option" data-question="${index}" data-option="${optIndex}">
                        ${String.fromCharCode(65 + optIndex)}. ${option}
                    </div>
                `).join('')}
            </div>
        `;
        container.appendChild(questionElement);
    });
    
    // Add click events to options
    container.querySelectorAll('.option').forEach(option => {
        option.addEventListener('click', function() {
            const questionIndex = parseInt(this.getAttribute('data-question'));
            const optionIndex = parseInt(this.getAttribute('data-option'));
            selectAnswer(type, questionIndex, optionIndex);
        });
    });
    
    // Start timer
    startTimer(duration * 60, timerId, () => {
        submitExam(type);
    });
    
    currentExam = {
        type: type,
        answers: {},
        startTime: new Date()
    };
}

function selectAnswer(examType, questionIndex, optionIndex) {
    if (!currentExam || currentExam.type !== examType) return;
    
    currentExam.answers[questionIndex] = optionIndex;
    
    // Update UI
    const questionElement = document.querySelector(`[data-question="${questionIndex}"]`).closest('.question-card');
    questionElement.querySelectorAll('.option').forEach(opt => {
        opt.classList.remove('selected');
    });
    questionElement.querySelector(`[data-option="${optionIndex}"]`).classList.add('selected');
}

function startTimer(duration, displayElement, callback) {
    let timer = duration, minutes, seconds;
    const display = document.getElementById(displayElement);
    
    currentTimer = setInterval(function () {
        minutes = parseInt(timer / 60, 10);
        seconds = parseInt(timer % 60, 10);
        
        minutes = minutes < 10 ? "0" + minutes : minutes;
        seconds = seconds < 10 ? "0" + seconds : seconds;
        
        display.textContent = minutes + ":" + seconds;
        
        if (--timer < 0) {
            clearInterval(currentTimer);
            callback();
        }
    }, 1000);
}

function submitExam(type) {
    if (currentTimer) {
        clearInterval(currentTimer);
    }
    
    const questions = type === 'exam' ? examQuestions : caQuestions;
    let score = 0;
    
    Object.keys(currentExam.answers).forEach(questionIndex => {
        if (currentExam.answers[questionIndex] === questions[questionIndex].correctAnswer) {
            score++;
        }
    });
    
    const percentage = (score / questions.length) * 100;
    const containerId = type === 'exam' ? 'exam-container' : 'ca-container';
    
    document.getElementById(containerId).innerHTML = `
        <div class="status-card">
            <h3>Exam Completed!</h3>
            <p>Your Score: ${score} out of ${questions.length}</p>
            <p>Percentage: ${percentage.toFixed(2)}%</p>
            <p>Status: ${percentage >= 50 ? 'Passed' : 'Failed'}</p>
            <button onclick="location.reload()" class="submit-btn">Return to Dashboard</button>
        </div>
    `;
    
    // Save result to Firebase
    saveExamResult(type, score, percentage);
}

async function saveExamResult(type, score, percentage) {
    try {
        await addDoc(collection(db, 'examResults'), {
            userId: currentUser.uid,
            userName: currentUser.email,
            examType: type,
            score: score,
            percentage: percentage,
            timestamp: serverTimestamp(),
            answers: currentExam.answers
        });
    } catch (error) {
        console.error('Error saving exam result:', error);
    }
}

// Payment Management
function showPaymentModal() {
    document.getElementById('payment-modal').classList.remove('hidden');
}

function hidePaymentModal() {
    document.getElementById('payment-modal').classList.add('hidden');
}

function showPaymentForm() {
    hidePaymentModal();
    document.getElementById('payment-form').classList.remove('hidden');
}

async function handlePaymentSubmission(e) {
    e.preventDefault();
    
    const transactionId = document.getElementById('transaction-id').value;
    const amount = parseFloat(document.getElementById('amount-paid').value);
    
    try {
        await addDoc(collection(db, 'payments'), {
            userId: currentUser.uid,
            userName: currentUser.email,
            transactionId: transactionId,
            amount: amount,
            status: 'pending',
            timestamp: serverTimestamp()
        });
        
        alert('Payment submitted successfully! Admin will verify your payment.');
        document.getElementById('transaction-form').reset();
        document.getElementById('payment-form').classList.add('hidden');
        
        // Refresh payment history
        loadStudentData();
    } catch (error) {
        alert('Error submitting payment. Please try again.');
        console.error('Payment submission error:', error);
    }
}

// Admin Functions
async function handleCreateUser(e) {
    e.preventDefault();
    
    const username = document.getElementById('new-username').value;
    const fullName = document.getElementById('new-fullname').value;
    const password = document.getElementById('new-password').value;
    const imageFile = document.getElementById('user-image').files[0];
    
    try {
        // Create user in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, username + '@zulumai.com', password);
        const user = userCredential.user;
        
        // Upload image if provided
        let imageUrl = '';
        if (imageFile) {
            const storageRef = ref(storage, `profile-images/${user.uid}`);
            await uploadBytes(storageRef, imageFile);
            imageUrl = await getDownloadURL(storageRef);
        }
        
        // Save user data to Firestore
        await setDoc(doc(db, 'users', user.uid), {
            username: username,
            fullName: fullName,
            email: username + '@zulumai.com',
            role: 'student',
            profileImage: imageUrl,
            createdAt: serverTimestamp()
        });
        
        alert('User created successfully!');
        document.getElementById('create-user-form').reset();
        loadAdminData();
    } catch (error) {
        alert('Error creating user: ' + error.message);
    }
}

async function toggleExams(e) {
    const enabled = e.target.checked;
    try {
        await setDoc(doc(db, 'settings', 'exams'), {
            enabled: enabled,
            updatedAt: serverTimestamp()
        });
    } catch (error) {
        console.error('Error updating exam settings:', error);
    }
}

async function toggleCATest(e) {
    const enabled = e.target.checked;
    try {
        await setDoc(doc(db, 'settings', 'caTest'), {
            enabled: enabled,
            updatedAt: serverTimestamp()
        });
    } catch (error) {
        console.error('Error updating CA test settings:', error);
    }
}

// Data Loading Functions
async function loadStudentData() {
    // Load exam availability
    try {
        const examSettingsDoc = await getDoc(doc(db, 'settings', 'exams'));
        const caSettingsDoc = await getDoc(doc(db, 'settings', 'caTest'));
        
        if (examSettingsDoc.exists() && examSettingsDoc.data().enabled) {
            document.getElementById('exam-status').innerHTML = `
                <p>Exams are now available. Click the button below to start.</p>
                <button onclick="startExam('exam')" class="submit-btn">Start Exam</button>
            `;
        }
        
        if (caSettingsDoc.exists() && caSettingsDoc.data().enabled) {
            document.getElementById('ca-status').innerHTML = `
                <p>C.A Test is now available. Click the button below to start.</p>
                <button onclick="startExam('ca')" class="submit-btn">Start C.A Test</button>
            `;
        }
        
        // Load payment status
        const paymentsQuery = query(
            collection(db, 'payments'), 
            where('userId', '==', currentUser.uid),
            orderBy('timestamp', 'desc')
        );
        const paymentsSnapshot = await getDocs(paymentsQuery);
        
        if (!paymentsSnapshot.empty) {
            const latestPayment = paymentsSnapshot.docs[0].data();
            const statusElement = document.getElementById('payment-status-content');
            
            let statusClass = 'status-pending';
            if (latestPayment.status === 'complete') statusClass = 'status-complete';
            if (latestPayment.status === 'partial') statusClass = 'status-partial';
            
            statusElement.innerHTML = `
                <div class="payment-status ${statusClass}">
                    <h3>Payment Status: ${latestPayment.status.toUpperCase()}</h3>
                    <p>Amount Paid: ₦${latestPayment.amount}</p>
                    <p>Balance: ₦${latestPayment.balance || 0}</p>
                    <p>Last Updated: ${latestPayment.timestamp?.toDate().toLocaleDateString()}</p>
                </div>
            `;
            
            // Load payment history
            const historyElement = document.getElementById('payment-history-content');
            let historyHTML = '';
            
            paymentsSnapshot.forEach(doc => {
                const payment = doc.data();
                let statusClass = 'status-pending';
                if (payment.status === 'complete') statusClass = 'status-complete';
                if (payment.status === 'partial') statusClass = 'status-partial';
                
                historyHTML += `
                    <div class="payment-status ${statusClass}">
                        <p><strong>Date:</strong> ${payment.timestamp?.toDate().toLocaleDateString()}</p>
                        <p><strong>Amount:</strong> ₦${payment.amount}</p>
                        <p><strong>Transaction ID:</strong> ${payment.transactionId}</p>
                        <p><strong>Status:</strong> ${payment.status.toUpperCase()}</p>
                    </div>
                `;
            });
            
            historyElement.innerHTML = historyHTML;
        }
    } catch (error) {
        console.error('Error loading student data:', error);
    }
}

async function loadAdminData() {
    try {
        // Load users
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const userList = document.getElementById('user-list');
        userList.innerHTML = '';
        
        usersSnapshot.forEach(doc => {
            const user = doc.data();
            const userElement = document.createElement('div');
            userElement.className = 'data-item';
            userElement.innerHTML = `
                <div class="data-info">
                    <h4>${user.fullName}</h4>
                    <p>Username: ${user.username} | Role: ${user.role}</p>
                </div>
                <div class="data-actions">
                    <button class="action-btn btn-warning" onclick="resetExam('${doc.id}')">Reset Exam</button>
                    <button class="action-btn btn-danger" onclick="deleteUser('${doc.id}')">Delete</button>
                </div>
            `;
            userList.appendChild(userElement);
        });
        
        // Load settings
        const examSettingsDoc = await getDoc(doc(db, 'settings', 'exams'));
        const caSettingsDoc = await getDoc(doc(db, 'settings', 'caTest'));
        
        if (examSettingsDoc.exists()) {
            document.getElementById('enable-exams').checked = examSettingsDoc.data().enabled;
        }
        
        if (caSettingsDoc.exists()) {
            document.getElementById('enable-ca-test').checked = caSettingsDoc.data().enabled;
        }
        
        // Load pending payments
        const pendingPaymentsQuery = query(
            collection(db, 'payments'),
            where('status', '==', 'pending'),
            orderBy('timestamp', 'desc')
        );
        const pendingPaymentsSnapshot = await getDocs(pendingPaymentsQuery);
        
        const pendingContainer = document.getElementById('pending-payments');
        pendingContainer.innerHTML = '';
        
        pendingPaymentsSnapshot.forEach(doc => {
            const payment = doc.data();
            const paymentElement = document.createElement('div');
            paymentElement.className = 'data-item';
            paymentElement.innerHTML = `
                <div class="data-info">
                    <h4>${payment.userName}</h4>
                    <p>Amount: ₦${payment.amount} | Transaction: ${payment.transactionId}</p>
                    <p>Date: ${payment.timestamp?.toDate().toLocaleDateString()}</p>
                </div>
                <div class="data-actions">
                    <button class="action-btn btn-success" onclick="confirmPayment('${doc.id}', 'complete')">Complete</button>
                    <button class="action-btn btn-warning" onclick="confirmPayment('${doc.id}', 'partial')">Partial</button>
                    <button class="action-btn btn-danger" onclick="rejectPayment('${doc.id}')">Reject</button>
                </div>
            `;
            pendingContainer.appendChild(paymentElement);
        });
        
        // Load all payments
        const allPaymentsQuery = query(
            collection(db, 'payments'),
            orderBy('timestamp', 'desc')
        );
        const allPaymentsSnapshot = await getDocs(allPaymentsQuery);
        
        const allPaymentsContainer = document.getElementById('all-payments');
        allPaymentsContainer.innerHTML = '';
        
        allPaymentsSnapshot.forEach(doc => {
            const payment = doc.data();
            let statusClass = 'status-pending';
            if (payment.status === 'complete') statusClass = 'status-complete';
            if (payment.status === 'partial') statusClass = 'status-partial';
            
            const paymentElement = document.createElement('div');
            paymentElement.className = `data-item ${statusClass}`;
            paymentElement.innerHTML = `
                <div class="data-info">
                    <h4>${payment.userName}</h4>
                    <p>Amount: ₦${payment.amount} | Status: ${payment.status.toUpperCase()}</p>
                    <p>Transaction: ${payment.transactionId} | Date: ${payment.timestamp?.toDate().toLocaleDateString()}</p>
                </div>
            `;
            allPaymentsContainer.appendChild(paymentElement);
        });
    } catch (error) {
        console.error('Error loading admin data:', error);
    }
}

// Admin Action Functions
async function resetExam(userId) {
    try {
        // Delete user's exam results
        const resultsQuery = query(
            collection(db, 'examResults'),
            where('userId', '==', userId)
        );
        const resultsSnapshot = await getDocs(resultsQuery);
        
        const deletePromises = [];
        resultsSnapshot.forEach(doc => {
            deletePromises.push(deleteDoc(doc.ref));
        });
        
        await Promise.all(deletePromises);
        alert('Exam results reset successfully!');
    } catch (error) {
        alert('Error resetting exam: ' + error.message);
    }
}

async function deleteUser(userId) {
    if (confirm('Are you sure you want to delete this user?')) {
        try {
            await deleteDoc(doc(db, 'users', userId));
            alert('User deleted successfully!');
            loadAdminData();
        } catch (error) {
            alert('Error deleting user: ' + error.message);
        }
    }
}

async function confirmPayment(paymentId, status) {
    try {
        await updateDoc(doc(db, 'payments', paymentId), {
            status: status,
            verifiedAt: serverTimestamp()
        });
        alert('Payment confirmed!');
        loadAdminData();
    } catch (error) {
        alert('Error confirming payment: ' + error.message);
    }
}

async function rejectPayment(paymentId) {
    try {
        await deleteDoc(doc(db, 'payments', paymentId));
        alert('Payment rejected!');
        loadAdminData();
    } catch (error) {
        alert('Error rejecting payment: ' + error.message);
    }
}

// Keyboard Navigation
function handleKeyboardNavigation(e) {
    if (!currentExam) return;
    
    const key = e.key.toLowerCase();
    
    // Answer selection (a, b, c, d)
    if (key >= 'a' && key <= 'd') {
        e.preventDefault();
        const optionIndex = key.charCodeAt(0) - 97; // a=0, b=1, etc.
        // This would need additional logic to track current question
        // For now, we'll just log it
        console.log(`Selected option ${key.toUpperCase()}`);
    }
    
    // Navigation (p for previous, n for next)
    if (key === 'p') {
        e.preventDefault();
        // Navigate to previous question
        console.log('Previous question');
    } else if (key === 'n') {
        e.preventDefault();
        // Navigate to next question
        console.log('Next question');
    }
}

// Make functions available globally for onclick handlers
window.startExam = startExam;
window.resetExam = resetExam;
window.deleteUser = deleteUser;
window.confirmPayment = confirmPayment;
window.rejectPayment = rejectPayment;