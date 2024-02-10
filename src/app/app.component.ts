import { AfterViewInit, Component, ViewChild } from '@angular/core';
import * as PIXI from 'pixi.js';
import { Peg } from 'src/models/peg.model';
import { PointContainer } from 'src/models/point-container.model';
import {getRandomNumber } from 'src/helpers/math.helpers';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements AfterViewInit{
  title = 'plinko';
  @ViewChild('canavs') canvas: any;
  canavasHeight: number = 400;
  canavasWidth: number = 800;

  playerScoreBalance: number = 100;
  playCost: number = 10;

  leftPadding: number = 20;
  rightPadding: number = 40;
  topPadding: number = 100;
  bottomPadding: number = 80;
  pointContainerThickness: number = 2;
  pointContainerValues: number[] = [10, 5, 2, 1, 0, 1, 2, 5, 10];
  pegColour: string = 'white';
  containerColour: string = 'gray';
  ballColour: string = 'red';
  allowBallMovement: boolean = true;
  ballObject: PIXI.Graphics = new PIXI.Graphics();

  constructor() {}

  ngAfterViewInit() {
    const app = new PIXI.Application({height: this.canavasHeight, width: this.canavasWidth});
    this.canvas.nativeElement.appendChild(app.view);

    const pegs = this.generatePegs(this.leftPadding, this.canavasWidth - this.rightPadding, this.topPadding, this.canavasHeight - this.bottomPadding, 18, 9, app);
    const pointContainers = this.generatePointContainers(this.canavasHeight, this.canavasWidth, this.pointContainerValues, app);
    this.ballObject = this.generateBall(this.canavasWidth, this.topPadding, app)

    this.renderGame(this.ballObject, pegs, pointContainers, app);
  }

  generatePegs(startXPos: number, endXPos: number, startYPos: number, endYPos: number, numCols: number, numRows: number, canvas: PIXI.Application): Peg[][] {
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
  
    return this.renderPegs(allPegs, canvas);
  }

  renderPegs(allPegs: Peg[][], canvas: PIXI.Application) {
    return allPegs.map(colPegs => {
      return colPegs.map(peg => {
        peg.renderObject.beginFill(this.pegColour)
        .drawCircle(peg.x, peg.y, 5);

        // Add it to the stage to render
        canvas.stage.addChild(peg.renderObject);
        return peg;
      });
    });
  }

  generatePointContainers(canavasHeight: number, canavasWidth: number, pointContainerValues: number[], canvas: PIXI.Application) {
    const containerWidth = canavasWidth / pointContainerValues.length;
    const containerHeight = 40; // Set to a random value I thought would be nice - #TODO replace with constant
    const halfContainerWidth = containerWidth / 2
    
    const pointContainers = pointContainerValues.map((containerValue, index) => new PointContainer(index * containerWidth, containerWidth + (index * containerWidth), canavasHeight - containerHeight, canavasHeight, containerValue, new PIXI.Graphics()));

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

        ballObj.position.set(getRandomNumber(this.leftPadding, canavasWidth - this.rightPadding), 10);

        canvas.stage.addChild(ballObj);
        return ballObj
  }

  renderGame(ballObj: PIXI.Graphics, pegs: Peg[][], pointContainers: PointContainer[], canvas: PIXI.Application) {
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
        let shiftDistance = 10 * (Math.random() < 0.5 ? -1 : 1);
        if(ballObj.position.x + shiftDistance + ballBounds.width <= 0 || ballObj.position.x + shiftDistance + ballBounds.width >= this.canavasWidth)
        {
          shiftDistance = shiftDistance * -1;
        }
        ballObj.position.x = ballObj.position.x + shiftDistance;
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

  scorePlayer(pointContainer: PointContainer) {
    this.playerScoreBalance += pointContainer.value;
  }

  startGame() {
    if(this.playerScoreBalance - this.playCost < 0)
    {
      return;
    }

    this.playerScoreBalance -= this.playCost;
    this.allowBallMovement = true;
    this.ballObject.position.set(getRandomNumber(this.leftPadding, this.canavasWidth - this.rightPadding), getRandomNumber(this.pointContainerThickness, this.topPadding - this.pointContainerThickness));
  }

  //#region PixiJS collision detection methods

  checkCollisionWithPeg(ballObj: PIXI.Graphics, pegs: Peg[][])
  {
    return pegs.some(pgs => {
      return pgs.some(peg => {
        return this.checkCollisionWithObject(ballObj, peg.renderObject);
      });
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
