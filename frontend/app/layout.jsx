import "./globals.css";
import NavBar from "../components/NavBar";
import BackButton from "../components/BackButton";

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
        <main className="container-x py-4 pb-24 md:pb-4">{children}</main>
      </body>
    </html>
  );
}
