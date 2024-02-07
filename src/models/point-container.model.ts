export class PointContainer {
    startXPos: number;
    endXPos: number;
    startYPos: number;
    endYPos: number;
    value: number;

    constructor(startXPos: number, endXPos: number, startYPos: number, endYPos: number, value: number) {
        this.startXPos = startXPos;
        this.endXPos = endXPos;
        this.startYPos = startYPos;
        this.endYPos = endYPos;
        this.value = value;
    }
}