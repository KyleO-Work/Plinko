import { AfterViewInit, Component, ViewChild } from '@angular/core';
import * as PIXI from 'pixi.js';
import * as Matter from 'matter-js';
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
  expectedPointContainerTextColour: string = 'red';
  pegColour: string = 'white';
  containerColour: string = 'gray';
  ballColour: string = 'red';
  allowBallMovement: boolean = false;
  ballObject: PIXI.Graphics = new PIXI.Graphics();

  physicsEngine: Matter.Engine = Matter.Engine.create();
  engineWorld: Matter.World = this.physicsEngine.world;
  ballObjectBoundry!: Matter.Body;

  constructor() {}

  ngAfterViewInit() {
    this.physicsEngine.gravity.y = 0.05;

    this.renderCanvas();
  }

  //#region Game loop logic

  /**
   * Initialized and renders the starting state of the canvas
   */
  renderCanvas() {
    const canavasHeight = this.canavasHeightForGrid;
    const canavasWidth = this.canavasWidthForGrid;

    const app = new PIXI.Application({height: canavasHeight, width: canavasWidth});
    this.canvas.nativeElement.replaceChildren(app.view);

    const pegs = this.generateGridPegs(this.leftPadding, canavasWidth - this.rightPadding, this.topPadding, canavasHeight - this.bottomPadding, 18, 12, app);
    this.pointContainers = this.generatePointContainers(canavasHeight, canavasWidth, this.pointContainerValues, app);
    this.ballObject = this.generateBall(canavasWidth, 10, app);

    this.renderGame(this.ballObject, pegs, this.pointContainers, app);
  }

  /**
   * Generates the pegs in a grid-like pattern on the given canvas using the given params
   * @param startXPos The starting x coordinate to start rendering the pegs
   * @param endXPos The last x coordinate to stop rendering the pegs at
   * @param startYPos The starting y coordinate to start rendering the pegs
   * @param endYPos The last y coordinate to end rendering the pegs at
   * @param numCols The total number of columns of pegs to render
   * @param numRows The total number of rows of pegs to render
   * @param canvas The canvas to render the pegs onto
   * @returns 
   */
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

  /**
   * Renders the given pegs onto the given canvas
   * @param allPegs The array of pegs to render
   * @param canvas The canavs to render the pegs onto
   * @returns 
   */
  renderPegs(allPegs: Peg[], canvas: PIXI.Application) {
    return allPegs.map(peg => {
      peg.renderObject.beginFill(this.pegColour)
      .drawCircle(peg.x, peg.y, 5);

      // Add it to the stage to render
      canvas.stage.addChild(peg.renderObject);
      return peg;
    });
  }

  /**
   * Generates the point container at specific x and y cooredinates and renders them onto the given canvas
   * @param canavasHeight The canavs height
   * @param canavasWidth The canavs width
   * @param pointContainerValues The array of values for the given point containers in the order that they should appear from left to right
   * @param canvas The canvas to render the point containers onto
   * @returns 
   */
  generatePointContainers(canavasHeight: number, canavasWidth: number, pointContainerValues: number[], canvas: PIXI.Application) {
    const containerWidth = canavasWidth / pointContainerValues.length;
    const halfContainerWidth = containerWidth / 2
    
    const pointContainers = pointContainerValues.map((containerValue, index) => new PointContainer(index * containerWidth, containerWidth + (index * containerWidth), canavasHeight - this.pointContainerHeight, canavasHeight, containerValue, new PIXI.Graphics(), new PIXI.Text()));
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

        container.textRenderObject = new PIXI.Text(`${container.value}`,
          {
            fontFamily: 'Arial',
            fontSize: 24,
            fill: this.containerColour,
            align: 'center',
        });

        // Need to center align text of the container it is in
        container.textRenderObject.position.x = container.endXPos - halfContainerWidth - (container.textRenderObject.width / 2);
        container.textRenderObject.position.y = container.endYPos - halfContainerWidth;

        // Add it to the stage to render
        canvas.stage.addChild(container.renderObject);
        canvas.stage.addChild(container.textRenderObject);

        return container;
    });
  }

  /**
   * Generates the ball object onto the given canvas
   * @param canavasWidth The canvas width
   * @param startingYPos The starting y position if the ball
   * @param canvas The canvas to render the ball onto
   * @returns 
   */
  generateBall(canavasWidth: number, startingYPos: number, canvas: PIXI.Application) {
    const ballRadius = 8;
    let ballObj = new PIXI.Graphics();

      ballObj.beginFill(this.ballColour)
        .drawCircle(0, 0, ballRadius); // NB: Setting the anchor positioning of the object affects its position so set it to 0,0 - top left

        ballObj.position.set(getRandomNumber(this.leftPadding, canavasWidth - this.rightPadding), startingYPos);

        canvas.stage.addChild(ballObj);
        return ballObj
  }

  /**
   * Render the gameplaye loop of the ball falling through the pegs and landing inside a point container
   * @param ballObj The ball object to check collisions against
   * @param pegs The pegs to check collisions against
   * @param pointContainers The point containers to check collisions against
   * @param canvas The canvas to add the ticker method handler to
   */
  renderGame(ballObj: PIXI.Graphics, pegs: Peg[], pointContainers: PointContainer[], canvas: PIXI.Application) {
    const ballBounds = ballObj.getBounds();

    // Create a Matter.js body for the ball
    this.ballObjectBoundry = Matter.Bodies.circle(ballObj.x, ballObj.y, ballBounds.width / 2, { restitution: 0.9, friction: 0 });
    Matter.World.add(this.engineWorld, this.ballObjectBoundry);

    pegs.forEach(peg => {
      const pegBoundry = Matter.Bodies.circle(peg.x, peg.y, peg.renderObject.getBounds().width / 2 , { isStatic: true });
      Matter.World.add(this.engineWorld, pegBoundry);
    })

    canvas.ticker.add(() => {

      // Determine if the ball should decend down the stage
      if(!this.allowBallMovement)
      {
        return;
      }

      if(ballObj.position.y + ballBounds.width >= canvas.screen.height - (ballBounds.width / 2))
      {
        return;
      }
      
      if(this.ballObjectBoundry)
      {
        this.renderMatterPhysicsTicker(ballObj, pointContainers, this.ballObjectBoundry);
        return;
      }

      this.checkPointContainerCollision(ballObj, pointContainers);
    });

    Matter.Runner.run(this.physicsEngine);
  }

  /**
   * Renders the logic to move the PIXI ball graphic based on the Matter boundry object
   * @param ballObj 
   * @param pointContainers 
   * @returns 
   */
  renderMatterPhysicsTicker(ballObj: PIXI.Graphics, pointContainers: PointContainer[], boundryBall: Matter.Body) {
    ballObj.position.set(boundryBall.position.x, boundryBall.position.y);

    this.checkPointContainerCollision(ballObj, pointContainers);
    return;
  }

  /**
   * Checks if the given ball object is colliding with at least on of the given point containers
   * @param ballObj The PIXI Grahphics ball object
   * @param pointContainers An array of point containers
   */
  checkPointContainerCollision(ballObj: PIXI.Graphics, pointContainers: PointContainer[])
  {
    const collidingPointContainer = this.checkCollisionWithContainers(ballObj, pointContainers);

    if(collidingPointContainer){
      this.allowBallMovement = false;
      ballObj.position.y = collidingPointContainer.endYPos - this.pointContainerThickness - (ballObj.getBounds().height / 2);
      this.scorePlayer(collidingPointContainer);
    }
  }
  //#endregion


  //#region Player controls

  /**
   * Adjusts the player's score based on the point container the ball landed into
   * @param pointContainer The point container the ball collided with first
   */
  scorePlayer(pointContainer: PointContainer) {
    this.playerScoreBalance += pointContainer.value;
  }

  /**
   * Begins the movement of the ball on the canvas and sets the expected point container that the ball "should" land in
   * (there is a small chance on the grid layout that the ball will not make it into the allocated point container if it starts at a position far enough away from the respective point container)
   * @returns 
   */
  startGame() {
    if(this.playerScoreBalance - this.playCost < 0)
    {
      return;
    }

    this.playerScoreBalance -= this.playCost;
    this.allowBallMovement = true;

    const newXPos = getRandomNumber(this.leftPadding, this.canavasWidthForGrid - this.rightPadding);

    if(this.ballObjectBoundry)
    {
      this.renderCanvas();
      this.allowBallMovement = true;
      return;
    }

    this.ballObject.position.set(newXPos, 10);
    this.allowBallMovement = true;
  }
  
  //#endregion

  //#region PixiJS collision detection methods

  /**
   * A helper function to check if the ball as collided with a point container
   * @param ballObj The ball object
   * @param pointContainers An array of point containers to check against
   * @returns The point container (if any) that the ball collided with
   */
  checkCollisionWithContainers(ballObj: PIXI.Graphics, pointContainers: PointContainer[])
  {
    return pointContainers.find(container => {
      return this.checkCollisionWithObject(ballObj, container.renderObject);
    });
  }

  /**
   * A helper function to check if objectA collided with objectB
   * @param objectA A pixi graphics object
   * @param objectB A pixi graphics object
   * @returns A boolean indicating if a collision is occuring
   */
  checkCollisionWithObject(objectA: PIXI.Graphics, objectB: PIXI.Graphics) {
    const boundsA = objectA.getBounds();
    const boundsB = objectB.getBounds();

    return boundsA.x < boundsB.x + boundsB.width
        && boundsA.x + boundsA.width > boundsB.x
        && boundsA.y < boundsB.y + boundsB.height
        && boundsA.y + boundsA.height > boundsB.y;
  }

  //#endregion
}
