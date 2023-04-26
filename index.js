import {INPUT_EVENT_TYPE, Chessboard} from "../src/cm-chessboard/Chessboard.js"
import {FEN} from "../src/cm-chessboard/model/Position.js"
import {MARKER_TYPE, Markers} from "../src/cm-chessboard/extensions/markers/Markers.js"

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
    extensions: [{class: Markers}]
})

function showAttacks(){
    window.board.removeMarkers(MARKER_TYPE.circleDanger)
    let attacks = Module.ccall('getAttacks', 'string').split(" ")
    for (let i = 0; i < attacks.length; i++) {
        window.board.addMarker(MARKER_TYPE.circleDanger, attacks[i])
    }
}

Module.ccall("init")
showAttacks()
window.board.enableMoveInput(inputHandler)

document.getElementById("unmake").addEventListener("click", function () {
    let fen = Module.ccall("unmove", 'string')
    window.board.setPosition(fen, false)
    showAttacks()
})

document.getElementById("perftButton").addEventListener("click", function () {
    let start = new Date().getTime();
    let depth = document.getElementById("depth").value
    let fen = document.getElementById("fen").value
    let nodes = Module.ccall("runPerft", 'number', ['number','string'], [depth,fen])
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
                if(moves[i].end === event.squareTo){
                    move = moves[i]
                    break
                }
            }
            let fen = Module.ccall('move', 'string', ['number', 'number', 'number', 'number', 'number'], [getSquareIndex(move.start), getSquareIndex(move.end), move.flag, move.promotionType, move.player])
            window.board.setPosition(fen, false)
            showAttacks()
            break
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