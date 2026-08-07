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
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                }}
                transition={{
                  duration: 0.4,
                  delay: 0.1 + i * 0.08,
                  ease: [0.22, 1, 0.36, 1],
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
