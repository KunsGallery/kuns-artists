"use client";

import { useEffect, useState } from "react";

export type WebXrSupportStatus =
  | "checking"
  | "supported"
  | "unsupported"
  | "insecure"
  | "error";

type WebXrSupportState = {
  status: WebXrSupportStatus;
  message: string;
};

export function useWebXrSupport() {
  const [state, setState] = useState<WebXrSupportState>(() => {
    if (typeof window === "undefined") {
      return {
        status: "checking",
        message: "WebXR 지원을 확인하는 중입니다.",
      };
    }

    if (!window.isSecureContext) {
      return {
        status: "insecure",
        message: "WebXR AR은 HTTPS 또는 localhost 같은 보안 컨텍스트에서만 사용할 수 있습니다.",
      };
    }

    if (!navigator.xr) {
      return {
        status: "unsupported",
        message: "이 브라우저나 기기에서는 immersive-ar 세션을 사용할 수 없습니다.",
      };
    }

    return {
      status: "checking",
      message: "WebXR 지원을 확인하는 중입니다.",
    };
  });

  useEffect(() => {
    let cancelled = false;

    if (state.status !== "checking") {
      return () => {
        cancelled = true;
      };
    }

    const xr = navigator.xr;
    if (!xr) {
      return () => {
        cancelled = true;
      };
    }

    void xr
      .isSessionSupported("immersive-ar")
      .then((supported) => {
        if (cancelled) {
          return;
        }

        setState({
          status: supported ? "supported" : "unsupported",
          message: supported
            ? "WebXR AR을 사용할 수 있습니다."
            : "이 브라우저나 기기에서는 immersive-ar 세션을 사용할 수 없습니다.",
        });
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setState({
          status: "error",
          message: "WebXR 지원 여부를 확인하지 못했습니다.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [state.status]);

  return state;
}
