import Link from 'next/link'
import Image from 'next/image'

export default function Home() {
    return (
        <div style={{ paddingBottom: '4rem' }}>
            {/* Navbar Placeholder (Assuming Navbar is in layout, but added spacing if needed) */}

            {/* Hero Section */}
            <section className="container" style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '4rem',
                alignItems: 'center',
                minHeight: '80vh',
                paddingTop: '2rem'
            }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{
                        display: 'inline-block',
                        padding: '0.5rem 1rem',
                        backgroundColor: 'rgba(255, 112, 81, 0.1)',
                        color: 'var(--primary)',
                        borderRadius: '2rem',
                        fontWeight: 'bold',
                        fontSize: '0.9rem',
                        alignSelf: 'flex-start'
                    }}>
                        #1 Fitness App for 2026
                    </div>
                    <h1 style={{ fontSize: '4rem', fontWeight: '800', lineHeight: '1.1' }}>
                        Unlock Your <span style={{
                            background: 'var(--primary-gradient)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                        }}>Ultimate Potential</span>
                    </h1>
                    <p style={{ fontSize: '1.25rem', color: 'var(--secondary)', lineHeight: '1.6', maxWidth: '500px' }}>
                        Track your workouts, follow expert-designed plans, and get AI-powered insights to crush your fitness goals.
                    </p>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <Link href="/auth/signup" className="btn" style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>
                            Start for Free
                        </Link>
                        <Link href="#features" className="btn" style={{
                            background: 'white',
                            color: 'var(--foreground)',
                            border: '1px solid var(--border)',
                            boxShadow: 'none',
                            padding: '1rem 2rem',
                            fontSize: '1.1rem'
                        }}>
                            Learn More
                        </Link>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginTop: '2rem' }}>
                        <div>
                            <h4 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>10k+</h4>
                            <p style={{ color: 'var(--secondary)', fontSize: '0.9rem' }}>Active Users</p>
                        </div>
                        <div>
                            <h4 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>500+</h4>
                            <p style={{ color: 'var(--secondary)', fontSize: '0.9rem' }}>Expert Plans</p>
                        </div>
                        <div>
                            <h4 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>AI</h4>
                            <p style={{ color: 'var(--secondary)', fontSize: '0.9rem' }}>Powered Analysis</p>
                        </div>
                    </div>
                </div>

                <div style={{ position: 'relative' }}>
                    <div style={{
                        position: 'absolute',
                        top: '-10%',
                        right: '-10%',
                        width: '120%',
                        height: '120%',
                        background: 'radial-gradient(circle, rgba(255,112,81,0.2) 0%, rgba(255,255,255,0) 70%)',
                        zIndex: -1
                    }} />
                    <Image
                        src="/hero.png"
                        alt="EndureStack Dashboard"
                        width={600}
                        height={400}
                        style={{ width: '100%', height: 'auto', borderRadius: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}
                        priority
                    />
                </div>
            </section>

            {/* Features Section */}
            <section id="features" style={{ backgroundColor: '#f9f9fb', padding: '6rem 0' }}>
                <div className="container">
                    <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
                        <h2 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
                            Everything You Need to <br /> Succeed
                        </h2>
                        <p style={{ color: 'var(--secondary)', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>
                            We've packed EndureStack with powerful features to help you stay consistent and improve every day.
                        </p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>

                        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
                            <div style={{ height: '200px', position: 'relative', overflow: 'hidden', borderRadius: '16px' }}>
                                <Image
                                    src="/feature-tracking.png"
                                    alt="Workout Tracking"
                                    fill
                                    style={{ objectFit: 'cover' }}
                                />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Smart Tracking</h3>
                                <p style={{ color: 'var(--secondary)' }}>
                                    Log sets, reps, and weights effortlessly. Our intuitive interface remembers your history for quick entry.
                                </p>
                            </div>
                        </div>

                        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
                            <div style={{ height: '200px', position: 'relative', overflow: 'hidden', borderRadius: '16px' }}>
                                <Image
                                    src="/feature-plans.png"
                                    alt="Expert Plans"
                                    fill
                                    style={{ objectFit: 'cover' }}
                                />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Expert Plans</h3>
                                <p style={{ color: 'var(--secondary)' }}>
                                    Access a library of workout plans created by top trainers. Follow structured days and weeks to reach your peak.
                                </p>
                            </div>
                        </div>

                        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
                            <div style={{ height: '200px', position: 'relative', overflow: 'hidden', borderRadius: '16px' }}>
                                <Image
                                    src="/feature-ai.png"
                                    alt="AI Analysis"
                                    fill
                                    style={{ objectFit: 'cover' }}
                                />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>AI Powered</h3>
                                <p style={{ color: 'var(--secondary)' }}>
                                    Upload photos for AI body composition analysis and get personalized insights on your progress.
                                </p>
                            </div>
                        </div>

                    </div>
                </div>
            </section>

            {/* Testimonial / Social Proof */}
            <section className="container" style={{ padding: '6rem 1rem', textAlign: 'center' }}>
                <h2 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '3rem' }}>Trusted by Fitness Enthusiasts</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                    <div className="card" style={{ textAlign: 'left' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', color: 'var(--warning)', marginBottom: '1rem' }}>
                            {'★'.repeat(5)}
                        </div>
                        <p style={{ fontStyle: 'italic', marginBottom: '1.5rem' }}>
                            "EndureStack changed how I train. The workout plans are top tier and tracking my progress has never been easier."
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#ccc' }}></div>
                            <div>
                                <h5 style={{ fontWeight: 'bold' }}>Alex Johnson</h5>
                                <p style={{ fontSize: '0.8rem', color: 'var(--secondary)' }}>Pro Athlete</p>
                            </div>
                        </div>
                    </div>
                    <div className="card" style={{ textAlign: 'left' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', color: 'var(--warning)', marginBottom: '1rem' }}>
                            {'★'.repeat(5)}
                        </div>
                        <p style={{ fontStyle: 'italic', marginBottom: '1.5rem' }}>
                            "As a trainer, this is the perfect tool to manage my clients and assign them custom plans. Highly recommended!"
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#ccc' }}></div>
                            <div>
                                <h5 style={{ fontWeight: 'bold' }}>Sarah Miller</h5>
                                <p style={{ fontSize: '0.8rem', color: 'var(--secondary)' }}>Personal Trainer</p>
                            </div>
                        </div>
                    </div>
                    <div className="card" style={{ textAlign: 'left' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', color: 'var(--warning)', marginBottom: '1rem' }}>
                            {'★'.repeat(5)}
                        </div>
                        <p style={{ fontStyle: 'italic', marginBottom: '1.5rem' }}>
                            "The AI analysis is mind-blowing. Seeing my composition changes over time keeps me incredibly motivated."
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#ccc' }}></div>
                            <div>
                                <h5 style={{ fontWeight: 'bold' }}>Mike Chen</h5>
                                <p style={{ fontSize: '0.8rem', color: 'var(--secondary)' }}>Fitness Enthusiast</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section style={{ backgroundColor: 'var(--foreground)', color: 'white', padding: '6rem 1rem', textAlign: 'center' }}>
                <div className="container">
                    <h2 style={{ fontSize: '3rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Ready to Start Your Journey?</h2>
                    <p style={{ fontSize: '1.25rem', color: '#ccc', marginBottom: '2.5rem', maxWidth: '600px', margin: '0 auto 2.5rem auto' }}>
                        Join thousands of users who are building their best selves with EndureStack.
                    </p>
                    <Link href="/auth/signup" className="btn" style={{ padding: '1rem 3rem', fontSize: '1.25rem' }}>
                        Get Started Now
                    </Link>
                    <p style={{ marginTop: '1.5rem', fontSize: '0.9rem', color: '#888' }}>
                        No credit card required for basic plan.
                    </p>
                </div>
            </section>

            {/* Footer */}
            <footer style={{ backgroundColor: '#f9f9fb', padding: '4rem 1rem' }}>
                <div className="container" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '2rem' }}>
                    <div>
                        <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
                            Endure<span style={{ color: 'var(--primary)' }}>Stack</span>
                        </h3>
                        <p style={{ color: 'var(--secondary)', maxWidth: '300px' }}>
                            The ultimate platform for fitness tracking, expert planning, and AI-driven results.
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '3rem', flexWrap: 'wrap' }}>
                        <div>
                            <h4 style={{ fontWeight: 'bold', marginBottom: '1rem' }}>Product</h4>
                            <ul style={{ listStyle: 'none', display: 'grid', gap: '0.5rem', color: 'var(--secondary)' }}>
                                <li>Features</li>
                                <li>Pricing</li>
                                <li>Trainers</li>
                                <li>AI Analysis</li>
                            </ul>
                        </div>
                        <div>
                            <h4 style={{ fontWeight: 'bold', marginBottom: '1rem' }}>Company</h4>
                            <ul style={{ listStyle: 'none', display: 'grid', gap: '0.5rem', color: 'var(--secondary)' }}>
                                <li>About Us</li>
                                <li>Careers</li>
                                <li>Blog</li>
                                <li>Contact</li>
                            </ul>
                        </div>
                        <div>
                            <h4 style={{ fontWeight: 'bold', marginBottom: '1rem' }}>Legal</h4>
                            <ul style={{ listStyle: 'none', display: 'grid', gap: '0.5rem', color: 'var(--secondary)' }}>
                                <li>Privacy Policy</li>
                                <li>Terms of Service</li>
                            </ul>
                        </div>
                    </div>
                </div>
                <div className="container" style={{ textAlign: 'center', marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid #e5e5ea', color: 'var(--secondary)', fontSize: '0.9rem' }}>
                    © 2026 EndureStack. All rights reserved.
                </div>
            </footer>
        </div>
    )
}
