if (typeof importScripts === "function") {
    importScripts('ChessEngine.js')

    Module.onRuntimeInitialized = function () {
        console.log('Module initialized')
        Module.ccall("init")

        postMessage({task: 'ready'})
    }
    self.addEventListener('message', function (e) {

        const message = e.data;

        switch (message.task) {
            case "search": {
                let move = JSON.parse(Module.ccall("getBestMove", 'string', ['number'], [1000]))
                let fen = Module.ccall('move', 'string', ['number', 'number', 'number', 'number', 'number'], [getSquareIndex(move.start), getSquareIndex(move.end), move.flag, move.promotionType, move.player])
                postMessage({task: message.task, fen: fen, start: move.start, end: move.end})
                break;
            }

            case "eval": {
                let score = Module.ccall('eval', 'int')
                postMessage({task: message.task, score: score})
                break;
            }

            case "move": {
                let move = message.move;
                let fen = Module.ccall('move', 'string', ['number', 'number', 'number', 'number', 'number'], [getSquareIndex(move.start), getSquareIndex(move.end), move.flag, move.promotionType, move.player])
                postMessage({task: message.task, fen: fen})
                break;
            }

            case "getMoves": {
                let result = JSON.parse(Module.ccall('getMoves', 'string'))
                postMessage({task: message.task, state: result.state, moves: result.moves})
                break;
            }

            case "unMakeMove": {
                let fen = Module.ccall("unmove", 'string')
                postMessage({task: message.task, fen: fen})
                break;
            }

            case "setBoardFen" : {
                let sideToMove = Module.ccall('setFen', "int", ['string'],[message.fen])
                postMessage({task: message.task, sideToMove: sideToMove})
                break;
            }

            case "perft": {
                let start = new Date().getTime();
                let fen = message.fen;
                let depth = message.depth;
                let nodes = Module.ccall("runPerft", 'number', ['number', 'string'], [depth, fen])
                let end = new Date().getTime();
                postMessage({task: message.task, depth: depth, nodes: nodes, time: end - start})
                break;
            }
        }
    })
}

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


