let questions;
let currentCategory;
let currentDifficulty = 'easy';
let currentQuestionIndex = 0;
let score = 0;
let answeredQuestions = new Set();
let gameState = {}; // To store the state for each category and difficulty
let timer;
let timeLeft;

const correctSound = new Audio('./audio/correct-sound.wav');
const wrongSound = new Audio('./audio/wrong-sound.mp3');
const congratsSound = new Audio('./audio/congrats-sound.mp3');
const tickSound = new Audio('./audio/tick-sound.mp3');
const timeUpSound = new Audio('./audio/time-up-sound.mp3');

async function fetchQuestions() {
    try {
        const response = await fetch('./questions.json');
        questions = await response.json();
        console.log('Fetched questions:', questions);
    } catch (error) {
        console.error('Failed to fetch questions:', error);
        alert('Failed to fetch questions. Please try again later.');
    }
}

function loadQuestions(category, difficulty) {
    currentCategory = category;
    currentDifficulty = difficulty;
    const stateKey = `${category}-${difficulty}`;
    
    if (gameState[stateKey]) {
        // Restore the previous state
        currentQuestionSet = gameState[stateKey].questions;
        currentQuestionIndex = gameState[stateKey].currentIndex;
        score = gameState[stateKey].score;
        answeredQuestions = new Set(gameState[stateKey].answered);
    } else {
        // Create a new state
        currentQuestionIndex = 0;
        score = 0;
        answeredQuestions.clear();

        let filteredQuestions;
        if (Array.isArray(questions)) {
            filteredQuestions = questions.filter(q =>
                q.category === category && q.difficulty === difficulty
            );
        } else if (typeof questions === 'object') {
            filteredQuestions = Object.values(questions)
                .flat()
                .filter(q => q.category === category && q.difficulty === difficulty);
        } else {
            console.error('Unexpected questions data structure');
            return [];
        }

        currentQuestionSet = filteredQuestions.slice(0, 5);
        gameState[stateKey] = {
            questions: currentQuestionSet,
            currentIndex: 0,
            score: 0,
            answered: []
        };
    }

    return currentQuestionSet;
}

function displayQuestion(question, index) {
    const questionElement = document.querySelector('.question');
    const optionsElement = document.querySelector('.options');

    questionElement.textContent = `Question ${index + 1}: ${question.question}`;
    optionsElement.innerHTML = '';

    question.answers.forEach((answer, i) => {
        const label = document.createElement('label');
        label.innerHTML = `
            <input type="radio" name="answer" value="${i}" ${answeredQuestions.has(index) ? 'disabled' : ''}>
            <span>${answer}</span>
        `;
        optionsElement.appendChild(label);
    });

    if (answeredQuestions.has(index)) {
        const correctIndex = question.answers.indexOf(question.correct_answer);
        optionsElement.children[correctIndex].classList.add('correct');
        if (question.userAnswer !== correctIndex) {
            optionsElement.children[question.userAnswer].classList.add('incorrect');
        }
    } else {
        startTimer();
    }

    updateCircles();
}

function checkAnswer(event) {
    if (answeredQuestions.has(currentQuestionIndex)) return;

    clearInterval(timer);
    const selectedAnswer = event.target;
    if (selectedAnswer.type !== 'radio') return;

    const answerIndex = parseInt(selectedAnswer.value);
    const currentQuestion = getCurrentQuestion();

    answeredQuestions.add(currentQuestionIndex);
    currentQuestion.userAnswer = answerIndex;

    const labels = document.querySelectorAll('.options label');
    labels.forEach(label => label.querySelector('input').disabled = true);

    if (currentQuestion.answers[answerIndex] === currentQuestion.correct_answer) {
        correctSound.play();
        selectedAnswer.parentElement.classList.add('correct');
        score++;
    } else {
        wrongSound.play();
        selectedAnswer.parentElement.classList.add('incorrect');
        labels[currentQuestion.answers.indexOf(currentQuestion.correct_answer)].classList.add('correct');
    }

    updateCircles();
    updateGameState();

    if (answeredQuestions.size === 5) {
        endGame();
    }
}

function endGame() {
    if (answeredQuestions.size === 5) {
        const triviaElement = document.querySelector('.trivia');
        triviaElement.innerHTML += `
            <div class="game-over">
                <h2 style="color:red">Game Over</h2>
                <p>You scored ${score} out of 5</p>
            </div>
        `;

        if (score >= 4) {
            congratsSound.play();
            triviaElement.innerHTML += `
                <div class="congratulations">
                    <h5>Congratulations!</h5>
                    <p>You did great!</p>
                </div>
            `;
        }
    }
}

