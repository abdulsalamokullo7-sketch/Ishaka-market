import "./globals.css";
import dynamic from "next/dynamic";
import BackButton from "../components/BackButton";

const NavBar = dynamic(() => import("../components/NavBar"), {
  ssr: true,
  loading: () => <header className="sticky top-0 z-30 h-14 border-b border-emerald-100/80 bg-white/90" aria-hidden />
});

export const metadata = {
  title: "Ishaka Market Hub",
  description: "Local market and logistics platform for Ishaka",
  icons: {
    icon: "/icon.svg"
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <NavBar />
        <BackButton />
        <main className="container-x py-4 pb-28 md:pb-32">{children}</main>
      </body>
    </html>
  );
}
