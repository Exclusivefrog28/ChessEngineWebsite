import {INPUT_EVENT_TYPE, Chessboard} from "../src/cm-chessboard/Chessboard.js"
import {FEN} from "../src/cm-chessboard/model/Position.js"
import {MARKER_TYPE, Markers} from "../src/cm-chessboard/extensions/markers/Markers.js"
import {PromotionDialog} from "../src/cm-chessboard/extensions/promotion-dialog/PromotionDialog.js"
import {COLOR, PIECE} from "./src/cm-chessboard/Chessboard.js";

function getSquareIndex(square) {
    const file = square.charCodeAt(0) - 97;
    const rank = 8 - parseInt(square.charAt(1));
    return (rank * 8) + file;
}

function getSquare(index) {
    const file = String.fromCharCode(97 + index % 8);
    const rank = 8 - Math.floor(index / 8);
    return file + rank;
}

window.board = new Chessboard(document.getElementById("board"), {
    position: FEN.start,
    assetsUrl: "../assets/",
    style: {pieces: {file: "staunty.svg"}},
    extensions: [{class: PromotionDialog}, {class: Markers}]
})

function evaluate() {
    let evaluation = Module.ccall('eval', 'int')
    console.log(evaluation)

}

Module.ccall("init")
window.board.enableMoveInput(inputHandler)

document.getElementById("unmake").addEventListener("click", function () {
    let fen = Module.ccall("unmove", 'string')
    window.board.setPosition(fen, true)
    evaluate()
})

document.getElementById("engineMove").addEventListener("click", function () {
    let move = JSON.parse(Module.ccall("getBestMove", 'string', ['number'], [4]))
    let fen = Module.ccall('move', 'string', ['number', 'number', 'number', 'number', 'number'], [getSquareIndex(move.start), getSquareIndex(move.end), move.flag, move.promotionType, move.player])
    window.board.setPosition(fen, true)
    evaluate()
})

document.getElementById("perftButton").addEventListener("click", function () {
    let start = new Date().getTime();
    let depth = document.getElementById("depth").value
    let fen = document.getElementById("fen").value
    let nodes = Module.ccall("runPerft", 'number', ['number', 'string'], [depth, fen])
    let end = new Date().getTime();
    log(`perft ${depth}: ${nodes} time: ${end - start}ms`)
})

let moves;

function inputHandler(event) {
    window.board.removeMarkers(MARKER_TYPE.frame)
    window.board.removeMarkers(MARKER_TYPE.dot)

    switch (event.type) {
        case INPUT_EVENT_TYPE.moveInputStarted:
            moves = JSON.parse(Module.ccall('getMoves', 'string', ['number'], [getSquareIndex(event.square)]))
            for (let i = 0; i < moves.length; i++) {
                window.board.addMarker(MARKER_TYPE.dot, moves[i].end)
            }
            return true
        case INPUT_EVENT_TYPE.validateMoveInput:
            let move
            for (let i = 0; i < moves.length; i++) {
                if (moves[i].end === event.squareTo) {
                    move = moves[i]
                    break
                }
            }

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
                    let fen = Module.ccall('move', 'string', ['number', 'number', 'number', 'number', 'number'], [getSquareIndex(move.start), getSquareIndex(move.end), move.flag, move.promotionType, move.player])
                    window.board.setPosition(fen, true)
                    evaluate()
                })
            } else{
                let fen = Module.ccall('move', 'string', ['number', 'number', 'number', 'number', 'number'], [getSquareIndex(move.start), getSquareIndex(move.end), move.flag, move.promotionType, move.player])
                window.board.setPosition(fen, true)
                evaluate()
                break
            }
            return true
        case INPUT_EVENT_TYPE.moveInputCanceled:
            break
    }
}

const output = document.getElementById("output")

function log(text) {
    const log = document.createElement("div")
    log.innerText = text
    output.appendChild(log)
}