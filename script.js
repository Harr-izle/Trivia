let questions;
let currentCategory;
let currentDifficulty = 'easy';
let currentQuestionIndex = 0;
let score = 0;
let answeredQuestions = new Set();
let gameState = {};
let timer;
let timeLeft;
let gameStarted = false;

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
        return true;
    } catch (error) {
        console.error('Failed to fetch questions:', error);
        return false;
    }
}

function loadQuestions(category, difficulty) {
    currentCategory = category;
    currentDifficulty = difficulty;
    const stateKey = `${category}-${difficulty}`;
    
    if (gameState[stateKey]) {
        currentQuestionSet = gameState[stateKey].questions;
        currentQuestionIndex = gameState[stateKey].currentIndex;
        score = gameState[stateKey].score;
        answeredQuestions = new Set(gameState[stateKey].answered);
    } else {
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

    if (answeredQuestions.size === currentQuestionSet.length) {
        endGame();
    }

    return currentQuestionSet;
}

function displayQuestion(question, index) {
    const questionElement = document.querySelector('.question');
    const optionsElement = document.querySelector('.options');
    const timerElement = document.querySelector('.timer');
    const startButton = document.querySelector('#startButton');

    questionElement.textContent = `Question ${index + 1}: ${question.question}`;
    optionsElement.innerHTML = '';

    question.answers.forEach((answer, i) => {
        const label = document.createElement('label');
        label.innerHTML = `
            <input type="radio" name="answer" value="${i}" ${answeredQuestions.has(index) || (!gameStarted && index === 0) ? 'disabled' : ''}>
            <span>${answer}</span>
        `;
        label.style.display = 'block';
        label.style.margin = '10px 0';
        label.style.padding = '10px';
        label.style.border = '1px solid #ccc';
        label.style.borderRadius = '5px';
        label.style.cursor = 'pointer';
        
        if (answeredQuestions.has(index)) {
            const correctIndex = question.answers.indexOf(question.correct_answer);
            if (i === correctIndex) {
                label.style.backgroundColor = 'green';
                label.style.color = 'white';
            } else if (i === question.userAnswer && i !== correctIndex) {
                label.style.backgroundColor = 'red';
                label.style.color = 'white';
            }
            label.style.cursor = 'default';
        }
        
        optionsElement.appendChild(label);
    });

    timerElement.style.display = gameStarted && !answeredQuestions.has(index) ? 'block' : 'none';
    startButton.style.display = gameStarted || answeredQuestions.has(index) ? 'none' : 'block';

    updateCircles();
}

function checkAnswer(event) {
    if (answeredQuestions.has(currentQuestionIndex) || (!gameStarted && currentQuestionIndex === 0)) return;

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
    } else {
        currentQuestionIndex++;
        if (currentQuestionIndex < currentQuestionSet.length) {
            displayQuestion(currentQuestionSet[currentQuestionIndex], currentQuestionIndex);
            if (gameStarted) {
                startTimer();
            }
        }
    }
}

function endGame() {
    if (answeredQuestions.size === 5) {
        let modalContent = `
            <div class="game-over-modal-content">
                <span class="close">&times;</span>
                <h2 style="color:red">Game Over</h2>
                <p>You scored ${score} out of 5</p>
        `;

        if (score >= 4) {
            congratsSound.play();
            modalContent += `
                <div class="congratulations">
                    <h5>Congratulations!</h5>
                    <p>You did great!</p>
                </div>
            `;
        }

        modalContent += `
            </div>
        `;

        const gameOverModal = document.createElement('div');
        gameOverModal.id = 'gameOverModal';
        gameOverModal.style.cssText = `
            display: flex;
            justify-content: center;
            align-items: center;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.4);
        `;
        gameOverModal.innerHTML = modalContent;

        const modalContentStyle = `
            background-color: #fefefe;
            padding: 20px;
            border: 1px solid #888;
            width: 300px;
            text-align: center;
            border-radius: 10px;
            position: relative;
        `;

        gameOverModal.querySelector('.game-over-modal-content').style.cssText = modalContentStyle;

        const closeButton = gameOverModal.querySelector('.close');
        closeButton.style.cssText = `
            color: #aaa;
            float: right;
            font-size: 28px;
            font-weight: bold;
            cursor: pointer;
            position: absolute;
            top: 10px;
            right: 10px;
        `;

        document.body.appendChild(gameOverModal);

        closeButton.onclick = function() {
            document.body.removeChild(gameOverModal);
        };

        gameOverModal.onclick = function(event) {
            if (event.target === gameOverModal) {
                document.body.removeChild(gameOverModal);
            }
        };
    }
    gameStarted = false;
}

