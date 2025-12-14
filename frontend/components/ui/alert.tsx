import * as React from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle, AlertTriangle, CheckCircle, Info } from 'lucide-react';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'success' | 'warning' | 'danger';
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = 'info', children, ...props }, ref) => {
    const variants = {
      info: {
        bg: 'bg-info/10 border-l-4 border-info',
        icon: Info,
        iconColor: 'text-info',
      },
      success: {
        bg: 'bg-success/10 border-l-4 border-success',
        icon: CheckCircle,
        iconColor: 'text-success',
      },
      warning: {
        bg: 'bg-warning/10 border-l-4 border-warning',
        icon: AlertTriangle,
        iconColor: 'text-warning',
      },
      danger: {
        bg: 'bg-danger/10 border-l-4 border-danger',
        icon: AlertCircle,
        iconColor: 'text-danger',
      },
    };

    const { bg, icon: Icon, iconColor } = variants[variant];

    return (
      <div
        ref={ref}
        className={cn('p-4 rounded-card flex items-start gap-3 shadow-card', bg, className)}
        {...props}
      >
        <Icon className={cn('h-5 w-5 mt-0.5', iconColor)} />
        <div className="flex-1 text-text-primary">{children}</div>
      </div>
    );
  }
);

Alert.displayName = 'Alert';

const AlertTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h5 ref={ref} className={cn('font-semibold mb-1', className)} {...props} />
  )
);

AlertTitle.displayName = 'AlertTitle';

const AlertDescription = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('text-small', className)} {...props} />
  )
);

AlertDescription.displayName = 'AlertDescription';

export { Alert, AlertTitle, AlertDescription };
