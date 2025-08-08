import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';

interface RecaptchaComponentProps {
  onVerify: (token: string | null) => void;
  onExpired?: () => void;
  onError?: () => void;
  theme?: 'light' | 'dark';
  size?: 'compact' | 'normal';
  className?: string;
}

export interface RecaptchaRef {
  reset: () => void;
  execute: () => void;
}

const RecaptchaComponent = forwardRef<RecaptchaRef, RecaptchaComponentProps>(
  ({ onVerify, onExpired, onError, theme = 'light', size = 'normal', className }, ref) => {
    const recaptchaRef = useRef<ReCAPTCHA>(null);
    const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

    useImperativeHandle(ref, () => ({
      reset: () => {
        recaptchaRef.current?.reset();
      },
      execute: () => {
        recaptchaRef.current?.execute();
      }
    }));

    // Don't render if site key is not configured
    if (!siteKey) {
      console.warn('reCAPTCHA site key not configured');
      return null;
    }

    return (
      <div className={className}>
        <ReCAPTCHA
          ref={recaptchaRef}
          sitekey={siteKey}
          onChange={onVerify}
          onExpired={onExpired}
          onError={onError}
          theme={theme}
          size={size}
        />
      </div>
    );
  }
);

RecaptchaComponent.displayName = 'RecaptchaComponent';

export default RecaptchaComponent;