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
  canavasHeightForPyramid: number = 450;
  canavasWidthForPyramid: number = 380;
  chooseBallFallDirectionAtRandom: boolean = false;
  useMatterPhysicsEngine: boolean = false;
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
  expectedPointContainerTextColour: string = 'red';
  pegColour: string = 'white';
  containerColour: string = 'gray';
  ballColour: string = 'red';
  allowBallMovement: boolean = false;
  ballObject: PIXI.Graphics = new PIXI.Graphics();
  lastPegCollision!: Peg;

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
    const canavasHeight = this.chosenLayoutType == LayoutType.Grid ? this.canavasHeightForGrid : this.canavasHeightForPyramid;
    const canavasWidth = this.chosenLayoutType == LayoutType.Grid ? this.canavasWidthForGrid : this.canavasWidthForPyramid;

    const app = new PIXI.Application({height: canavasHeight, width: canavasWidth});
    this.canvas.nativeElement.replaceChildren(app.view);

    const pegs = this.chosenLayoutType == LayoutType.Grid ? this.generateGridPegs(this.leftPadding, canavasWidth - this.rightPadding, this.topPadding, canavasHeight - this.bottomPadding, 18, 12, app) : this.generatePegsVerticalPyramid(10, canavasWidth, app);
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
   * Generates the pegs in a pryamid-like pattern on the given canvas using the given params
   * @param rows The total number of rows of pegs to render
   * @param canvasWidth 
   * @param app 
   * @returns 
   */
  generatePegsVerticalPyramid(rows: any, canvasWidth: number, app: PIXI.Application) {
    const pegRadius = 8;
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

        ballObj.position.set(this.chosenLayoutType == LayoutType.Grid ? getRandomNumber(this.leftPadding, canavasWidth - this.rightPadding) : canavasWidth / 2, startingYPos);

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

    if(this.useMatterPhysicsEngine)
    {
      // Create a Matter.js body for the ball
      this.ballObjectBoundry = Matter.Bodies.circle(ballObj.x, ballObj.y, ballBounds.width / 2, { restitution: 0.9, friction: 0 });
      Matter.World.add(this.engineWorld, this.ballObjectBoundry);

      pegs.forEach(peg => {
        const pegBoundry = Matter.Bodies.circle(peg.x, peg.y, peg.renderObject.getBounds().width / 2 , { isStatic: true });
        Matter.World.add(this.engineWorld, pegBoundry);
      })

      //Matter.Runner.run(this.physicsEngine);
    }

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
      
      if(this.useMatterPhysicsEngine && this.ballObjectBoundry)
      {
        this.renderMatterPhysicsTicker(ballObj, pointContainers, this.ballObjectBoundry);
        return;
      }

      const collidedWithPeg = this.checkCollisionWithPeg(ballObj, pegs);
      if(collidedWithPeg)
      {
        this.lastPegCollision = collidedWithPeg;
        this.applyBallXShift(ballObj, canvas.stage.width);
      }

      this.checkPointContainerCollision(ballObj, pointContainers);

      ballObj.position.y += 1;
    });

    if(this.useMatterPhysicsEngine)
    {
      Matter.Runner.run(this.physicsEngine);
    }
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

  /**
   * Generate a weighted selection to identify which of the point values to select for the ball to land on
   * @param values The list if point values to use for the selection process
   * @returns The index to select the appropriate point container
   */
  weightedRandomSelection(values: number[]) {
    const maxNumberToDisfavour = 4;
    // Calculate total weight based on the inverse of value, favoring values less than 4
    const totalWeight = values.reduce((acc: number, value: number) => acc + (1 / (value + 1)) * (value < maxNumberToDisfavour ? 2 : 0.5), 0);

    // Generate a random number between 0 and totalWeight
    const random = Math.random() * totalWeight;

    // Iterate over the values and select one based on the random number
    let sum = 0;
    for (const [i, value] of values.entries()) {
        sum += (1 / (value + 1)) * (value < maxNumberToDisfavour ? 2 : 0.5);
        
        if (random <= sum) {
            return i;
        }
    }

    // This should never be reached, but in case of some edge cases, return the last value
    return values.length - 1;
  }

  /**
   * Select and return the expected point container for the ball to land into from the list of point containers
   * @returns 
   */
  getExpectedWinningPointContainer() {
    const selectedIndex = this.weightedRandomSelection(this.pointContainerValues);

   return this.pointContainers[selectedIndex];
  }
  
  /**
   * Generates and applies horizontal movement to the given ball object to simulate the ball hitting a peg
   * @param ballObj The ball object to apply the movement onto
   * @param canvasWidth The width of the canvas to ensure the ball doesn't fall off the screen
   */
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

  /**
   * The helper method to set the expect point container if the ball randomness setting is turned off
   * @returns 
   */
  selectExpectedOutcome() {
    if(this.chooseBallFallDirectionAtRandom)
    {
      return;
    }
    
    // If there is an old expected point container then reset its text colour
    if(this.expectedWinningPointContainer)
    {
      this.expectedWinningPointContainer.textRenderObject.style.fill = this.containerColour;
    }

    this.expectedWinningPointContainer = this.getExpectedWinningPointContainer();
    this.expectedWinningPointContainer.textRenderObject.style.fill = this.expectedPointContainerTextColour;
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

    this.selectExpectedOutcome();
    const canavasWidth = this.chosenLayoutType == LayoutType.Grid ? this.canavasWidthForGrid : this.canavasWidthForPyramid;

    this.playerScoreBalance -= this.playCost;
    this.allowBallMovement = true;

    const newXPos = this.chosenLayoutType == LayoutType.Grid ? getRandomNumber(this.leftPadding, canavasWidth - this.rightPadding) : canavasWidth / 2;

    if(this.useMatterPhysicsEngine && this.ballObjectBoundry)
    {
      this.renderCanvas();
      this.allowBallMovement = true;
      return;
    }

    this.ballObject.position.set(newXPos, 10);
    this.allowBallMovement = true;
  }

  /**
   * Changes the layout of the pegs and causes the canvas to re-render said pegs in said layout
   * @param type 
   */
  changeLayout(type: LayoutType) {
    this.chosenLayoutType = type;
    this.renderCanvas();
  }

  /**
   * Change the randomness setting to determine if a predetermined point container is chosen
   * @returns 
   */
  changeRandomness() {
    this.chooseBallFallDirectionAtRandom = !this.chooseBallFallDirectionAtRandom;
  
    if(this.chooseBallFallDirectionAtRandom && this.expectedWinningPointContainer)
    {
      this.expectedWinningPointContainer.textRenderObject.style.fill = this.containerColour;
      this.expectedWinningPointContainer = undefined;
      return;
    }

    this.selectExpectedOutcome();
  }

  /**
   * Changes the physics calculations used to either MatterJs or custom calculations
   */
  changePhysicsCalculations() {
    this.useMatterPhysicsEngine = !this.useMatterPhysicsEngine;
    this.allowBallMovement = false;
    this.renderCanvas();
  }

  //#endregion

  //#region PixiJS collision detection methods

  /**
   * A helper function to check if the ball as collided with a peg
   * @param ballObj The ball object
   * @param pegs An array of pegs to check against
   * @returns The peg (if any) that the ball collided with
   */
  checkCollisionWithPeg(ballObj: PIXI.Graphics, pegs: Peg[])
  {
    return pegs.find(peg => {
      return this.checkCollisionWithObject(ballObj, peg.renderObject) && peg != this.lastPegCollision;
    });
  }

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
