import Navbar from '@/components/layout/Navbar';
import { ToastProvider } from '@/components/student/Toast';

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const layoutStyle: React.CSSProperties = {
    minHeight: "100vh",
    paddingTop: "64px",
  };

  const containerStyle: React.CSSProperties = {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "0 24px",
  };

  return (
    <>
      <Navbar />
      <main style={layoutStyle}>
        <div style={containerStyle}>
          <ToastProvider>{children}</ToastProvider>
        </div>
      </main>
    </>
  );
}