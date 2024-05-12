import OrganizedWorker from "./organized-workers.js";
import {Chessboard, COLOR, FEN, INPUT_EVENT_TYPE, PIECE} from "/src/cm-chessboard/Chessboard.js"
import {MARKER_TYPE, Markers} from "/src/cm-chessboard/extensions/markers/Markers.js"
import {PromotionDialog} from "/src/cm-chessboard/extensions/promotion-dialog/PromotionDialog.js"
import {displayScore, sigmoid} from "/src/util.js";
import {ARROW_TYPE, Arrows} from "/src/cm-chessboard/extensions/arrows/Arrows.js";

const startTime = new Date().getTime();

const board = new Chessboard(document.getElementById("board"), {
    position: FEN.start,
    assetsUrl: "./src/cm-chessboard/assets/",
    style: {pieces: {file: "staunty.svg"}},
    extensions: [{class: PromotionDialog}, {class: Markers}, {class: Arrows}]
})

document.getElementById("flip").addEventListener("click", () =>
    board.setOrientation(board.getOrientation() === COLOR.white ? COLOR.black : COLOR.white, true)
)
document.getElementById("challengeMode").addEventListener("change", async (e) => {
    const elements = document.getElementsByClassName('challenge-affected');
    for (const element of elements) {
        element.dataset.challenge = e.target.checked;
    }
})


const engine = new OrganizedWorker("./src/engine.js")

const elements = {
    splash: document.getElementById("splash"),
    engineLoading: document.getElementById("engineLoading"),
    engineLoadingBar: document.getElementById("engineLoadingBar"),
    gameResults: document.getElementById("gameResults"),
    winner: document.getElementById("winner"),
    winMethod: document.getElementById("winMethod"),
    engineMoveBtn: document.getElementById("engineMoveBtn"),
    unmakeMoveBtn: document.getElementById("unmakeMoveBtn"),
    fenInput: document.getElementById("fenInput"),
    fenBtn: document.getElementById("fenBtn"),
    depthLabel: document.getElementById("depthLabel"),
    depthMeter: document.getElementById("depthMeter"),
    ttLabel: document.getElementById("ttLabel"),
    ttMeter: document.getElementById("ttMeter"),
    pvList: document.getElementById("pvList"),
    log: document.getElementById("log"),
    alwaysSearch: document.getElementById("alwaysSearch"),
    autoWhite: document.getElementById("autoWhite"),
    autoBlack: document.getElementById("autoBlack")
}

let moves = [];
let whiteToMove = true;
let alwaysSearch = false;
let searching = false;

