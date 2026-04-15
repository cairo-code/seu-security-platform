import "./globals.css";
import { ToastProvider } from "@/components/student/Toast";

export const metadata = {
  title: "SEU Playground",
  description: "Cybersecurity Learning Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-gray-100">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
