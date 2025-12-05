export const metadata = {
  title: 'Virtual Hat Try-On',
  description: 'AR virtual hat try-on using webcam and face detection',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, fontFamily: 'Arial, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}