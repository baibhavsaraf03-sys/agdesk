import "./globals.css";

export const metadata = {
  title: "Ag Desk Terminal",
  description:
    "An open-access markets terminal: 29 world exchanges by session, agricultural commodities, sixteen tutorials from zero, and an analyst you can question.",
  manifest: "/manifest.webmanifest"
};

export const viewport = {
  themeColor: "#060e0b",
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
