// Application State
let currentUser = null;
let examQuestions = [];
let caQuestions = [];
let currentExam = null;
let currentTimer = null;
let isFirebaseReady = false;

// Initialize Application
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded, initializing app...");
    
    // Set up event listeners
    setupEventListeners();
    
    // Check if Firebase is already loaded
    if (window.firebaseAuth) {
        console.log("Firebase already loaded");
        initializeFirebaseApp();
    } else {
        console.log("Waiting for Firebase...");
        // Set up callback for when Firebase loads
        window.firebaseReady = function() {
            console.log("Firebase ready callback called");
            initializeFirebaseApp();
        };
    }
});

function setupEventListeners() {
    // Login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Logout buttons
    const studentLogout = document.getElementById('student-logout');
    const adminLogout = document.getElementById('admin-logout');
    if (studentLogout) studentLogout.addEventListener('click', handleLogout);
    if (adminLogout) adminLogout.addEventListener('click', handleLogout);
    
    // Navigation tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', handleTabChange);
    });
    
    // Payment modal
    const payBtn = document.getElementById('pay-now-btn');
    const closeModal = document.querySelector('.close-modal');
    const transferredBtn = document.getElementById('transferred-btn');
    
    if (payBtn) payBtn.addEventListener('click', showPaymentModal);
    if (closeModal) closeModal.addEventListener('click', hidePaymentModal);
    if (transferredBtn) transferredBtn.addEventListener('click', showPaymentForm);
    
    // Payment form
    const transactionForm = document.getElementById('transaction-form');
    if (transactionForm) {
        transactionForm.addEventListener('submit', handlePaymentSubmission);
    }
}

function initializeFirebaseApp() {
    console.log("Initializing Firebase app...");
    isFirebaseReady = true;
    
    // Load questions
    loadExamQuestions();
    loadCAQuestions();
    
    // Set up Firebase-dependent event listeners
    setupFirebaseEventListeners();
    
    // Check if user is already logged in
    window.firebaseAuth.onAuthStateChanged((user) => {
        if (user) {
            console.log("User already logged in:", user.email);
            currentUser = user;
            checkUserRole(user.uid);
        } else {
            console.log("No user logged in");
        }
    });
}

function setupFirebaseEventListeners() {
    // Admin functionality
    const createUserForm = document.getElementById('create-user-form');
    const enableExams = document.getElementById('enable-exams');
    const enableCaTest = document.getElementById('enable-ca-test');
    
    if (createUserForm) createUserForm.addEventListener('submit', handleCreateUser);
    if (enableExams) enableExams.addEventListener('change', toggleExams);
    if (enableCaTest) enableCaTest.addEventListener('change', toggleCATest);
    
    // Exam functionality
    const submitExam = document.getElementById('submit-exam');
    const submitCa = document.getElementById('submit-ca');
    
    if (submitExam) submitExam.addEventListener('click', () => submitExamHandler('exam'));
    if (submitCa) submitCa.addEventListener('click', () => submitExamHandler('ca'));
    
    // Keyboard navigation for exams
    document.addEventListener('keydown', handleKeyboardNavigation);
}

// Screen Management
function showScreen(screenName) {
    console.log("Showing screen:", screenName);
    const screens = {
        login: document.getElementById('login-screen'),
        student: document.getElementById('student-dashboard'),
        admin: document.getElementById('admin-dashboard')
    };
    
    Object.values(screens).forEach(screen => {
        if (screen) {
            screen.classList.add('hidden');
        }
    });
    
    if (screens[screenName]) {
        screens[screenName].classList.remove('hidden');
    }
    
    // Load data if going to student or admin dashboard
    if (screenName === 'student' && currentUser) {
        loadStudentData();
    } else if (screenName === 'admin') {
        loadAdminData();
    }
}

