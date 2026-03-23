"use client";

import { demoPkceRedirectUri } from "@/lib/demo-client";
import { useEffect, useState } from "react";

/** Callback URL after mount (avoids SSR/client mismatch for `window.location.origin`). */
export function useDemoPkceRedirectUri(): string {
  const [uri, setUri] = useState("");
  useEffect(() => {
    setUri(demoPkceRedirectUri());
  }, []);
  return uri;
}
