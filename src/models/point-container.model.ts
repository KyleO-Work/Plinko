import * as PIXI from 'pixi.js';

export class PointContainer {
    startXPos: number;
    endXPos: number;
    startYPos: number;
    endYPos: number;
    value: number;
    renderObject: PIXI.Graphics;
    textRenderObject: PIXI.Text;

    constructor(startXPos: number, endXPos: number, startYPos: number, endYPos: number, value: number, renderObject: PIXI.Graphics, textRenderObject: PIXI.Text) {
        this.startXPos = startXPos;
        this.endXPos = endXPos;
        this.startYPos = startYPos;
        this.endYPos = endYPos;
        this.value = value;
        this.renderObject = renderObject;
        this.textRenderObject = textRenderObject;
    }
}