// Authentication
async function handleLogin(e) {
    e.preventDefault();
    console.log("Login attempt...");
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorElement = document.getElementById('login-error');
    
    // Clear previous errors
    if (errorElement) {
        errorElement.classList.add('hidden');
    }
    
    try {
        // For demo purposes - admin login (works without Firebase)
        if (username === 'admin' && password === '371384') {
            console.log("Admin login successful");
            currentUser = { 
                uid: 'admin', 
                email: 'admin@zulumai.com', 
                role: 'admin',
                displayName: 'Administrator'
            };
            showScreen('admin');
            return;
        }
        
        // Demo student login
        if (username === 'student1' && password === 'password123') {
            console.log("Demo student login successful");
            currentUser = { 
                uid: 'student1', 
                email: 'student1@zulumai.com', 
                role: 'student',
                displayName: 'Demo Student'
            };
            const studentNameElement = document.getElementById('student-name');
            if (studentNameElement) {
                studentNameElement.textContent = `Welcome, Demo Student`;
            }
            showScreen('student');
            return;
        }
        
        // Regular user login - requires Firebase
        if (!isFirebaseReady) {
            throw new Error('System is initializing. Please try again in a moment.');
        }
        
        const { signInWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js');
        const userCredential = await signInWithEmailAndPassword(window.firebaseAuth, username + '@zulumai.com', password);
        currentUser = userCredential.user;
        await checkUserRole(currentUser.uid);
        
    } catch (error) {
        console.error('Login error:', error);
        if (errorElement) {
            errorElement.textContent = error.message || 'Invalid username or password';
            errorElement.classList.remove('hidden');
        }
    }
}

async function checkUserRole(uid) {
    if (uid === 'admin') {
        showScreen('admin');
        return;
    }
    
    try {
        const { getDoc, doc } = await import('https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js');
        const userDoc = await getDoc(doc(window.firebaseDb, 'users', uid));
        
        if (userDoc.exists()) {
            const userData = userDoc.data();
            const studentNameElement = document.getElementById('student-name');
            if (studentNameElement) {
                studentNameElement.textContent = `Welcome, ${userData.fullName}`;
            }
            showScreen('student');
        } else {
            throw new Error('User data not found');
        }
    } catch (error) {
        console.error('Error checking user role:', error);
        // If there's an error, still show student dashboard but with limited functionality
        showScreen('student');
    }
}

async function handleLogout() {
    if (isFirebaseReady && window.firebaseAuth) {
        const { signOut } = await import('https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js');
        await signOut(window.firebaseAuth);
    }
    currentUser = null;
    showScreen('login');
    const loginForm = document.getElementById('login-form');
    if (loginForm) loginForm.reset();
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
    
    const targetContent = document.getElementById(tabId);
    if (targetContent) {
        targetContent.classList.add('active');
    }
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
    // 30 questions for C.A Test
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
    return array;
}

// Exam Management
function startExam(type) {
    const questions = type === 'exam' ? examQuestions : caQuestions;
    const containerId = type === 'exam' ? 'exam-questions' : 'ca-questions';
    const statusId = type === 'exam' ? 'exam-status' : 'ca-status';
    const containerElementId = type === 'exam' ? 'exam-container' : 'ca-container';
    const timerId = type === 'exam' ? 'exam-timer' : 'ca-timer';
    const duration = type === 'exam' ? 30 : 20; // minutes
    
    const statusElement = document.getElementById(statusId);
    const containerElement = document.getElementById(containerElementId);
    
    if (statusElement) statusElement.classList.add('hidden');
    if (containerElement) containerElement.classList.remove('hidden');
    
    // Display questions
    const container = document.getElementById(containerId);
    if (container) {
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
    }
    
    // Start timer
    startTimer(duration * 60, timerId, () => {
        submitExamHandler(type);
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
    const optionElement = document.querySelector(`[data-question="${questionIndex}"][data-option="${optionIndex}"]`);
    if (optionElement) {
        const questionCard = optionElement.closest('.question-card');
        if (questionCard) {
            questionCard.querySelectorAll('.option').forEach(opt => {
                opt.classList.remove('selected');
            });
            optionElement.classList.add('selected');
        }
    }
}

function startTimer(duration, displayElement, callback) {
    if (currentTimer) {
        clearInterval(currentTimer);
    }
    
    let timer = duration;
    const display = document.getElementById(displayElement);
    
    if (!display) return;
    
    currentTimer = setInterval(function () {
        const minutes = Math.floor(timer / 60);
        const seconds = timer % 60;
        
        display.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        if (--timer < 0) {
            clearInterval(currentTimer);
            callback();
        }
    }, 1000);
}

function submitExamHandler(type) {
    if (currentTimer) {
        clearInterval(currentTimer);
        currentTimer = null;
    }
    
    const questions = type === 'exam' ? examQuestions : caQuestions;
    let score = 0;
    
    if (currentExam && currentExam.answers) {
        Object.keys(currentExam.answers).forEach(questionIndex => {
            if (currentExam.answers[questionIndex] === questions[questionIndex].correctAnswer) {
                score++;
            }
        });
    }
    
    const percentage = questions.length > 0 ? (score / questions.length) * 100 : 0;
    const containerId = type === 'exam' ? 'exam-container' : 'ca-container';
    const container = document.getElementById(containerId);
    
    if (container) {
        container.innerHTML = `
            <div class="status-card">
                <h3>${type === 'exam' ? 'Exam' : 'C.A Test'} Completed!</h3>
                <p>Your Score: ${score} out of ${questions.length}</p>
                <p>Percentage: ${percentage.toFixed(2)}%</p>
                <p>Status: ${percentage >= 50 ? 'Passed' : 'Failed'}</p>
                <button onclick="location.reload()" class="submit-btn">Return to Dashboard</button>
            </div>
        `;
    }
    
    // Save result to Firebase if available
    if (isFirebaseReady && currentUser && currentUser.uid !== 'admin') {
        saveExamResult(type, score, percentage);
    }
}

async function saveExamResult(type, score, percentage) {
    if (!isFirebaseReady) return;
    
    try {
        const { addDoc, collection, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js');
        await addDoc(collection(window.firebaseDb, 'examResults'), {
            userId: currentUser.uid,
            userName: currentUser.email,
            examType: type,
            score: score,
            percentage: percentage,
            timestamp: serverTimestamp(),
            answers: currentExam ? currentExam.answers : {}
        });
    } catch (error) {
        console.error('Error saving exam result:', error);
    }
}

// Payment Management
function showPaymentModal() {
    const modal = document.getElementById('payment-modal');
    if (modal) modal.classList.remove('hidden');
}

function hidePaymentModal() {
    const modal = document.getElementById('payment-modal');
    if (modal) modal.classList.add('hidden');
}

function showPaymentForm() {
    hidePaymentModal();
    const paymentForm = document.getElementById('payment-form');
    if (paymentForm) paymentForm.classList.remove('hidden');
}

async function handlePaymentSubmission(e) {
    e.preventDefault();
    
    if (!isFirebaseReady) {
        alert('System is not ready. Please try again in a moment.');
        return;
    }
    
    const transactionId = document.getElementById('transaction-id').value;
    const amount = parseFloat(document.getElementById('amount-paid').value);
    
    if (!transactionId || !amount) {
        alert('Please fill in all fields');
        return;
    }
    
    try {
        const { addDoc, collection, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js');
        await addDoc(collection(window.firebaseDb, 'payments'), {
            userId: currentUser.uid,
            userName: currentUser.email,
            transactionId: transactionId,
            amount: amount,
            status: 'pending',
            timestamp: serverTimestamp()
        });
        
        alert('Payment submitted successfully! Admin will verify your payment.');
        const transactionForm = document.getElementById('transaction-form');
        if (transactionForm) transactionForm.reset();
        
        const paymentForm = document.getElementById('payment-form');
        if (paymentForm) paymentForm.classList.add('hidden');
        
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
    
    if (!isFirebaseReady) {
        alert('System is not ready. Please try again in a moment.');
        return;
    }
    
    const username = document.getElementById('new-username').value;
    const fullName = document.getElementById('new-fullname').value;
    const password = document.getElementById('new-password').value;
    const imageFile = document.getElementById('user-image').files[0];
    
    if (!username || !fullName || !password) {
        alert('Please fill in all required fields');
        return;
    }
    
    try {
        const { createUserWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js');
        const { setDoc, doc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js');
        const { ref, uploadBytes, getDownloadURL } = await import('https://www.gstatic.com/firebasejs/12.5.0/firebase-storage.js');
        
        // Create user in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(window.firebaseAuth, username + '@zulumai.com', password);
        const user = userCredential.user;
        
        // Upload image if provided
        let imageUrl = '';
        if (imageFile) {
            const storageRef = ref(window.firebaseStorage, `profile-images/${user.uid}`);
            await uploadBytes(storageRef, imageFile);
            imageUrl = await getDownloadURL(storageRef);
        }
        
        // Save user data to Firestore
        await setDoc(doc(window.firebaseDb, 'users', user.uid), {
            username: username,
            fullName: fullName,
            email: username + '@zulumai.com',
            role: 'student',
            profileImage: imageUrl,
            createdAt: serverTimestamp()
        });
        
        alert('User created successfully!');
        const createUserForm = document.getElementById('create-user-form');
        if (createUserForm) createUserForm.reset();
        loadAdminData();
    } catch (error) {
        alert('Error creating user: ' + error.message);
    }
}

async function toggleExams(e) {
    if (!isFirebaseReady) return;
    
    const enabled = e.target.checked;
    try {
        const { setDoc, doc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js');
        await setDoc(doc(window.firebaseDb, 'settings', 'exams'), {
            enabled: enabled,
            updatedAt: serverTimestamp()
        });
        
        // Show immediate feedback
        const status = enabled ? 'enabled' : 'disabled';
        console.log(`Exams ${status} for all students`);
    } catch (error) {
        console.error('Error updating exam settings:', error);
    }
}

async function toggleCATest(e) {
    if (!isFirebaseReady) return;
    
    const enabled = e.target.checked;
    try {
        const { setDoc, doc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js');
        await setDoc(doc(window.firebaseDb, 'settings', 'caTest'), {
            enabled: enabled,
            updatedAt: serverTimestamp()
        });
        
        // Show immediate feedback
        const status = enabled ? 'enabled' : 'disabled';
        console.log(`C.A Test ${status} for all students`);
    } catch (error) {
        console.error('Error updating CA test settings:', error);
    }
}

// Data Loading Functions
async function loadStudentData() {
    if (!isFirebaseReady) {
        console.log("Firebase not ready, cannot load student data");
        return;
    }
    
    try {
        const { getDoc, doc, collection, query, where, orderBy, getDocs } = await import('https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js');
        
        // Load exam availability
        const examSettingsDoc = await getDoc(doc(window.firebaseDb, 'settings', 'exams'));
        const caSettingsDoc = await getDoc(doc(window.firebaseDb, 'settings', 'caTest'));
        
        if (examSettingsDoc.exists() && examSettingsDoc.data().enabled) {
            const examStatus = document.getElementById('exam-status');
            if (examStatus) {
                examStatus.innerHTML = `
                    <p>Exams are now available. Click the button below to start.</p>
                    <button onclick="startExam('exam')" class="submit-btn">Start Exam</button>
                `;
            }
        }
        
        if (caSettingsDoc.exists() && caSettingsDoc.data().enabled) {
            const caStatus = document.getElementById('ca-status');
            if (caStatus) {
                caStatus.innerHTML = `
                    <p>C.A Test is now available. Click the button below to start.</p>
                    <button onclick="startExam('ca')" class="submit-btn">Start C.A Test</button>
                `;
            }
        }
        
        // Load payment status
        const paymentsQuery = query(
            collection(window.firebaseDb, 'payments'), 
            where('userId', '==', currentUser.uid),
            orderBy('timestamp', 'desc')
        );
        const paymentsSnapshot = await getDocs(paymentsQuery);
        
        if (!paymentsSnapshot.empty) {
            const latestPayment = paymentsSnapshot.docs[0].data();
            const statusElement = document.getElementById('payment-status-content');
            
            if (statusElement) {
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
            }
            
            // Load payment history
            const historyElement = document.getElementById('payment-history-content');
            if (historyElement) {
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
        }
    } catch (error) {
        console.error('Error loading student data:', error);
    }
}

async function loadAdminData() {
    if (!isFirebaseReady) {
        console.log("Firebase not ready, cannot load admin data");
        return;
    }
    
    try {
        const { getDocs, collection, getDoc, doc, query, where, orderBy } = await import('https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js');
        
        // Load users
        const usersSnapshot = await getDocs(collection(window.firebaseDb, 'users'));
        const userList = document.getElementById('user-list');
        if (userList) {
            userList.innerHTML = '';
            
            if (usersSnapshot.empty) {
                userList.innerHTML = '<div class="empty-state"><p>No users created yet. Create your first user above.</p></div>';
            } else {
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
            }
        }
        
        // Load settings
        const examSettingsDoc = await getDoc(doc(window.firebaseDb, 'settings', 'exams'));
        const caSettingsDoc = await getDoc(doc(window.firebaseDb, 'settings', 'caTest'));
        
        const enableExams = document.getElementById('enable-exams');
        const enableCaTest = document.getElementById('enable-ca-test');
        
        if (enableExams && examSettingsDoc.exists()) {
            enableExams.checked = examSettingsDoc.data().enabled;
        }
        
        if (enableCaTest && caSettingsDoc.exists()) {
            enableCaTest.checked = caSettingsDoc.data().enabled;
        }
        
        // Load pending payments
        const pendingPaymentsQuery = query(
            collection(window.firebaseDb, 'payments'),
            where('status', '==', 'pending'),
            orderBy('timestamp', 'desc')
        );
        const pendingPaymentsSnapshot = await getDocs(pendingPaymentsQuery);
        
        const pendingContainer = document.getElementById('pending-payments');
        if (pendingContainer) {
            pendingContainer.innerHTML = '';
            
            if (pendingPaymentsSnapshot.empty) {
                pendingContainer.innerHTML = '<div class="empty-state"><p>No pending payment requests.</p></div>';
            } else {
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
            }
        }
        
        // Load all payments
        const allPaymentsQuery = query(
            collection(window.firebaseDb, 'payments'),
            orderBy('timestamp', 'desc')
        );
        const allPaymentsSnapshot = await getDocs(allPaymentsQuery);
        
        const allPaymentsContainer = document.getElementById('all-payments');
        if (allPaymentsContainer) {
            allPaymentsContainer.innerHTML = '';
            
            if (allPaymentsSnapshot.empty) {
                allPaymentsContainer.innerHTML = '<div class="empty-state"><p>No payment history available.</p></div>';
            } else {
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
            }
        }
    } catch (error) {
        console.error('Error loading admin data:', error);
    }
}

// Admin Action Functions
async function resetExam(userId) {
    if (!isFirebaseReady) {
        alert('System is not ready. Please try again in a moment.');
        return;
    }
    
    try {
        const { query, collection, where, getDocs, deleteDoc } = await import('https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js');
        
        // Delete user's exam results
        const resultsQuery = query(
            collection(window.firebaseDb, 'examResults'),
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
    if (!isFirebaseReady) {
        alert('System is not ready. Please try again in a moment.');
        return;
    }
    
    if (confirm('Are you sure you want to delete this user?')) {
        try {
            const { deleteDoc, doc } = await import('https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js');
            await deleteDoc(doc(window.firebaseDb, 'users', userId));
            alert('User deleted successfully!');
            loadAdminData();
        } catch (error) {
            alert('Error deleting user: ' + error.message);
        }
    }
}

async function confirmPayment(paymentId, status) {
    if (!isFirebaseReady) {
        alert('System is not ready. Please try again in a moment.');
        return;
    }
    
    try {
        const { updateDoc, doc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js');
        await updateDoc(doc(window.firebaseDb, 'payments', paymentId), {
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
    if (!isFirebaseReady) {
        alert('System is not ready. Please try again in a moment.');
        return;
    }
    
    try {
        const { deleteDoc, doc } = await import('https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js');
        await deleteDoc(doc(window.firebaseDb, 'payments', paymentId));
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
        const activeQuestion = document.querySelector('.question-card:not(.hidden)');
        if (activeQuestion) {
            const optionIndex = key.charCodeAt(0) - 97; // a=0, b=1, etc.
            const options = activeQuestion.querySelectorAll('.option');
            if (options[optionIndex]) {
                options[optionIndex].click();
            }
        }
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