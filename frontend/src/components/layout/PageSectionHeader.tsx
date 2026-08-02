import React from 'react';

interface PageSectionHeaderProps {
    eyebrow: string;
    title: string;
    description: string;
}

export const PageSectionHeader: React.FC<PageSectionHeaderProps> = ({ eyebrow, title, description }) => {
    return (
        <div style={{
            width: '100%',
            backgroundColor: 'var(--panel-bg, #FFFFFF)',
            padding: '1.25rem 2rem',
            marginBottom: '1rem',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem',
            boxSizing: 'border-box'
        }}>
            <span style={{
                textTransform: 'uppercase',
                color: 'var(--primary, #1763A6)',
                letterSpacing: '0.08em',
                fontWeight: 600,
                fontSize: '0.7rem',
                margin: 0,
                lineHeight: 1
            }}>
                {eyebrow}
            </span>
            <h2 style={{
                fontSize: '1.5rem',
                fontWeight: 700,
                color: 'var(--text-h, #111827)',
                margin: 0,
                lineHeight: 1.2,
                fontFamily: 'var(--font-display, inherit)',
                letterSpacing: '-0.02em'
            }}>
                {title}
            </h2>
            <p style={{
                fontSize: '0.875rem',
                color: 'var(--text, #6B7280)',
                margin: 0,
                lineHeight: 1.4,
                maxWidth: '800px'
            }}>
                {description}
            </p>
        </div>
    );
};
