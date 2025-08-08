import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';

interface RecaptchaComponentProps {
  onVerify?: (token: string | null) => void;
  onExpired?: () => void;
  onError?: () => void;
  theme?: 'light' | 'dark';
  size?: 'compact' | 'normal' | 'invisible';
  className?: string;
}

export interface RecaptchaRef {
  execute: () => void;
  reset: () => void;
  getValue: () => string | null;
}

const RecaptchaComponent = forwardRef<RecaptchaRef, RecaptchaComponentProps>(
  ({ onVerify, onExpired, onError, theme = 'light', size = 'normal', className }, ref) => {
    const recaptchaRef = useRef<ReCAPTCHA>(null);
    const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

    useImperativeHandle(ref, () => ({
      execute: () => {
        if (recaptchaRef.current) {
          recaptchaRef.current.execute();
        }
      },
      reset: () => {
        if (recaptchaRef.current) {
          recaptchaRef.current.reset();
        }
      },
      getValue: () => {
        if (recaptchaRef.current) {
          return recaptchaRef.current.getValue();
        }
        return null;
      },
    }));

    if (!siteKey) {
      console.warn('reCAPTCHA site key not configured');
      return null;
    }

    const handleChange = (token: string | null) => {
      if (onVerify) {
        onVerify(token);
      }
    };

    const handleExpired = () => {
      if (onExpired) {
        onExpired();
      }
    };

    const handleError = () => {
      if (onError) {
        onError();
      }
    };

    return (
      <div className={className}>
        <ReCAPTCHA
          ref={recaptchaRef}
          sitekey={siteKey}
          onChange={handleChange}
          onExpired={handleExpired}
          onError={handleError}
          theme={theme}
          size={size}
        />
      </div>
    );
  }
);

RecaptchaComponent.displayName = 'RecaptchaComponent';

export default RecaptchaComponent;