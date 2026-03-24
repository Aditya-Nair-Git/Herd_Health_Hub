import { cn } from '@/lib/utils';

interface HoovrrLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: 'w-5 h-5',
  md: 'w-8 h-8',
  lg: 'w-10 h-10',
};

export function HoovrrLogo({ className, size = 'md' }: HoovrrLogoProps) {
  return (
    <img
      src="/hoovrr-logo.png"
      alt="Hoovrr"
      className={cn(sizeMap[size], 'object-contain', className)}
    />
  );
}
