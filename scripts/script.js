const DEV_MODE = true;

let locked = false;

let prevDigit = -1;
let lastFingersUp = -1;
let lastFingersUpTime = -1;

let userInput = 0;

const holdMillis = 1000;
const resetMillis = 1500;

// let questionNo = 0;
// const maxQuestions = 5;

let question = "";
let answer = -1;
let score = 0;


function random(low, high) {
    return Math.floor(low + Math.random() * (high - low + 1));
}

function speak(text) {
    const speakData = new SpeechSynthesisUtterance();
    speakData.volume = 1;
    speakData.rate = 0.75;
    speakData.pitch = 1;
    speakData.text = text;
    speakData.lang = "en";
    for (const voice of window.speechSynthesis.getVoices()) {
        if (voice.name === "Eddy (English (UK))") {
            speakData.voice = voice;
            break;
        }
    }
    speechSynthesis.speak(speakData);
}

function generateQuestion() {
    // ++questionNo;
    // document.getElementById("questionNo").innerText = "Question " + questionNo + "/" + maxQuestions;

    let lhs;
    let rhs;
    let tts;

    switch (random(1, 4)) {
        case 1: // Addition
            lhs = random(1, 99);
            rhs = random(1, 100 - lhs);
            question = lhs + " + " + rhs;
            answer = lhs + rhs;
            break;
        case 2: // Subtraction
            lhs = random(2, 99);
            rhs = random(1, lhs - 1);
            question = lhs + " − " + rhs;
            tts = lhs + " minus " + rhs;
            answer = lhs - rhs;
            break;
        case 3: // Multiplication
            lhs = random(1, 50);
            rhs = random(1, Math.floor(100 / lhs));
            question = lhs + " × " + rhs;
            answer = lhs * rhs;
            break;
        case 4: // Division
            rhs = random(1, 10);
            answer = random(1, 10);
            lhs = rhs * answer;
            question = lhs + " ÷ " + rhs;
            answer = lhs / rhs;
            break;
    }

    if (tts === undefined) {
        tts = question;
    }

    document.getElementById("question").innerText = question;
    speak(tts);
}

function checkUserInput() {
    if (userInput === answer) {
        document.getElementById("icon-correct").style.display = "block";

        score++;
        document.getElementById("score").innerText = "Score: " + score;

        new Audio("../audio/correct.wav").play().then();

        locked = true;
        setTimeout(() => {
            document.getElementById("icon-correct").style.display = "none";
            userInput = 0;
            updateInputText();
            generateQuestion();
            locked = false;
        }, 2000);
    } else if (userInput.toString().length >= answer.toString().length) {
        document.getElementById("icon-incorrect").style.display = "block";

        new Audio("../audio/incorrect.wav").play().then();

        locked = true;
        setTimeout(() => {
            document.getElementById("icon-incorrect").style.display = "none";
            userInput = 0;
            updateInputText();
            locked = false;
        }, 2000);
    }
}

function fingersUpOnHand(points) {
    let fingersUp = 0;

    // Thumb
    const thumbTip = points[4];
    const thumbJoint = points[3];
    const thumbBase = points[2];
    const pinkyBase = points[17];

    if (thumbBase.x < pinkyBase.x && thumbTip.x < thumbJoint.x && thumbJoint.x < thumbBase.x)
        ++fingersUp;
    else if (thumbBase.x > pinkyBase.x && thumbTip.x > thumbJoint.x && thumbJoint.x > thumbBase.x)
        ++fingersUp;

    // Non-thumb fingers
    for (let i = 8; i <= 20; i += 4) {
        const up = points[i].y < points[i - 1].y &&
            points[i - 1].y < points[i - 2].y &&
            points[i - 2].y < points[i - 3].y;
        if (up)
            ++fingersUp;
    }

    return fingersUp;
}

function updateInputText() {
    document.getElementById("answer").innerText = userInput;
}

function updateFingersUp(hands) {
    const wrist = hands[0][0];
    const middleTip = hands[0][12];

    if (wrist.y < middleTip.y)
        return;

    let fingersUp = 0;
    for (let hand of hands) {
        fingersUp += fingersUpOnHand(hand);
    }

    if (fingersUp === lastFingersUp) {
        const elapsed = Date.now() - lastFingersUpTime;
        if (fingersUp === 10 && elapsed >= resetMillis) {
            userInput = 0;
            lastFingersUp = -1;
            lastFingersUpTime = Date.now();
            prevDigit = -1;
            updateInputText();
        } else if (fingersUp !== 10 && elapsed >= (fingersUp === prevDigit ? 2 * holdMillis : holdMillis)) {
            document.getElementById("lastSelected").innerText = "last selected: " + fingersUp;
            lastFingersUpTime = Date.now();
            userInput = 10 * userInput + fingersUp;
            prevDigit = fingersUp;
            updateInputText();
            checkUserInput();
        }
    } else {
        lastFingersUp = fingersUp;
        lastFingersUpTime = Date.now();
    }

    document.getElementById("fingersUp").innerText = "fingers up: " + fingersUp;
}

let videoElement;
let canvasElement;
let canvasCtx;

function onResults(results) {
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    if (!DEV_MODE) {
        canvasCtx.scale(-1, 1);
    }
    canvasCtx.drawImage(results.image, 0, 0, (DEV_MODE ? 1 : -1) * canvasElement.width, canvasElement.height);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        if (!locked) {
            updateFingersUp(results.multiHandLandmarks);
        }

        if (DEV_MODE) {
            for (const landmarks of results.multiHandLandmarks) {
                drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {color: '#00FF00', lineWidth: 5});
                drawLandmarks(canvasCtx, landmarks, {color: '#FF0000', lineWidth: 2});
            }
        }
    } else {
        lastFingersUp = -1;
        lastFingersUpTime = Date.now();
    }

    canvasCtx.restore();
}

const hands = new Hands({locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
}});

hands.setOptions({
    maxNumHands: 10,
    modelComplexity: 1,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});
hands.onResults(onResults);

window.addEventListener("load", () => {
    if (DEV_MODE) {
        for (const element of document.getElementsByClassName("dev")) {
            console.log("not in dev mode");
            element.style.display = "block";
        }
    }

    videoElement = document.getElementById("webcam");
    canvasElement = document.getElementById("output_canvas");
    canvasCtx = canvasElement.getContext("2d");

    const camera = new Camera(videoElement, {
        onFrame: async () => {
            await hands.send({image: videoElement});
        },
        width: 1280,
        height: 720
    });

    generateQuestion();
    camera.start();
});