function clearGameOverMessage() {
    const triviaElement = document.querySelector('.trivia');
    triviaElement.innerHTML = '';
    triviaElement.innerHTML = `
        <div id="questions">
            <div class="timer" style="display: none;">Time left: 30s</div>
            <button id="startButton" style="display: block;">Start</button>
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
    document.querySelector('.options').addEventListener('click', checkAnswer);
    attachCircleEventListeners();
    attachStartButtonListener();
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
                if (gameStarted && !answeredQuestions.has(index)) {
                    startTimer();
                }
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
    timeLeft = 30;
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
    labels.forEach(label => {
        label.querySelector('input').disabled = true;
        label.style.cursor = 'default';
    });

    const correctIndex = currentQuestion.answers.indexOf(currentQuestion.correct_answer);
    labels[correctIndex].style.backgroundColor = 'green';
    labels[correctIndex].style.color = 'white';

    if (answeredQuestions.size === 5) {
        endGame();
    } else {
        currentQuestionIndex++;
        if (currentQuestionIndex < currentQuestionSet.length) {
            displayQuestion(currentQuestionSet[currentQuestionIndex], currentQuestionIndex);
            if (gameStarted) {
                startTimer();
            }
        } else {
            endGame();
        }
    }
}

function stopTimerAndSounds() {
    clearInterval(timer);
    tickSound.pause();
    tickSound.currentTime = 0;
}

function updateDifficultyButtonStyles() {
    const difficultyButtons = document.querySelectorAll('.difficulty-btn');
    difficultyButtons.forEach(btn => {
        if (btn.textContent.toLowerCase() === currentDifficulty) {
            btn.style.backgroundColor = 'green';
            btn.style.color = 'white';
        } else {
            btn.style.backgroundColor = '';
            btn.style.color = '';
        }
    });
}

function attachStartButtonListener() {
    const startButton = document.querySelector('#startButton');
    startButton.addEventListener('click', () => {
        if (!gameStarted) {
            gameStarted = true;
            startButton.style.display = 'none';
            const timerElement = document.querySelector('.timer');
            timerElement.style.display = 'block';
            startTimer();
            const optionInputs = document.querySelectorAll('.options input');
            optionInputs.forEach(input => input.disabled = false);
        }
    });
}

async function initGame() {
    const questionsLoaded = await fetchQuestions();
    
    if (!questionsLoaded) {
        alert('There was an error loading the game. Please try again later.');
        return;
    }

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
                gameStarted = false;
            } else {
                alert('No questions available for this category and difficulty.');
            }
        });
    });

    span.onclick = function() {
        modal.style.display = "none";
        stopTimerAndSounds();
        location.reload();
    };

    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
            stopTimerAndSounds();
            location.reload();
        }
    };

    const difficultyButtons = document.querySelectorAll('.difficulty-btn');
    difficultyButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            currentDifficulty = btn.textContent.toLowerCase();
            updateDifficultyButtonStyles();
            if (currentCategory) {
                currentQuestionSet = loadQuestions(currentCategory, currentDifficulty);
                if (currentQuestionSet.length > 0) {
                    clearGameOverMessage();
                    displayQuestion(currentQuestionSet[currentQuestionIndex], currentQuestionIndex);
                    gameStarted = false;
                } else {
                    alert('No questions available for this category and difficulty.');
                }
            }
        });
    });

    document.querySelector('.options').addEventListener('click', checkAnswer);
    attachCircleEventListeners();
    attachStartButtonListener();

    updateDifficultyButtonStyles();
}

document.addEventListener('DOMContentLoaded', initGame);