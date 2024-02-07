import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import * as PIXI from 'pixi.js';
import { Peg } from 'src/models/peg.model';
import { PointContainer } from 'src/models/point-container.model';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements AfterViewInit{
  title = 'plinko';
  @ViewChild('canavs') canvas: any;

  leftPadding: number = 40;
  rightPadding: number = 40;
  topPadding: number = 80;
  bottomPadding: number = 80;
  pointContainerValues: number[] = [10, 5, 2, 1, 0, 1, 2, 5, 10];
  pointContainers: PointContainer[] = [];

  constructor() {}

  ngAfterViewInit() {
    const canavasHeight = 400;
    const canavasWidth = 800;

    const app = new PIXI.Application({height: canavasHeight, width: canavasWidth});
    this.canvas.nativeElement.appendChild(app.view);

    const pegs = this.generatePegPositions(this.leftPadding, canavasWidth - this.rightPadding, this.topPadding, canavasHeight - this.bottomPadding, 8, 10);
    this.renderPegs(pegs, app);

    this.renderContainers(canavasHeight, canavasWidth, this.pointContainerValues, app);
  }

  generatePegPositions(startXPos: number, endXPos: number, startYPos: number, endYPos: number, numCols: number, numRows: number): Peg[][] {
    const allPegs = [];
    const xSpacing = (endXPos - startXPos) / (numCols - 1);
    const ySpacing = (endYPos - startYPos) / (numRows - 1);
  
    for (let currRow = 0; currRow < numRows; currRow++) {
      const currentRowPegs = [];
      for (let currCol = 0; currCol < numCols; currCol++) {
        // Shift the starting x pos by half a column for every second row
        const x = startXPos + xSpacing * (currRow % 2 === 0 ? currCol + 0.5 : currCol);
        const y = startYPos + ySpacing * currRow;
        currentRowPegs.push(new Peg(x, y));
      }
      allPegs.push(currentRowPegs);
    }
  
    return allPegs;
  }

  renderPegs(allPegs: Peg[][], canvas: PIXI.Application) {
    allPegs.forEach(colPegs => {
      colPegs.forEach(peg => {
        let obj = new PIXI.Graphics();
        obj.beginFill(0xff0000) // #TODO replace with constant
        .drawCircle(peg.x, peg.y, 5);

        // Add it to the stage to render
        canvas.stage.addChild(obj);
      });
    });
  }

  renderContainers(canavasHeight: number, canavasWidth: number, pointContainerValues: number[], canvas: PIXI.Application) {
    const containerWidth = canavasWidth / pointContainerValues.length;
    const containerHeight = 40; // Set to a random value I thought would be nice - #TODO replace with constant
    const halfContainerWidth = containerWidth / 2
    
    this.pointContainers = pointContainerValues.map((containerValue, index) => new PointContainer(index * containerWidth, containerWidth + (index * containerWidth), canavasHeight - containerHeight, canavasHeight, containerValue));

    this.pointContainers.forEach(container => {
      let containerObj = new PIXI.Graphics();
        containerObj.beginFill("red") // #TODO replace with constant
        .moveTo(container.startXPos, container.startYPos)
        .lineTo(container.startXPos, container.endYPos)
        .lineTo(container.endXPos, container.endYPos)
        .lineTo(container.endXPos, container.startYPos)
        .lineTo(container.endXPos - 5, container.startYPos)
        .lineTo(container.endXPos - 5, container.endYPos - 5)
        .lineTo(container.startXPos + 5, container.endYPos - 5)
        .lineTo(container.startXPos + 5, container.startYPos)
        .lineTo(container.startXPos, container.startYPos)
        .endFill();

        let textObj = new PIXI.Text(`${container.value}`,
          {
            fontFamily: 'Arial',
            fontSize: 24,
            fill: 0xff1010, // #TODO replace with constant
            align: 'center',
        });

        // Need to center align text of the container it is in
        textObj.position.x = container.endXPos - halfContainerWidth - (textObj.width / 2);
        textObj.position.y = container.endYPos - halfContainerWidth;

        // Add it to the stage to render
        canvas.stage.addChild(containerObj);
        canvas.stage.addChild(textObj);
    });
  }
}
