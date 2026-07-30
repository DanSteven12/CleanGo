import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface HeroTitleProps {
  lines: { text: string; accent?: boolean }[];
  className?: string;
}

/**
 * Text Generate Effect: each word fades/rises in sequentially, then the
 * whole line settles into a very soft ambient glow (no further motion).
 */
export default function HeroTitle({ lines, className }: HeroTitleProps) {
  let globalIndex = 0;

  return (
    <h1
      className={cn(
        'font-display text-[2.25rem] font-normal leading-[1.05] tracking-[-0.03em] text-white sm:text-5xl md:text-6xl lg:text-[4.5rem]',
        className,
      )}
    >
      {lines.map((line, li) => (
        <span key={li} className="block">
          {line.text.split(' ').map((word, wi) => {
            const i = globalIndex++;
            return (
              <motion.span
                key={wi}
                initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }}
                animate={{
                  opacity: 1,
                  y: 0,
                  filter: 'blur(0px)',
                  textShadow: [
                    '0 0 0px rgba(144,191,73,0)',
                    '0 0 18px rgba(144,191,73,0.55)',
                    '0 0 0px rgba(144,191,73,0)',
                  ],
                }}
                transition={{
                  opacity: { duration: 0.5, delay: 0.15 + i * 0.06, ease: [0.22, 1, 0.36, 1] },
                  y: { duration: 0.5, delay: 0.15 + i * 0.06, ease: [0.22, 1, 0.36, 1] },
                  filter: { duration: 0.5, delay: 0.15 + i * 0.06, ease: [0.22, 1, 0.36, 1] },
                  textShadow: { duration: 1.6, delay: 0.15 + i * 0.06 + 0.4, ease: 'easeOut' },
                }}
                className={cn('inline-block', line.accent && 'text-brand-soft')}
              >
                {word}
                {wi < line.text.split(' ').length - 1 ? '\u00A0' : ''}
              </motion.span>
            );
          })}
        </span>
      ))}
    </h1>
  );
}
