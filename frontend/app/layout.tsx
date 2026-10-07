import './globals.css';
import ThemeProvider from '@/components/ThemeProvider';
export const metadata={title:'Fireflies Workspace',description:'Meeting notes, transcripts and AI insights'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><ThemeProvider>{children}</ThemeProvider></body></html>}
