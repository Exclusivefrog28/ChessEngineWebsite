import {Manager} from "./organized-workers.js";
import Engine from "./ChessEngine.js"

const manager = new Manager();

Engine().then(function(engine) {
    console.log('Module initialized');
    engine.ccall("init");
    manager.call('ready');

    manager
        .register('search', () => {
            let move = JSON.parse(engine.ccall("getBestMove", 'string', ['number'], [1000]))
            let fen = engine.ccall('move', 'string', ['number', 'number', 'number', 'number', 'number'], [getSquareIndex(move.start), getSquareIndex(move.end), move.flag, move.promotionType, move.player])
            return {fen: fen, start: move.start, end: move.end}
        })
        .register('eval', () => {
            return engine.ccall('eval', 'int')
        })
        .register('move', (move) => {
            return engine.ccall('move', 'string', ['number', 'number', 'number', 'number', 'number'], [getSquareIndex(move.start), getSquareIndex(move.end), move.flag, move.promotionType, move.player])
        })
        .register('getMoves', () => {
            const result = JSON.parse(engine.ccall('getMoves', 'string'))
            return {state: result.state, moves: result.moves}
        })
        .register('unMakeMove', () => {
            return engine.ccall("unmove", 'string')
        })
        .register('setBoardFen', (fen) => {
            return engine.ccall("setFen", "int", ['string'], [fen])
        })
        .register('perft', (fen, depth) => {
            const start = new Date().getTime();
            const nodes = engine.ccall("runPerft", 'number', ['number', 'string'], [depth, fen])
            const end = new Date().getTime();
            return {depth: depth, nodes: nodes, time: end - start}
        })
})

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


