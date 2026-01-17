import './globals.css'
import AuthProvider from '../components/AuthProvider'

export const metadata = {
    title: 'Gym Tracker',
    description: 'Track your workouts and progress',
}

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body>
                <AuthProvider>
                    {children}
                </AuthProvider>
            </body>
        </html>
    )
}
