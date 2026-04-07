import "./globals.css";
import NavBar from "../components/NavBar";

export const metadata = {
  title: "Ishaka Market Hub",
  description: "Local market and logistics platform for Ishaka"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <NavBar />
        <main className="container-x py-4">{children}</main>
      </body>
    </html>
  );
}