function clearGameOverMessage() {
    const triviaElement = document.querySelector('.trivia');
    triviaElement.innerHTML = ''; // Clear all content
    triviaElement.innerHTML = `
        <div id="questions">
            <div class="timer">Time left: 10s</div>
            <div class="circle-container">
                <a href="#" class="circle">1</a>
                <a href="#" class="circle">2</a>
                <a href="#" class="circle">3</a>
                <a href="#" class="circle">4</a>
                <a href="#" class="circle">5</a>
            </div>
            <div class="question"></div>
            <div class="options"></div>
        </div>
    `;
    document.querySelector('.options').addEventListener('change', checkAnswer);
    attachCircleEventListeners();
}

function updateCircles() {
    const circles = document.querySelectorAll('.circle');
    circles.forEach((circle, index) => {
        if (answeredQuestions.has(index)) {
            const question = getCurrentQuestionSet()[index];
            const isCorrect = question.answers[question.userAnswer] === question.correct_answer;
            circle.style.backgroundColor = isCorrect ? 'green' : 'red';
        } else {
            circle.style.backgroundColor = index === currentQuestionIndex ? 'blue' : 'black';
        }
    });
}

function getCurrentQuestion() {
    return getCurrentQuestionSet()[currentQuestionIndex];
}

let currentQuestionSet = [];

function getCurrentQuestionSet() {
    return currentQuestionSet;
}

function attachCircleEventListeners() {
    const circles = document.querySelectorAll('.circle');
    circles.forEach((circle, index) => {
        circle.addEventListener('click', (event) => {
            event.preventDefault();
            if (index < currentQuestionSet.length) {
                clearInterval(timer);
                currentQuestionIndex = index;
                displayQuestion(currentQuestionSet[currentQuestionIndex], currentQuestionIndex);
            }
        });
    });
}

function updateGameState() {
    const stateKey = `${currentCategory}-${currentDifficulty}`;
    gameState[stateKey] = {
        questions: currentQuestionSet,
        currentIndex: currentQuestionIndex,
        score: score,
        answered: Array.from(answeredQuestions)
    };
}

function startTimer() {
    timeLeft = 10;
    updateTimerDisplay();
    timer = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();
        if (timeLeft > 0) {
            tickSound.play();
        } else {
            clearInterval(timer);
            timeUpSound.play();
            handleTimeUp();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const timerElement = document.querySelector('.timer');
    if (timerElement) {
        timerElement.textContent = `Time left: ${timeLeft}s`;
        timerElement.style.color = "white";
    } else {
        console.error('Timer element not found.');
    }
}

function handleTimeUp() {
    const currentQuestion = getCurrentQuestion();
    answeredQuestions.add(currentQuestionIndex);
    updateCircles();
    updateGameState();

    const labels = document.querySelectorAll('.options label');
    labels.forEach(label => label.querySelector('input').disabled = true);

    const correctIndex = currentQuestion.answers.indexOf(currentQuestion.correct_answer);
    labels[correctIndex].classList.add('correct');

    // Check if all questions have been answered
    if (answeredQuestions.size === 5) {
        endGame();
    } else {
        // Display score and game over message
        const triviaElement = document.querySelector('.trivia');
        triviaElement.innerHTML += `
            <div class="game-over">
                <h2 style="color:red">Time's Up!</h2>
                <p>You scored ${score} out of 5</p>
            </div>
        `;

        if (score >= 4) {
            congratsSound.play();
            triviaElement.innerHTML += `
                <div class="congratulations">
                    <h3>Congratulations!</h3>
                    <p>You did great!</p>
                </div>
            `;
        }
    }
}

async function initGame() {
    try {
        await fetchQuestions();

        const modal = document.getElementById("myModal");
        const span = document.getElementsByClassName("close")[0];

        const categoryCards = document.querySelectorAll('.card');
        categoryCards.forEach(card => {
            card.addEventListener('click', () => {
                const category = card.querySelector('h1').textContent;
                currentQuestionSet = loadQuestions(category, currentDifficulty);
                if (currentQuestionSet.length > 0) {
                    clearGameOverMessage();
                    displayQuestion(currentQuestionSet[currentQuestionIndex], currentQuestionIndex);
                    modal.style.display = "block";
                } else {
                    alert('No questions available for this category and difficulty.');
                }
            });
        });

        span.onclick = function() {
            modal.style.display = "none";
            clearGameOverMessage();
        };

        window.onclick = function(event) {
            if (event.target == modal) {
                modal.style.display = "none";
                clearGameOverMessage();
            }
        };

        const difficultyButtons = document.querySelectorAll('.difficulty-btn');
        difficultyButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                currentDifficulty = btn.textContent.toLowerCase();
                currentQuestionSet = loadQuestions(currentCategory, currentDifficulty);
                if (currentQuestionSet.length > 0) {
                    clearGameOverMessage();
                    displayQuestion(currentQuestionSet[currentQuestionIndex], currentQuestionIndex);
                } else {
                    alert('No questions available for this category and difficulty.');
                }
            });
        });

        document.querySelector('.options').addEventListener('change', checkAnswer);
        attachCircleEventListeners();

    } catch (error) {
        console.error('Error initializing game:', error);
        alert('There was an error loading the game. Please try again later.');
    }
}

initGame();
