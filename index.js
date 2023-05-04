import {INPUT_EVENT_TYPE, Chessboard} from "/src/cm-chessboard/Chessboard.js"
import {FEN} from "/src/cm-chessboard/model/Position.js"
import {MARKER_TYPE, Markers} from "/src/cm-chessboard/extensions/markers/Markers.js"
import {PromotionDialog} from "/src/cm-chessboard/extensions/promotion-dialog/PromotionDialog.js"
import {COLOR, PIECE} from "/src/cm-chessboard/Chessboard.js";


window.board = new Chessboard(document.getElementById("board"), {
    position: FEN.start,
    assetsUrl: "../assets/",
    style: {pieces: {file: "staunty.svg"}},
    extensions: [{class: PromotionDialog}, {class: Markers}]
})

const perftFENs = [
    FEN.start,
    "r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1",
    "8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1",
    "r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1",
    "rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8",
]

perftFENs.forEach(fen => {
    new Chessboard(document.getElementById("perft" + (perftFENs.indexOf(fen))), {
        position: fen,
        extensions: [{class: Markers}]
    })
})

document.addEventListener('DOMContentLoaded', function() {
    let elems = document.querySelectorAll('.carousel');

    let instances = M.Carousel.init(elems, {
        onCycleTo: function(item) {
            let index = item.childNodes[1].id.slice(-1)
            let fenInput = document.getElementById("fen")
            fenInput.value = perftFENs[index]
        }
    });

});

const engine = new Worker("engine.js")

let moves

engine.onmessage = function (e) {
    const message = e.data

    switch (message.task) {
        case 'search':
            document.getElementById("engineLoading").style.visibility = "hidden"
            window.board.setPosition(message.fen, true)
            markMove(message.start, message.end)
            break
        case 'eval':
            console.log(message.score)
            break
        case 'move':
            window.board.setPosition(message.fen, true)
            break
        case 'getMoves':
            moves = message.moves
            for (let i = 0; i < moves.length; i++) {
                window.board.addMarker(MARKER_TYPE.dot, moves[i].end)
            }
            break
        case 'unMakeMove':
            window.board.setPosition(message.fen, true)
            window.board.removeMarkers(MARKER_TYPE.square)
            break
        case 'perft':
            log(`perft ${message.depth}: ${message.nodes} time: ${message.time}ms`)
            document.getElementById("perftLoading").style.display = "none"
            break
        case 'ready':
            window.board.enableMoveInput(inputHandler)
            document.getElementById("engineMove").addEventListener("click", () => {
                document.getElementById("engineLoading").style.visibility = "visible"
                engine.postMessage({task: 'search'})
            })
            document.getElementById("unmake").addEventListener("click", function () {
                engine.postMessage({task: 'unMakeMove'})
            })
            document.getElementById("perftButton").addEventListener("click", function () {
                document.getElementById("perftLoading").style.display = ""
                let depth = document.getElementById("depth").value
                let fen = document.getElementById("fen").value

                engine.postMessage({task: 'perft', depth: depth, fen: fen})
            })
            break
    }
}

function inputHandler(event) {
    window.board.removeMarkers(MARKER_TYPE.frame)
    window.board.removeMarkers(MARKER_TYPE.dot)

    switch (event.type) {
        case INPUT_EVENT_TYPE.moveInputStarted:

            engine.postMessage({task: 'getMoves', square: event.square})

            return true
        case INPUT_EVENT_TYPE.validateMoveInput:
            let move
            for (let i = 0; i < moves.length; i++) {
                if (moves[i].end === event.squareTo) {
                    move = moves[i]
                    break
                }
            }
            if(move == null) {
                return false
            }

            markMove(event.squareFrom, event.squareTo)

            if (move.promotionType != 0) {
                window.board.showPromotionDialog(event.squareTo, (move.player == 0) ? COLOR.white : COLOR.black, (result) => {
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

function markMove(start, end){
    window.board.removeMarkers(MARKER_TYPE.square)
    window.board.addMarker(MARKER_TYPE.square, start)
    window.board.addMarker(MARKER_TYPE.square, end)
}

const output = document.getElementById("output")

function log(text) {
    const log = document.createElement("div")
    log.innerText = text
    output.appendChild(log)
}