engine
    .register('ready', () => {
        updateMoves();
        updateEval();
        board.enableMoveInput(inputHandler)
        elements.engineMoveBtn.addEventListener("click", async () => {
            playEngineMove();
        })
        elements.unmakeMoveBtn.addEventListener("click", async () => {
            if (alwaysSearch) await stopSearch(0)
            const fen = await engine.call('unMakeMove');
            elements.gameResults.style.display = "none";
            elements.autoWhite.checked = false;
            elements.autoBlack.checked = false;
            board.setPosition(fen, true);
            elements.fenInput.value = fen;
            elements.pvList.innerHTML = "";
            board.removeMarkers(MARKER_TYPE.square);
            await handleTurn(true);
            toggleEngineFeatures(true);
            if (alwaysSearch) await startSearch();
        })
        elements.fenBtn.addEventListener("click", async () => {
            if (alwaysSearch) await stopSearch(0);
            const fen = elements.fenInput.value;
            elements.gameResults.style.display = "none";
            elements.autoWhite.checked = false;
            elements.autoBlack.checked = false;
            board.setPosition(fen, true);
            elements.fenInput.value = fen;
            const sideToMove = await engine.call('setBoardFen', fen);
            whiteToMove = sideToMove === 0;
            elements.pvList.innerHTML = "";
            board.removeMarkers(MARKER_TYPE.square);
            await handleTurn(false);
            toggleEngineFeatures(true);
            if (alwaysSearch) await startSearch();

        })
        elements.alwaysSearch.addEventListener("change", async (e) => {
            alwaysSearch = e.target.checked
            if (e.target.checked) {
                await startSearch();
            } else {
                await stopSearch(0);
            }
        })
        elements.autoWhite.addEventListener("change", async (e) => {
            if (e.target.checked && whiteToMove) playEngineMove()
        })
        elements.autoBlack.addEventListener("change", async (e) => {
            if (e.target.checked && !whiteToMove) playEngineMove()
        })
        elements.splash.style.display = "none";
        log('success', `engine module loaded in ${(new Date().getTime()) - startTime} ms`);
    })
    .register('updateDepth', (depth) => {
        elements.depthLabel.innerText = depth
        elements.depthMeter.setAttribute('stroke-dashoffset', ((Math.min(depth, 20) - 20) * (-209 / 20) + 36).toFixed(2))
    })
    .register('updateTTOccupancy', (tt) => {
        const ttPercent = parseInt(tt) / (1 << 23)
        elements.ttLabel.innerText = `${(ttPercent * 100).toFixed(0)} %`
        elements.ttMeter.setAttribute('stroke-dashoffset', ((ttPercent - 1) * (-209) + 36).toFixed(2))
    })
    .register('updatePV', (pv) => {
        board.removeArrows(ARROW_TYPE.default);
        const pvMoves = pv.split(" ");
        elements.pvList.innerHTML = "";
        pvMoves.forEach((move) => {
            const li = document.createElement("li");
            li.innerText = move;
            elements.pvList.appendChild(li);
        })
        for (let i = 0; i < elements.pvList.children.length; i++) {
            const child = elements.pvList.children[i];
            const move = pvMoves[i];
            child.style.cursor = "pointer";
            child.addEventListener("mouseover", () => {
                board.addArrow(ARROW_TYPE.default, move.substring(0, 2), move.substring(2, 4));
            })
            child.addEventListener("mouseout", () => {
                board.removeArrows(ARROW_TYPE.default);
            })
        }
        elements.pvList.firstChild.addEventListener("click", async () => {
            board.removeArrows(ARROW_TYPE.default);
            makeMove({start: pvMoves[0].substring(0, 2), end: pvMoves[0].substring(2, 4)});
        })
    })
    .register('updateEvaluation', (score) => {
        console.log('updateEvaluation')
        updateEval(-score);
    })
    .register('log', (msg) => {
        const msgParts = msg.split(' ');
        const type = msgParts[0];
        const content = msgParts.slice(1).join(' ');

        log(type, content);
    })

const handleTurn = async (switchPlayer = true) => {
    board.removeMarkers(MARKER_TYPE.frame);
    await updateMoves();
    await updateEval();
    if (switchPlayer) whiteToMove = !whiteToMove;
    decrementPV();
    if ((whiteToMove && elements.autoWhite.checked) || (!whiteToMove && elements.autoBlack.checked)) {
        await playEngineMove()
    }
}

const startSearch = async () => {
    if (searching) return;
    searching = true;
    await engine.call('startSearch');
}

const stopSearch = async (timeOut) => {
    if (!searching) return 0;
    const result = await engine.call('stopSearch', timeOut);
    searching = false;
    return result;
}


const playEngineMove = async () => {
    if (alwaysSearch) await stopSearch(0)

    elements.unmakeMoveBtn.disabled = true;
    elements.fenBtn.disabled = true;
    elements.engineMoveBtn.disabled = true;
    elements.alwaysSearch.disabled = true;

    elements.engineLoading.style.visibility = "visible";
    elements.engineLoadingBar.style.visibility = "visible";
    elements.engineLoadingBar.style.width = "0%";
    let width = 0;
    let interval = setInterval(() => {
        width += 1;
        elements.engineLoadingBar.style.width = `${width}%`
        if (width >= 100) clearInterval(interval);
    }, 10);


    await startSearch();
    const result = await stopSearch(1000);

    clearInterval(interval);
    elements.engineLoading.style.visibility = "hidden";
    elements.engineLoadingBar.style.visibility = "hidden";
    await makeMove(result);

    elements.unmakeMoveBtn.disabled = false;
    elements.fenBtn.disabled = false;
    elements.engineMoveBtn.disabled = false;
    elements.alwaysSearch.disabled = false;
}

const updateEval = async (score = undefined) => {
    if (!score) score = await engine.call('eval');
    if (!whiteToMove) score *= -1;
    const blackAdvantage = score < 0;
    const evalBar = document.getElementById("evalBar");
    const evalText = document.getElementById("evalText");
    let whitePercentage = sigmoid(score / 100) * 100;
    evalBar.style.width = `${whitePercentage}%`;
    evalText.style.left = `${blackAdvantage ? (whitePercentage + 100) / 2 : whitePercentage / 2}%`;
    evalText.style.color = blackAdvantage ? "var(--white)" : "var(--black)";
    evalText.innerHTML = blackAdvantage ? displayScore(-score) : displayScore(score);

}

