import "./globals.css";

export const metadata = {
  // Makes the canonical and social-card addresses on the reading pages absolute.
  metadataBase: new URL((process.env.NEXT_PUBLIC_SITE_URL || "https://ledgedesk.com").replace(/\/+$/, "")),
  title: "Ledge Desk",
  description:
    "Markets, news and the reasoning behind both: 29 world exchanges by session, commodities in depth, sixteen tutorials from zero, and an analyst you can question.",
  manifest: "/manifest.webmanifest",
  // Today's card (drawn by app/card/route.jsx) is the preview wherever a link
  // to the desk is pasted. Reading pages that set their own image keep it.
  openGraph: { siteName: "Ledge Desk", type: "website", images: [{ url: "/card?format=og", width: 1200, height: 630, alt: "Ledge Desk: today's market mood, brief and figures" }] },
  twitter: { card: "summary_large_image", images: ["/card?format=og"] },
  // iPhones use this icon on the home screen, which is also what lets them
  // receive the site's alert notifications.
  icons: { icon: "/icon.svg", apple: "/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "Ledge Desk", statusBarStyle: "black" }
};

export const viewport = {
  themeColor: "#000000",
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1
};

/**
 * Applies the saved theme before first paint.
 *
 * Noir (dark) is the default since 12 Nov; only an explicit choice of light
 * is applied here. Without this the page would render dark and flip to light
 * a frame later for anyone who chose light, which looks broken. It has to be inline and
 * synchronous for that reason. Wrapped in try/catch because storage throws in
 * private windows and the page must render regardless.
 */
const THEME_BOOT = `
try {
  var t = localStorage.getItem("agdesk-theme");
  if (t === "light") document.documentElement.dataset.theme = "light";
} catch (e) {}
`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Noir (the default): Doto for instruments and clocks, Geist for the
            interface, Cormorant Garamond for headings, Source Serif for
            reading. Inter and Plex Mono serve the light theme. */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&family=Doto:wght@700;900&family=Geist:wght@300;400;500;600&family=Geist+Mono:wght@400;500&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,300;1,400&display=swap"
        />
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
