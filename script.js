// game.js

let questions;
let currentCategory;
let currentDifficulty = 'easy';
let currentQuestionIndex = 0;
let score = 0;
let answeredQuestions = new Set();

const correctSound = new Audio('path/to/correct-sound.mp3');
const wrongSound = new Audio('path/to/wrong-sound.mp3');
const congratsSound = new Audio('path/to/congrats-sound.mp3');

async function fetchQuestions() {
    const response = await fetch('./questions.json');
    questions = await response.json();
    console.log('Fetched questions:', questions);
}

function loadQuestions(category, difficulty) {
    currentCategory = category;
    currentDifficulty = difficulty;
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

    return filteredQuestions.slice(0, 5);
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
    }

    updateCircles();
}

function checkAnswer(event) {
    if (answeredQuestions.has(currentQuestionIndex)) return;

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

    if (answeredQuestions.size === 5) {
        endGame();
    }
}

function endGame() {
    const triviaElement = document.querySelector('.trivia');
    triviaElement.innerHTML += `
        <div class="game-over">
            <h2>Game Over</h2>
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

function getCurrentQuestionSet() {
    return loadQuestions(currentCategory, currentDifficulty);
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
                const loadedQuestions = loadQuestions(category, currentDifficulty);
                if (loadedQuestions.length > 0) {
                    displayQuestion(loadedQuestions[0], 0);
                    modal.style.display = "block";
                } else {
                    alert('No questions available for this category and difficulty.');
                }
            });
        });

        span.onclick = function() {
            modal.style.display = "none";
        }

        window.onclick = function(event) {
            if (event.target == modal) {
                modal.style.display = "none";
            }
        }

        const difficultyButtons = document.querySelectorAll('.difficulty-btn');
        difficultyButtons.forEach(button => {
            button.addEventListener('click', () => {
                currentDifficulty = button.textContent.toLowerCase();
                const loadedQuestions = loadQuestions(currentCategory, currentDifficulty);
                if (loadedQuestions.length > 0) {
                    displayQuestion(loadedQuestions[0], 0);
                } else {
                    alert('No questions available for this category and difficulty.');
                }
            });
        });

        document.querySelector('.options').addEventListener('change', checkAnswer);

        const circles = document.querySelectorAll('.circle');
        circles.forEach((circle, index) => {
            circle.addEventListener('click', () => {
                if (index < getCurrentQuestionSet().length) {
                    currentQuestionIndex = index;
                    displayQuestion(getCurrentQuestion(), currentQuestionIndex);
                }
            });
        });

    } catch (error) {
        console.error('Error initializing game:', error);
        alert('There was an error loading the game. Please try again later.');
    }
}

initGame();