const updateMoves = async () => {
    const result = await engine.call('getMoves')
    switch (result.state) {
        case 'normal':
            moves = result.moves
            return;
        case 'checkmate':
            elements.winner.textContent = whiteToMove ? "Black won!" : "White won!"
            elements.winMethod.textContent = "by checkmate"
            break;
        case 'stalemate':
            elements.winner.textContent = "It's a draw!"
            elements.winMethod.textContent = "by stalemate"

            break;
    }
    elements.gameResults.style.display = "block"
    elements.autoWhite.checked = false;
    elements.autoBlack.checked = false;
    elements.alwaysSearch.checked = false;
    elements.pvList.innerHTML = "";
    toggleEngineFeatures(false);
}

const makeMove = async (move) => {
    if (alwaysSearch) await stopSearch();
    const fen = await engine.call('move', move);
    board.setPosition(fen, true);
    markMove(move.start, move.end)
    elements.fenInput.value = fen;
    handleTurn(true);
    if (alwaysSearch) await startSearch();
}

const decrementPV = () => {
    if (elements.pvList.children.length === 0) return;
    elements.pvList.removeChild(elements.pvList.firstChild);
    elements.pvList.firstChild.addEventListener("click", async () => {
        const move = elements.pvList.firstChild.innerText;
        board.removeArrows(ARROW_TYPE.default);
        makeMove({start: move.substring(0, 2), end: move.substring(2, 4)});
    })
}

const log = (type, content) => {
    const li = document.createElement("li");
    const p = document.createElement("p");
    const h4 = document.createElement("h4");

    li.className = 'flex flex-row flex-nowrap gap-2 w-max';
    h4.innerText = type;

    switch (type) {
        case 'info':
            h4.className = 'text-yellow-400';
            break;
        case 'success':
            h4.className = 'text-green-400';
            break;
    }

    li.appendChild(h4);
    p.innerText = content;
    p.className = 'text-nowrap whitespace-nowrap';
    li.appendChild(p);
    elements.log.appendChild(li);
    elements.log.parentElement.scrollTop = elements.log.parentElement.scrollHeight;
}

const inputHandler = (event) => {
    board.removeMarkers(MARKER_TYPE.frame)
    board.removeMarkers(MARKER_TYPE.dot)

    switch (event.type) {
        case INPUT_EVENT_TYPE.moveInputStarted:
            for (let i = 0; i < moves.length; i++) {
                if (moves[i].start === event.squareFrom) {
                    board.addMarker(MARKER_TYPE.dot, moves[i].end)
                }
            }

            return true
        case INPUT_EVENT_TYPE.validateMoveInput:
            let move
            for (let i = 0; i < moves.length; i++) {
                if (moves[i].start === event.squareFrom &&
                    moves[i].end === event.squareTo) {
                    move = moves[i]
                    break
                }
            }
            if (move == null) {
                return false
            }

            if (move.promotionType !== "0") {
                board.showPromotionDialog(event.squareTo, (move.player === "0") ? COLOR.white : COLOR.black, (result) => {
                    switch (result.piece) {
                        case PIECE.wn:
                        case PIECE.bn:
                            move.promotionType = 2;
                            break;
                        case PIECE.wb:
                        case PIECE.bb:
                            move.promotionType = 3;
                            break;
                        case PIECE.wr:
                        case PIECE.br:
                            move.promotionType = 4;
                            break;
                        case PIECE.wq:
                        case PIECE.bq:
                            move.promotionType = 5;
                            break;
                    }
                    makeMove(move);
                })
            } else {
                makeMove(move);
                break;
            }
            return true
        case INPUT_EVENT_TYPE.moveInputCanceled:
            break;
    }
}

const markMove = (start, end) => {
    board.removeMarkers(MARKER_TYPE.square)
    board.addMarker(MARKER_TYPE.square, start)
    board.addMarker(MARKER_TYPE.square, end)
}

const toggleEngineFeatures = (on) => {
    elements.engineMoveBtn.disabled = !on;
    elements.alwaysSearch.disabled = !on;
    elements.autoWhite.disabled = !on;
    elements.autoBlack.disabled = !on;
}
