let lastFingersUp = -1;
let lastFingersUpTime = -1;

let buildingNum = 0;

const holdMillis = 1000;
const resetMillis = 3000;

let questionNo = 0;
let score = 0;
let question = "";
let answer = -1;

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

function updateFingersUp(hands) {
    const wrist = hands[0][0];
    const middleTip = hands[0][12];

    if (wrist.y < middleTip.y)
        return;

    const x = Math.round(100 * wrist.x) / 100;
    const y = Math.round(100 * wrist.y) / 100;
    const z = wrist.z;
    console.log("x: " + x + " y: " + y + " z: " + z);

    let fingersUp = 0;
    for (let hand of hands) {
        fingersUp += fingersUpOnHand(hand);
    }

    if (fingersUp === lastFingersUp) {
        const elapsed = Date.now() - lastFingersUpTime;
        if (fingersUp === 10 && elapsed >= resetMillis) {
            buildingNum = 0;
            lastFingersUp = -1;
            lastFingersUpTime = Date.now();
        } else if (fingersUp !== 10 && elapsed >= holdMillis) {
            document.getElementById("lastSelected").innerText = "last selected: " + fingersUp;
            lastFingersUpTime = Date.now();
            buildingNum = 10 * buildingNum + fingersUp;
        }
        document.getElementById("selection").innerText = "selection: " + buildingNum;
    } else {
        lastFingersUp = fingersUp;
        lastFingersUpTime = Date.now();
    }

    document.getElementById("fingersUp").innerText = "fingers up: " + fingersUp;
}

let videoElement;
// let canvasElement;
// let canvasCtx;

function onResults(results) {
    // canvasCtx.save();
    // canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    // canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        updateFingersUp(results.multiHandLandmarks);

        // for (const landmarks of results.multiHandLandmarks) {
        //     drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {color: '#00FF00', lineWidth: 5});
        //     drawLandmarks(canvasCtx, landmarks, {color: '#FF0000', lineWidth: 2});
        // }
    }

    // canvasCtx.restore();
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
    videoElement = document.getElementsByClassName('webcam')[0];

    const camera = new Camera(videoElement, {
        onFrame: async () => {
            await hands.send({image: videoElement});
        },
        width: 1280,
        height: 720
    });

    camera.start();
});
