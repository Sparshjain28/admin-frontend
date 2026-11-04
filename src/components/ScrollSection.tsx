import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

interface ScrollSectionProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export const ScrollSection = ({ children, className = '', delay = 0 }: ScrollSectionProps) => {
  const { ref, isInView } = useScrollAnimation();

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
      className={className}
      style={{ willChange: 'transform, opacity' }}
    >
      {children}
    </motion.div>
  );
};
