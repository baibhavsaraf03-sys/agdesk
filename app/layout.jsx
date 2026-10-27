import "./globals.css";

export const metadata = {
  title: "Ag Desk",
  description:
    "Markets, news and the reasoning behind both: 29 world exchanges by session, commodities in depth, sixteen tutorials from zero, and an analyst you can question.",
  manifest: "/manifest.webmanifest"
};

export const viewport = {
  themeColor: "#fbfaf7",
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1
};

/**
 * Applies the saved theme before first paint.
 *
 * Without this the page renders light and then flips to dark a frame later for
 * anyone who chose dark, which looks broken. It has to be inline and
 * synchronous for that reason. Wrapped in try/catch because storage throws in
 * private windows and the page must render regardless.
 */
const THEME_BOOT = `
try {
  var t = localStorage.getItem("agdesk-theme");
  if (t === "dark" || t === "light") document.documentElement.dataset.theme = t;
} catch (e) {}
`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="light">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Serif for reading, sans for interface, mono for figures only. The
            previous build set everything in monospace, which is what made a
            markets publication read as a hacker terminal. */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap"
        />
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
