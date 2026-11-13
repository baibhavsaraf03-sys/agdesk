"use client";

/**
 * Installing Ledge Desk as an app (Stage 1, 13 Nov): no app store. Chrome and
 * Edge on Windows, Mac and Android offer a real install prompt, which we hold
 * and fire from our own button. Safari on iPhone and iPad has no prompt, so
 * the button there opens three steps for "Add to Home Screen". Nothing shows
 * once the site is already running as an installed app, or where the browser
 * offers no way to install.
 *
 * The worker (public/sw.js) is registered here on every visit so the offline
 * page works from the first launch; Alerts registers the same file.
 */
import { useEffect, useState } from "react";

function standalone() {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function isIos() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  // iPadOS reports itself as a Mac; a touch screen gives it away.
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

export function useInstall() {
  const [prompt, setPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
    setInstalled(standalone());
    setIos(isIos() && !standalone());
    const onPrompt = (e) => { e.preventDefault(); setPrompt(e); };
    const onInstalled = () => { setInstalled(true); setPrompt(null); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const mode = installed ? null : prompt ? "prompt" : ios ? "ios" : null;
  const install = async () => {
    if (!prompt) return;
    prompt.prompt();
    try {
      const { outcome } = await prompt.userChoice;
      if (outcome === "accepted") setInstalled(true);
    } catch {}
    setPrompt(null);
  };
  return { mode, install };
}

/** The button, plus the iPhone steps it opens. `className` styles the button for where it sits. */
export function InstallButton({ className = "door-new" }) {
  const { mode, install } = useInstall();
  const [steps, setSteps] = useState(false);
  if (!mode) return null;
  return (
    <>
      <button type="button" className={className} onClick={() => (mode === "prompt" ? install() : setSteps(true))}>
        {mode === "ios" ? "Add Ledge Desk to your Home Screen" : "Install the app"}
      </button>
      {steps && (
        <div className="inst-sheet" role="dialog" aria-modal="true" aria-labelledby="inst-sheet-h" onClick={() => setSteps(false)}>
          <div className="inst-sheet-in" onClick={(e) => e.stopPropagation()}>
            <h2 id="inst-sheet-h" className="inst-sheet-h">Add to your Home Screen</h2>
            <div className="inst-sheet-rule" />
            <ol className="inst-sheet-list">
              <li><span>01</span><p>In Safari, tap the <b>Share</b> button: the square with an arrow pointing up.</p></li>
              <li><span>02</span><p>Scroll down and tap <b>Add to Home Screen</b>.</p></li>
              <li><span>03</span><p>Tap <b>Add</b>. Ledge Desk opens full screen from its new icon, and can send you alerts.</p></li>
            </ol>
            <p className="inst-sheet-note">Using Chrome on an iPhone? Open ledgedesk.com in Safari first.</p>
            <button type="button" className="btn pri inst-sheet-btn" onClick={() => setSteps(false)}>Done</button>
          </div>
        </div>
      )}
    </>
  );
}
