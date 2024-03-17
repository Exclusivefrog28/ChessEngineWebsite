import OrganizedWorker from "./organized-workers.js";
import {Chessboard, COLOR, FEN, INPUT_EVENT_TYPE, PIECE} from "/src/cm-chessboard/Chessboard.js"
import {MARKER_TYPE, Markers} from "/src/cm-chessboard/extensions/markers/Markers.js"
import {PromotionDialog} from "/src/cm-chessboard/extensions/promotion-dialog/PromotionDialog.js"
import {sigmoid} from "/src/util.js";

const board = new Chessboard(document.getElementById("board"), {
    position: FEN.start,
    assetsUrl: "src/cm-chessboard/assets/",
    style: {pieces: {file: "staunty.svg"}},
    extensions: [{class: PromotionDialog}, {class: Markers}]
})
document.getElementById("flip").addEventListener("click", () =>
    board.setOrientation(board.getOrientation() === COLOR.white ? COLOR.black : COLOR.white, true)
)

const engine = new OrganizedWorker("./src/engine.js")

const elements = {
    engineLoading: document.getElementById("engineLoading"),
    engineLoadingBar: document.getElementById("engineLoadingBar"),
    gameResults: document.getElementById("gameResults"),
    winner: document.getElementById("winner"),
    winMethod: document.getElementById("winMethod"),
    engineMoveBtn: document.getElementById("engineMoveBtn"),
    unmakeMoveBtn: document.getElementById("unmakeMoveBtn"),
    fenInput: document.getElementById("fenInput"),
    fenBtn: document.getElementById("fenBtn"),
    perftBtn: document.getElementById("perftBtn"),
    depthLabel: document.getElementById("depthLabel"),
    depthMeter: document.getElementById("depthMeter"),
    ttLabel: document.getElementById("ttLabel"),
    ttMeter: document.getElementById("ttMeter"),
    pvDiv: document.getElementById("pvDiv"),
    pvList: document.getElementById("pvList"),
    log: document.getElementById("log")
}

let moves = []
let whiteToMove = true

engine
    .register('ready', () => {
        updateMoves();
        updateEval();
        board.enableMoveInput(inputHandler)
        elements.engineMoveBtn.addEventListener("click", async () => {
            elements.engineLoading.style.visibility = "visible";
            elements.engineLoadingBar.style.visibility = "visible";
            elements.engineLoadingBar.style.transition = `all ${1}s ease-in`;
            setTimeout(() => elements.engineLoadingBar.style.width = "100%", 1);

            const result = await engine.call('search');

            elements.engineLoading.style.visibility = "hidden";
            elements.engineLoadingBar.style.visibility = "hidden";
            elements.engineLoadingBar.style.transition = "none";
            elements.engineLoadingBar.style.width = "0%";
            board.setPosition(result.fen, true);
            markMove(result.start, result.end);
            handleTurn(true, false);
        })
        elements.unmakeMoveBtn.addEventListener("click", async () => {
            const fen = await engine.call('unMakeMove');
            elements.gameResults.style.display = "none";
            board.setPosition(fen, true);
            handleTurn();
        })
        elements.fenBtn.addEventListener("click", async () => {
            const fen = elements.fenInput.value;
            board.setPosition(fen, true);
            const sideToMove = await engine.call('setBoardFen', fen);
            whiteToMove = sideToMove === 0;
            handleTurn(false, true);

        })
        elements.perftBtn.addEventListener("click", async () => {
            //TODO
        })
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
        elements.pvDiv.style.display = "block";
        const pvMoves = pv.split(" ");
        elements.pvList.innerHTML = "";
        pvMoves.forEach((move) => {
            const li = document.createElement("li");
            li.innerText = move;
            elements.pvList.appendChild(li);
        })
    })
    .register('log', (msg) => {
        console.log(msg);
        const msgParts = msg.split(' ');
        const type = msgParts[0];
        const name = msgParts[1];
        const args = msgParts.slice(2).join(' ');

        const li = document.createElement("li");
        const p =  document.createElement("p");
        const h4 = document.createElement("h4");
        const span1 = document.createElement("span");
        const span2 = document.createElement("span");

        li.className = 'flex flex-row flex-nowrap gap-2';
        span1.innerText = type;
        span2.innerText = name;
        if (type === 'info') span1.className='text-yellow-500';
        h4.appendChild(span1);
        h4.appendChild(span2);
        h4.className = 'flex flex-row flex-nowrap gap-2';
        li.appendChild(h4);
        p.innerText = args;
        p.className = 'text-nowrap';
        li.appendChild(p);
        elements.log.appendChild(li);
    })

const handleTurn = (switchPlayer = true, clearPV = true) => {
    board.removeMarkers(MARKER_TYPE.square);
    board.removeMarkers(MARKER_TYPE.frame);
    updateMoves();
    updateEval();
    whiteToMove = !whiteToMove;
    if (clearPV) elements.pvDiv.style.display = "none";
}


const updateEval = async () => {
    let score = await engine.call('eval');
    if (!whiteToMove) score *= -1
    const blackAdvantage = score < 0
    const evalBar = document.getElementById("evalBar")
    const evalText = document.getElementById("evalText")
    let whitePercentage = sigmoid(score / 100) * 100;
    evalBar.style.width = `${whitePercentage}%`
    evalText.style.left = `${blackAdvantage ? (whitePercentage + 100) / 2 : whitePercentage / 2}%`
    evalText.style.color = blackAdvantage ? "var(--white)" : "var(--black)"
    evalText.innerHTML = blackAdvantage ? -score : score
}

const updateMoves = async () => {
    const result = await engine.call('getMoves')
    switch (result.state) {
        case 'normal':
            moves = result.moves
            break;
        case 'checkmate':
            elements.winner.textContent = whiteToMove ? "Black won!" : "White won!"
            elements.winMethod.textContent = "by checkmate"
            elements.gameResults.style.display = "block"
            break;
        case 'stalemate':
            elements.winner.textContent = "It's a draw!"
            elements.winMethod.textContent = "by stalemate"
            elements.gameResults.style.display = "block"
            break;
    }
}

const makeMove = async (move) => {
    const fen = await engine.call('move', move);
    board.setPosition(fen, true);
    handleTurn();
}

function inputHandler(event) {
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

            markMove(event.squareFrom, event.squareTo)

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

function markMove(start, end) {
    board.removeMarkers(MARKER_TYPE.square)
    board.addMarker(MARKER_TYPE.square, start)
    board.addMarker(MARKER_TYPE.square, end)
}