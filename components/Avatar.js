'use client'

import Image from 'next/image'

export default function Avatar({ name, userId, url = null, size = 48, className = '' }) {
    if (url) {
        return (
            <div
                className={className}
                style={{
                    width: size,
                    height: size,
                    borderRadius: '50%',
                    overflow: 'hidden',
                    position: 'relative',
                    flexShrink: 0
                }}
            >
                <Image
                    src={url}
                    alt={`${name}'s avatar`}
                    width={size}
                    height={size}
                    style={{ objectFit: 'cover' }}
                />
            </div>
        )
    }

    return (
        <div
            className={className}
            style={{
                width: size,
                height: size,
                borderRadius: '50%',
                overflow: 'hidden',
                position: 'relative',
                flexShrink: 0,
                backgroundColor: 'var(--border)', // Neutral background
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--secondary)'
            }}
        >
            <svg
                width={size * 0.6}
                height={size * 0.6}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
            </svg>
        </div>
    )
}
