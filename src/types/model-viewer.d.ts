import type { DetailedHTMLProps, HTMLAttributes } from "react";

declare global {
  interface HTMLModelViewerElement extends HTMLElement {
    src: string;
    cameraOrbit: string;
    loaded?: boolean;
    canActivateAR?: boolean;
    resetTurntableRotation?: () => void;
    jumpCameraToGoal?: () => void;
  }

  namespace React {
    namespace JSX {
      interface IntrinsicElements {
        "model-viewer": DetailedHTMLProps<
          HTMLAttributes<HTMLModelViewerElement>,
          HTMLModelViewerElement
        > & {
          src?: string;
          alt?: string;
          ar?: boolean;
          "ar-modes"?: string;
          "ar-placement"?: "wall" | "floor";
          "ar-scale"?: "auto" | "fixed";
          "camera-controls"?: boolean;
          "camera-orbit"?: string;
          "shadow-intensity"?: string;
          exposure?: string;
          "interaction-prompt"?: "auto" | "none";
          "loading"?: "auto" | "eager" | "lazy";
        };
      }
    }
  }
}

export {};
