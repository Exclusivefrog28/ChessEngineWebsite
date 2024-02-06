import {INPUT_EVENT_TYPE, Chessboard, FEN, COLOR, PIECE} from "/src/cm-chessboard/Chessboard.js"
import {MARKER_TYPE, Markers} from "/src/cm-chessboard/extensions/markers/Markers.js"
import {PromotionDialog} from "/src/cm-chessboard/extensions/promotion-dialog/PromotionDialog.js"
import {sigmoid} from "/src/util.js";

const board = new Chessboard(document.getElementById("board"), {
    position: FEN.start,
    assetsUrl: "src/cm-chessboard/assets/",
    style: {pieces: {file: "staunty.svg"}},
    extensions: [{class: PromotionDialog}, {class: Markers}]
})

const engine = new Worker("./src/engine.js")

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
    ttMeter: document.getElementById("ttMeter")
}


let moves = []
let whiteToMove = true

engine.onmessage = function (e) {
    const message = e.data

    switch (message.task) {
        case 'search':
            elements.engineLoading.style.visibility = "hidden"
            elements.engineLoadingBar.style.visibility = "hidden"
            elements.engineLoadingBar.style.transition = "none"
            elements.engineLoadingBar.style.width = "0%"
            board.setPosition(message.fen, true)
            markMove(message.start, message.end)
            whiteToMove = !whiteToMove
            engine.postMessage({task: 'getMoves'})
            engine.postMessage({task: 'eval'})
            break
        case 'eval':
            let score = message.score
            if (!whiteToMove) score *= -1
            const blackAdvantage = score < 0
            const evalBar = document.getElementById("evalBar")
            const evalText = document.getElementById("evalText")
            let whitePercentage = sigmoid(score / 100) * 100;
            evalBar.style.width = `${whitePercentage}%`
            evalText.style.left = `${blackAdvantage ? (whitePercentage + 100) / 2 : whitePercentage / 2}%`
            evalText.style.color = blackAdvantage ? "var(--white)" : "var(--black)"
            evalText.innerHTML = blackAdvantage ? -score : score
            break
        case 'move':
            board.setPosition(message.fen, true)
            whiteToMove = !whiteToMove
            engine.postMessage({task: 'getMoves'})
            engine.postMessage({task: 'eval'})
            break
        case 'getMoves':
            switch (message.state) {
                case 'normal':
                    moves = message.moves
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
            break
        case 'unMakeMove':
            elements.gameResults.style.display = "none"
            board.setPosition(message.fen, true)
            board.removeMarkers(MARKER_TYPE.square)
            whiteToMove = !whiteToMove
            engine.postMessage({task: 'getMoves'})
            engine.postMessage({task: 'eval'})
            break
        case 'setBoardFen':
            whiteToMove = message.sideToMove === 0
            engine.postMessage({task: 'getMoves'})
            engine.postMessage({task: 'eval'})
            break
        case 'perft':
            log(`perft ${message.depth}: ${message.nodes.toLocaleString('fr-FR')} time: ${message.time}ms`)
            break
        case 'ready':
            board.enableMoveInput(inputHandler)
            elements.engineMoveBtn.addEventListener("click", () => {
                elements.engineLoading.style.visibility = "visible"
                elements.engineLoadingBar.style.visibility = "visible"
                elements.engineLoadingBar.style.transition = `all ${1}s ease-in`
                setTimeout(() => elements.engineLoadingBar.style.width = "100%", 1)

                engine.postMessage({task: 'search'})
            })
            elements.unmakeMoveBtn.addEventListener("click", function () {
                engine.postMessage({task: 'unMakeMove'})
            })
            elements.fenBtn.addEventListener("click", function () {
                const fen = elements.fenInput.value
                board.setPosition(fen, true)
                board.removeMarkers(MARKER_TYPE.square)
                engine.postMessage({task: 'setBoardFen', fen: fen})
            })
            elements.perftBtn.addEventListener("click", function () {
                let depth = '7'
                engine.postMessage({task: 'perft', depth: parseInt(depth), fen: board.getPosition()})
            })
            engine.postMessage({task: 'getMoves'})
            engine.postMessage({task: 'eval'})
            break
        case 'updateMeters':
            elements.depthLabel.innerText = message.depth
            elements.depthMeter.setAttribute('stroke-dashoffset', ((Math.min(message.depth, 20) - 20) * (-245 / 20)).toFixed(2))
            const ttPercent = parseInt(message.tt) / (1 << 23)
            elements.ttLabel.innerText = `${(ttPercent * 100).toFixed(0)} %`
            elements.ttMeter.setAttribute('stroke-dashoffset', ((ttPercent - 1) * (-245)).toFixed(2))

    }
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

            if (move.promotionType != 0) {
                board.showPromotionDialog(event.squareTo, (move.player == 0) ? COLOR.white : COLOR.black, (result) => {
                    switch (result.piece) {
                        case PIECE.wn:
                        case PIECE.bn:
                            move.promotionType = 2
                            break
                        case PIECE.wb:
                        case PIECE.bb:
                            move.promotionType = 3
                            break
                        case PIECE.wr:
                        case PIECE.br:
                            move.promotionType = 4
                            break
                        case PIECE.wq:
                        case PIECE.bq:
                            move.promotionType = 5
                            break
                    }
                    engine.postMessage({task: 'move', move: move})
                })
            } else {
                engine.postMessage({task: 'move', move: move})
                break
            }
            return true
        case INPUT_EVENT_TYPE.moveInputCanceled:
            break
    }
}

function markMove(start, end) {
    board.removeMarkers(MARKER_TYPE.square)
    board.addMarker(MARKER_TYPE.square, start)
    board.addMarker(MARKER_TYPE.square, end)
}

const output = document.getElementById("output")

function log(text) {
    const log = document.createElement("div")
    log.innerText = text
    output.appendChild(log)
}