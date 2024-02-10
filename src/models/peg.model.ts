import * as PIXI from 'pixi.js';

export class Peg {
    x: number;
    y: number;
    renderObject: PIXI.Graphics;

    constructor(x: number, y: number, renderObject: PIXI.Graphics) {
        this.x = x;
        this.y = y;
        this.renderObject = renderObject;
    }
}