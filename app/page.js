import Link from 'next/link'

export default function Home() {
    return (
        <main className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '2rem' }}>
            <h1 style={{ fontSize: '3rem', fontWeight: 'bold', textAlign: 'center' }}>
                Endure<span style={{ color: 'var(--primary)' }}>Stack</span>
            </h1>
            <p style={{ fontSize: '1.2rem', color: 'var(--secondary)', textAlign: 'center', maxWidth: '600px' }}>
                The ultimate gym workout tracker. Manage your progress, work with trainers, and achieve your goals.
            </p>

            <div style={{ display: 'flex', gap: '1rem' }}>
                <Link href="/auth/login" className="btn">
                    Login
                </Link>
                <Link href="/auth/signup" className="btn" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border)' }}>
                    Sign Up
                </Link>
            </div>
        </main>
    )
}
