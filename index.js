import {INPUT_EVENT_TYPE, Chessboard} from "../src/cm-chessboard/Chessboard.js"
import {FEN} from "../src/cm-chessboard/model/Position.js"
import {MARKER_TYPE, Markers} from "../src/cm-chessboard/extensions/markers/Markers.js"

function getSquareIndex(square) {
    const file = square.charCodeAt(0) - 97; // convert file letter to index (a = 0, b = 1, etc.)
    const rank = 8 - parseInt(square.charAt(1)); // convert rank number to index (1 = 7, 2 = 6, etc.)
    return (rank * 8) + file; // calculate square index (files are numbered left to right, ranks are numbered from top to bottom)
}
function getSquare(index) {
    const file = String.fromCharCode(97 + index % 8);
    const rank = 8 - Math.floor(index / 8);
    return file + rank;
}

function showAttacks(){
    let attacks = Module.ccall('getAttacks', 'string').split(" ")
    for (let i = 0; i < attacks.length; i++) {
        window.board.addMarker(MARKER_TYPE.circleDanger, attacks[i])
    }
}

Module.ccall("init")

window.board = new Chessboard(document.getElementById("board"), {
    position: FEN.start,
    assetsUrl: "../assets/",
    style: {pieces: {file: "staunty.svg"}},
    extensions: [{class: Markers}]
})

showAttacks()
window.board.enableMoveInput(inputHandler)

document.getElementById("unmake").addEventListener("click", function () {
    let fen = Module.ccall("unmove", 'string')
    window.board.setPosition(fen, false)
    console.log(Module.ccall('listPieces', 'string'))
})

let moves;
function inputHandler(event) {
    console.log(event)
    window.board.removeMarkers(MARKER_TYPE.frame)
    window.board.removeMarkers(MARKER_TYPE.dot)

    switch (event.type) {
        case INPUT_EVENT_TYPE.moveInputStarted:
            moves = JSON.parse(Module.ccall('getMoves', 'string', ['number'], [getSquareIndex(event.square)]))
            for (let i = 0; i < moves.length; i++) {
                window.board.addMarker(MARKER_TYPE.dot, moves[i].end)
            }
            log(`moveInputStarted: ${event.square}, moves: ${JSON.stringify(moves)}`)
            return true
        case INPUT_EVENT_TYPE.validateMoveInput:
            let move
            for (let i = 0; i < moves.length; i++) {
                if(moves[i].end === event.squareTo){
                    move = moves[i]
                    break
                }
            }
            let fen = Module.ccall('move', 'string', ['number', 'number', 'number', 'number', 'number'], [getSquareIndex(move.start), getSquareIndex(move.end), move.flag, move.promotionType, move.player])
            window.board.setPosition(fen, false)
            window.board.removeMarkers(MARKER_TYPE.circleDanger)
            showAttacks()
            log(`${event.squareFrom}-${event.squareTo} ${fen}`)
            break
        case INPUT_EVENT_TYPE.moveInputCanceled:
            log(`moveInputCanceled`)
            break
    }
}

const output = document.getElementById("output")

function log(text) {
    const log = document.createElement("div")
    log.innerText = text
    output.appendChild(log)
}