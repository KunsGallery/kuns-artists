import type { ArtworkOrientation } from "./types";

const FONT_STACK = 'Arial, "Apple SD Gothic Neo", sans-serif';

function drawCenteredText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  color = "#111111",
  weight = 700,
) {
  context.fillStyle = color;
  context.font = `${weight} ${size}px ${FONT_STACK}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, x, y);
}

function drawArrow(context: CanvasRenderingContext2D, label: string, x: number, y: number, angle: number) {
  context.save();
  context.translate(x, y);
  context.rotate(angle);
  context.strokeStyle = "#111111";
  context.fillStyle = "#111111";
  context.lineWidth = 10;
  context.beginPath();
  context.moveTo(-52, 0);
  context.lineTo(52, 0);
  context.stroke();
  context.beginPath();
  context.moveTo(52, 0);
  context.lineTo(26, -20);
  context.lineTo(26, 20);
  context.closePath();
  context.fill();
  drawCenteredText(context, label, 0, -36, 28);
  context.restore();
}

function drawFixtureCard(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  title: "FRONT" | "BACK",
) {
  context.fillStyle = title === "FRONT" ? "#f4eee3" : "#eee5d4";
  context.fillRect(0, 0, width, height);
  context.strokeStyle = "#111111";
  context.lineWidth = 12;
  context.strokeRect(10, 10, width - 20, height - 20);
  drawCenteredText(context, title, width / 2, 118, 86, "#111111", 800);

  if (title === "FRONT") {
    drawArrow(context, "TOP", width / 2, 218, -Math.PI / 2);
    drawArrow(context, "BOTTOM", width / 2, height - 218, Math.PI / 2);
    drawArrow(context, "LEFT", 180, height / 2, Math.PI);
    drawArrow(context, "RIGHT", width - 180, height / 2, 0);
    drawCenteredText(context, "TOP LEFT", 190, 350, 30, "#111111", 700);
    drawCenteredText(context, "TOP RIGHT", width - 190, 350, 30, "#111111", 700);
    drawCenteredText(context, "BOTTOM LEFT", 190, height - 350, 30, "#111111", 700);
    drawCenteredText(context, "BOTTOM RIGHT", width - 190, height - 350, 30, "#111111", 700);
    drawCenteredText(context, "F", width / 2, height / 2 + 30, 280, "#111111", 800);
  } else {
    drawArrow(context, "TOP", width / 2, 218, -Math.PI / 2);
    drawArrow(context, "LEFT", 180, height / 2, Math.PI);
    drawArrow(context, "RIGHT", width - 180, height / 2, 0);
    drawCenteredText(context, "WORK TITLE TEST", width / 2, 410, 46, "#111111", 800);
    drawCenteredText(context, "ARTIST NAME TEST", width / 2, 500, 38, "#111111", 700);
    drawCenteredText(context, "2026", width / 2, height / 2 + 90, 86, "#111111", 800);
    drawCenteredText(context, "100 × 100 × 3.5 cm", width / 2, height - 170, 34, "#111111", 700);
  }
}

function drawSideFixture(
  context: CanvasRenderingContext2D,
  rect: { width: number; height: number },
  background: string,
  label: string,
) {
  context.fillStyle = background;
  context.fillRect(0, 0, rect.width, rect.height);
  context.strokeStyle = "#111111";
  context.lineWidth = 8;
  context.strokeRect(8, 8, rect.width - 16, rect.height - 16);
  drawCenteredText(context, label, rect.width / 2, rect.height / 2, 28, "#111111", 800);
}

export function applyOrientation(
  context: CanvasRenderingContext2D,
  orientation: ArtworkOrientation,
  draw: () => void,
  centerX: number,
  centerY: number,
  width: number,
  height: number,
) {
  context.save();
  context.translate(centerX, centerY);
  context.rotate((orientation.rotationDeg * Math.PI) / 180);
  context.scale(orientation.flipX ? -1 : 1, orientation.flipY ? -1 : 1);
  draw();
  context.restore();
  void width;
  void height;
}

export function createOrientationFixture(orientation: ArtworkOrientation) {
  if (typeof document === "undefined") {
    throw new Error("Orientation fixture can only be created in a browser.");
  }

  const front = document.createElement("canvas");
  front.width = 1024;
  front.height = 1024;
  const frontContext = front.getContext("2d");
  if (!frontContext) throw new Error("Could not create front fixture context.");
  applyOrientation(
    frontContext,
    orientation,
    () => {
      frontContext.translate(-front.width / 2, -front.height / 2);
      drawFixtureCard(frontContext, front.width, front.height, "FRONT");
    },
    front.width / 2,
    front.height / 2,
    front.width,
    front.height,
  );

  const back = document.createElement("canvas");
  back.width = 1024;
  back.height = 1024;
  const backContext = back.getContext("2d");
  if (!backContext) throw new Error("Could not create back fixture context.");
  drawFixtureCard(backContext, back.width, back.height, "BACK");

  const sides = {
    left: createSideCanvas("#ef4b45", "LEFT OUTSIDE"),
    right: createSideCanvas("#46b96b", "RIGHT OUTSIDE"),
    top: createSideCanvas("#4f86ed", "TOP OUTSIDE"),
    bottom: createSideCanvas("#f0c94d", "BOTTOM OUTSIDE"),
  };

  return { front, back, ...sides };
}

function createSideCanvas(background: string, label: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  if (!context) throw new Error(`Could not create ${label} fixture context.`);
  drawSideFixture(context, canvas, background, label);
  return canvas;
}
