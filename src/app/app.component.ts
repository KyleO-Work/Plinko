import { AfterViewInit, Component, ViewChild } from '@angular/core';
import * as PIXI from 'pixi.js';
import { Peg } from 'src/models/peg.model';
import { PointContainer } from 'src/models/point-container.model';
import {getRandomNumber } from 'src/helpers/math.helpers';
import { LayoutType } from 'src/models/layout-type.model';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements AfterViewInit{
  title = 'plinko';
  @ViewChild('canavs') canvas: any;
  canavasHeightForGrid: number = 400;
  canavasWidthForGrid: number = 800;
  canavasHeightForPyramid: number = 450;
  canavasWidthForPyramid: number = 380;
  chooseBallFallDirectionAtRandom: boolean = false;
  chosenLayoutType: LayoutType = LayoutType.Grid;

  playerScoreBalance: number = 100;
  playCost: number = 10;

  leftPadding: number = 20;
  rightPadding: number = 40;
  topPadding: number = 100;
  bottomPadding: number = 80;
  pointContainerThickness: number = 2;
  pointContainerHeight: number = 40;
  pointContainerValues: number[] = [10, 5, 2, 1, 0, 1, 2, 5, 10];
  pointContainers: PointContainer[] = [];
  expectedWinningPointContainer: PointContainer | undefined;
  pegColour: string = 'white';
  containerColour: string = 'gray';
  ballColour: string = 'red';
  allowBallMovement: boolean = false;
  ballObject: PIXI.Graphics = new PIXI.Graphics();
  lastPegCollision!: Peg;

  constructor() {}

  ngAfterViewInit() {
    this.renderCanvas();
  }

  //#region Game loop logic

  renderCanvas() {
    const canavasHeight = this.chosenLayoutType == LayoutType.Grid ? this.canavasHeightForGrid : this.canavasHeightForPyramid;
    const canavasWidth = this.chosenLayoutType == LayoutType.Grid ? this.canavasWidthForGrid : this.canavasWidthForPyramid;

    const app = new PIXI.Application({height: canavasHeight, width: canavasWidth});
    this.canvas.nativeElement.replaceChildren(app.view);

    const pegs = this.chosenLayoutType == LayoutType.Grid ? this.generateGridPegs(this.leftPadding, canavasWidth - this.rightPadding, this.topPadding, canavasHeight - this.bottomPadding, 18, 12, app) : this.generatePegsVerticalPyramid(10, 8, canavasWidth, app);
    this.pointContainers = this.generatePointContainers(canavasHeight, canavasWidth, this.pointContainerValues, app);

    // Now that the point containers are populated, choose one to predetermine the ball's movement
    this.selectExpectedOutcome();
    this.ballObject = this.generateBall(canavasWidth, this.topPadding, app);

    this.renderGame(this.ballObject, pegs, this.pointContainers, app);
  }

  generateGridPegs(startXPos: number, endXPos: number, startYPos: number, endYPos: number, numCols: number, numRows: number, canvas: PIXI.Application): Peg[] {
    const allPegs = [];
    const xSpacing = (endXPos - startXPos) / (numCols - 1);
    const ySpacing = (endYPos - startYPos) / (numRows - 1);
  
    for (let currRow = 0; currRow < numRows; currRow++) {
      const currentRowPegs = [];
      for (let currCol = 0; currCol < numCols; currCol++) {
        // Shift the starting x pos by half a column for every second row
        const x = startXPos + xSpacing * (currRow % 2 === 0 ? currCol + 0.5 : currCol);
        const y = startYPos + ySpacing * currRow;
        currentRowPegs.push(new Peg(x, y, new PIXI.Graphics()));
      }
      allPegs.push(currentRowPegs);
    }
  
    return this.renderPegs(allPegs.flatMap(x => x), canvas);
  }

  generatePegsVerticalPyramid(rows: any, pegRadius: any, canvasWidth: number, app: PIXI.Application) {
    let pegs = [];
    let spacing = canvasWidth / (rows * 2 + 1);
    let startY = 50;

    for (let i = 0; i < rows; i++) {
        let startX = (canvasWidth - (i * (pegRadius * 2 + spacing))) / 2;

        for (let j = 0; j <= i; j++) {
            const x = startX + j * (pegRadius * 2 + spacing);
            const y = startY + i * (pegRadius * 2 + spacing);
            pegs.push(new Peg(x, y, new PIXI.Graphics()));
        }
    }

    return this.renderPegs(pegs, app);
}

  renderPegs(allPegs: Peg[], canvas: PIXI.Application) {
    return allPegs.map(peg => {
      peg.renderObject.beginFill(this.pegColour)
      .drawCircle(peg.x, peg.y, 5);

      // Add it to the stage to render
      canvas.stage.addChild(peg.renderObject);
      return peg;
    });
  }

  generatePointContainers(canavasHeight: number, canavasWidth: number, pointContainerValues: number[], canvas: PIXI.Application) {
    const containerWidth = canavasWidth / pointContainerValues.length;
    const halfContainerWidth = containerWidth / 2
    
    const pointContainers = pointContainerValues.map((containerValue, index) => new PointContainer(index * containerWidth, containerWidth + (index * containerWidth), canavasHeight - this.pointContainerHeight, canavasHeight, containerValue, new PIXI.Graphics()));

    return pointContainers.map(container => {
      container.renderObject.beginFill(this.containerColour)
        .moveTo(container.startXPos, container.startYPos)
        .lineTo(container.startXPos, container.endYPos)
        .lineTo(container.endXPos, container.endYPos)
        .lineTo(container.endXPos, container.startYPos)
        .lineTo(container.endXPos - this.pointContainerThickness, container.startYPos)
        .lineTo(container.endXPos - this.pointContainerThickness, container.endYPos - this.pointContainerThickness)
        .lineTo(container.startXPos + this.pointContainerThickness, container.endYPos - this.pointContainerThickness)
        .lineTo(container.startXPos + this.pointContainerThickness, container.startYPos)
        .lineTo(container.startXPos, container.startYPos)
        .endFill();

        let textObj = new PIXI.Text(`${container.value}`,
          {
            fontFamily: 'Arial',
            fontSize: 24,
            fill: this.containerColour,
            align: 'center',
        });

        // Need to center align text of the container it is in
        textObj.position.x = container.endXPos - halfContainerWidth - (textObj.width / 2);
        textObj.position.y = container.endYPos - halfContainerWidth;

        // Add it to the stage to render
        canvas.stage.addChild(container.renderObject);
        canvas.stage.addChild(textObj);

        return container;
    });
  }

  generateBall(canavasWidth: number, maxYPos: number, canvas: PIXI.Application) {
    const ballRadius = 8;
    let ballObj = new PIXI.Graphics();

      ballObj.beginFill(this.ballColour)
        .drawCircle(0, 0, ballRadius); // NB: Setting the anchor positioning of the object affects its position so set it to 0,0 - top left

        ballObj.position.set(this.chosenLayoutType == LayoutType.Grid ? getRandomNumber(this.leftPadding, canavasWidth - this.rightPadding) : canavasWidth / 2, 10);

        canvas.stage.addChild(ballObj);
        return ballObj
  }

  renderGame(ballObj: PIXI.Graphics, pegs: Peg[], pointContainers: PointContainer[], canvas: PIXI.Application) {
    const ballBounds = ballObj.getBounds();
    
    canvas.ticker.add((delta) => {

      // Determine if the ball should decend down the stage
      if(!this.allowBallMovement)
      {
        return;
      }

      if(ballObj.position.y + ballBounds.width >= canvas.screen.height - (ballBounds.width / 2))
      {
        return;
      }

      const collidedWithPeg = this.checkCollisionWithPeg(ballObj, pegs);
      if(collidedWithPeg)
      {
        this.lastPegCollision = collidedWithPeg;
        this.applyBallXShift(ballObj, canvas.stage.width);
      }

      const collidingPointContainer = this.checkCollisionWithContainers(ballObj, pointContainers);

      if(collidingPointContainer){
        this.allowBallMovement = false;
        ballObj.position.y = collidingPointContainer.endYPos - this.pointContainerThickness - (ballBounds.height / 2);
        this.scorePlayer(collidingPointContainer);
      }

      ballObj.position.y += 1;
    });
  }

  weightedRandomSelection(values: number[]) {
    // Calculate total weight based on the inverse of value
    const totalWeight = values.reduce((acc: number, value: number) => acc + (1 / (value + 1)), 0);

    // Generate a random number between 0 and totalWeight
    const random = Math.random() * totalWeight;

    // Iterate over the values and select one based on the random number
    let sum = 0;
    for (const [i, value] of values.entries()) {
        sum += 1 / (value + 1);
        if (random <= sum) {
            return i;
        }
    }

    // This should never be reached, but in case of some edge cases, return the last value
    return values.length - 1;
}

  getExpectedWinningPointContainer() {
    const selectedIndex = this.weightedRandomSelection(this.pointContainerValues);

   return this.pointContainers[selectedIndex];
  }
  
  applyBallXShift(ballObj: PIXI.Graphics, canvasWidth: number) {
    let ballBounds = ballObj.getBounds();
    let shiftDistance = ballBounds.width * (Math.random() < 0.5 ? -1 : 1);

    if(!this.chooseBallFallDirectionAtRandom && this.expectedWinningPointContainer != null) {
      const expectedWinningContainerXCenter = this.expectedWinningPointContainer.startXPos + (this.expectedWinningPointContainer.renderObject.getBounds().width / 2)
      if(ballObj.position.x < expectedWinningContainerXCenter)
      {
        shiftDistance = ballBounds.width;
      }
      else if(ballObj.position.x > expectedWinningContainerXCenter)
      {
        shiftDistance = -ballBounds.width;
      }
    }
    
    
    if(ballObj.position.x + shiftDistance + ballBounds.width <= 0 || ballObj.position.x + shiftDistance + ballBounds.width >= canvasWidth)
    {
      shiftDistance = shiftDistance * -1;
    }
    ballObj.position.x = ballObj.position.x + shiftDistance;
  }

  selectExpectedOutcome() {
    if(this.chooseBallFallDirectionAtRandom)
    {
      return;
    }
    
    this.expectedWinningPointContainer = this.getExpectedWinningPointContainer();
  }
  //#endregion


  //#region Player controls

  scorePlayer(pointContainer: PointContainer) {
    this.playerScoreBalance += pointContainer.value;
  }

  startGame() {
    if(this.playerScoreBalance - this.playCost < 0)
    {
      return;
    }

    this.selectExpectedOutcome();
    const canavasWidth = this.chosenLayoutType == LayoutType.Grid ? this.canavasWidthForGrid : this.canavasWidthForPyramid;

    this.playerScoreBalance -= this.playCost;
    this.allowBallMovement = true;
    this.ballObject.position.set(this.chosenLayoutType == LayoutType.Grid ? getRandomNumber(this.leftPadding, canavasWidth - this.rightPadding) : canavasWidth / 2, 10);
  }

  changeLayout(type: LayoutType) {
    this.chosenLayoutType = type;
    this.renderCanvas();
  }

  changeRandomness() {
    this.chooseBallFallDirectionAtRandom = !this.chooseBallFallDirectionAtRandom;
  
    if(this.chooseBallFallDirectionAtRandom)
    {
      this.expectedWinningPointContainer = undefined;
      return;
    }

    this.selectExpectedOutcome();
  }

  //#endregion

  //#region PixiJS collision detection methods

  checkCollisionWithPeg(ballObj: PIXI.Graphics, pegs: Peg[])
  {
    return pegs.find(peg => {
      return this.checkCollisionWithObject(ballObj, peg.renderObject) && peg != this.lastPegCollision;
    });
  }

  checkCollisionWithContainers(ballObj: PIXI.Graphics, pointContainers: PointContainer[])
  {
    return pointContainers.find(container => {
      return this.checkCollisionWithObject(ballObj, container.renderObject);
    });
  }

  checkCollisionWithObject(objectA: PIXI.Graphics, objectB: PIXI.Graphics) {
    const bounds1 = objectA.getBounds();
        const bounds2 = objectB.getBounds();

        return bounds1.x < bounds2.x + bounds2.width
            && bounds1.x + bounds1.width > bounds2.x
            && bounds1.y < bounds2.y + bounds2.height
            && bounds1.y + bounds1.height > bounds2.y;
  }

  //#endregion
}
