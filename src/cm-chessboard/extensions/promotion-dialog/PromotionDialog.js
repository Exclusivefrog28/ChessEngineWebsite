/**
 * Author and copyright: Stefan Haack (https://shaack.com)
 * Repository: https://github.com/shaack/cm-chessboard
 * License: MIT, see file 'LICENSE'
 */
import {Extension, EXTENSION_POINT} from "../../model/Extension.js"
import {COLOR, PIECE} from "../../Chessboard.js"
import {Svg} from "../../lib/Svg.js"
import {Utils} from "../../lib/Utils.js"
import {ANIMATION_EVENT_TYPE} from "../../view/PositionAnimationsQueue.js"

const DISPLAY_STATE = {
    hidden: "hidden",
    displayRequested: "displayRequested",
    shown: "shown"
}

export class PromotionDialog extends Extension {

    constructor(chessboard, props = {}) {
        super(chessboard, props)
        this.registerExtensionPoint(EXTENSION_POINT.redrawBoard, this.extensionPointRedrawBoard.bind(this))
        this.registerExtensionPoint(EXTENSION_POINT.animation, this.extensionPointAnimation.bind(this))
        this.registerMethod("showPromotionDialog", this.showPromotionDialog)
        this.promotionDialogGroup = Svg.addElement(chessboard.view.markersTopLayer, "g", {class: "promotion-dialog-group"})
        this.state = {
            displayState: DISPLAY_STATE.hidden,
            callback: undefined,
            dialogParams: {
                square: undefined,
                color: undefined
            }
        }
    }

    // public (registerMethod)
    showPromotionDialog(square, color, callback) {
        this.state.dialogParams.square = square
        this.state.dialogParams.color = color
        this.state.callback = callback
        this.setDisplayState(DISPLAY_STATE.displayRequested)
    }

    // private
    extensionPointRedrawBoard() {
        this.redrawDialog()
    }

    extensionPointAnimation(event) {
        if (event.type === ANIMATION_EVENT_TYPE.end) {
            if (this.state.displayState === DISPLAY_STATE.displayRequested) {
                this.setDisplayState(DISPLAY_STATE.shown)
            }
        }
    }


    drawPieceButton(piece, point) {
        const squareWidth = this.chessboard.view.squareWidth
        const squareHeight = this.chessboard.view.squareHeight
        Svg.addElement(this.promotionDialogGroup,
            "rect", {
                x: point.x, y: point.y, width: squareWidth, height: squareHeight,
                class: "promotion-dialog-button",
                "data-piece": piece
            })
        this.chessboard.view.drawPiece(this.promotionDialogGroup, piece, point)
    }

    redrawDialog() {
        while (this.promotionDialogGroup.firstChild) {
            this.promotionDialogGroup.removeChild(this.promotionDialogGroup.firstChild)
        }
        if (this.state.displayState === DISPLAY_STATE.shown) {
            const squareWidth = this.chessboard.view.squareWidth
            const squareHeight = this.chessboard.view.squareHeight
            const squareCenterPoint = this.chessboard.view.squareToPoint(this.state.dialogParams.square)
            squareCenterPoint.x = squareCenterPoint.x + squareWidth / 2
            squareCenterPoint.y = squareCenterPoint.y + squareHeight / 2
            let turned = false
            const rank = parseInt(this.state.dialogParams.square.charAt(1), 10)
            if (this.chessboard.getOrientation() === COLOR.white && rank < 5 ||
                this.chessboard.getOrientation() === COLOR.black && rank >= 5) {
                turned = true
            }
            const offsetY = turned ? -4 * squareHeight : 0
            const offsetX = squareCenterPoint.x + squareWidth > this.chessboard.view.width ? -squareWidth : 0
            Svg.addElement(this.promotionDialogGroup,
                "rect", {
                    x: squareCenterPoint.x + offsetX,
                    y: squareCenterPoint.y + offsetY,
                    width: squareWidth,
                    height: squareHeight * 4,
                    class: "promotion-dialog"
                })
            const dialogParams = this.state.dialogParams
            if (turned) {
                this.drawPieceButton(PIECE[dialogParams.color + "q"], {
                    x: squareCenterPoint.x + offsetX,
                    y: squareCenterPoint.y - squareHeight
                })
                this.drawPieceButton(PIECE[dialogParams.color + "r"], {
                    x: squareCenterPoint.x + offsetX,
                    y: squareCenterPoint.y - squareHeight * 2
                })
                this.drawPieceButton(PIECE[dialogParams.color + "b"], {
                    x: squareCenterPoint.x + offsetX,
                    y: squareCenterPoint.y - squareHeight * 3
                })
                this.drawPieceButton(PIECE[dialogParams.color + "n"], {
                    x: squareCenterPoint.x + offsetX,
                    y: squareCenterPoint.y - squareHeight * 4
                })
            } else {
                this.drawPieceButton(PIECE[dialogParams.color + "q"], {
                    x: squareCenterPoint.x + offsetX,
                    y: squareCenterPoint.y
                })
                this.drawPieceButton(PIECE[dialogParams.color + "r"], {
                    x: squareCenterPoint.x + offsetX,
                    y: squareCenterPoint.y + squareHeight
                })
                this.drawPieceButton(PIECE[dialogParams.color + "b"], {
                    x: squareCenterPoint.x + offsetX,
                    y: squareCenterPoint.y + squareHeight * 2
                })
                this.drawPieceButton(PIECE[dialogParams.color + "n"], {
                    x: squareCenterPoint.x + offsetX,
                    y: squareCenterPoint.y + squareHeight * 3
                })
            }
        }
    }

    promotionDialogOnClickPiece(event) {
        if(event.button !== 2) {
            if (event.target.dataset.piece) {
                this.state.callback({square: this.state.dialogParams.square, piece: event.target.dataset.piece})
                this.setDisplayState(DISPLAY_STATE.hidden)
            } else {
                this.promotionDialogOnCancel(event)
            }
        }
    }

    promotionDialogOnCancel(event) {
        if(this.state.displayState === DISPLAY_STATE.shown) {
            event.preventDefault()
            this.setDisplayState(DISPLAY_STATE.hidden)
            this.state.callback({square: this.state.square, piece: null})
        }
    }

    contextMenu(event) {
        event.preventDefault()
        this.setDisplayState(DISPLAY_STATE.hidden)
        this.state.callback({square: this.state.square, piece: null})
    }

    setDisplayState(displayState) {
        this.state.displayState = displayState
        if(displayState === DISPLAY_STATE.shown) {
            this.clickDelegate = Utils.delegate(this.chessboard.view.svg,
                "mousedown",
                "*",
                this.promotionDialogOnClickPiece.bind(this))
            this.contextMenuListener = this.contextMenu.bind(this)
            this.chessboard.view.svg.addEventListener("contextmenu", this.contextMenuListener)
        } else if(displayState === DISPLAY_STATE.hidden) {
            this.clickDelegate.remove()
            this.chessboard.view.svg.removeEventListener("contextmenu", this.contextMenuListener)
        }
        this.redrawDialog()
    }

}
