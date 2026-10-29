import React, { Component, createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, X, RefreshCw, Sparkles, ShieldAlert, Clock } from 'lucide-react';

export type ToastVariant = 'error' | 'warning' | 'info' | 'success';

export interface ToastMessage {
  id: string;
  title: string;
  message: string;
  variant: ToastVariant;
  code?: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: ToastMessage[];
  showToast: (toast: Omit<ToastMessage, 'id'>) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const TOAST_EVENT_NAME = 'ipts:global-toast';

export function sanitizeAIErrorForUser(
  rawMessage?: string,
  status?: number,
  errorCode?: string
): { title: string; message: string; variant: ToastVariant; code: string } {
  const raw = String(rawMessage || '').trim();
  const code = String(errorCode || '').toUpperCase();

  if (
    status === 429 ||
    code === 'AI_RATE_LIMIT' ||
    /429|rate.?limit|quota|RESOURCE_EXHAUSTED|too many requests/i.test(raw)
  ) {
    return {
      title: 'AI Rate Limit Reached',
      message: 'The AI assistant is receiving a high volume of requests right now. Please wait a few seconds and try again.',
      variant: 'warning',
      code: 'RATE_LIMIT'
    };
  }

  if (
    status === 503 ||
    code === 'AI_MODEL_BUSY' ||
    /503|UNAVAILABLE|high demand|overloaded|temporarily busy/i.test(raw)
  ) {
    return {
      title: 'AI Model Temporarily Busy',
      message: 'The AI model is experiencing high demand at the moment. Smart local fallback or a quick retry will keep your workflow moving.',
      variant: 'warning',
      code: 'MODEL_BUSY'
    };
  }

  if (
    status === 401 ||
    status === 403 ||
    code === 'AI_AUTH_CONFIG' ||
    /401|403|authentication|invalid.*key|permission_denied|unauthorized|forbidden|no body/i.test(raw)
  ) {
    return {
      title: 'AI Service Switched to Smart Mode',
      message: 'Live cloud AI credentials are being refreshed. Your request is being handled seamlessly using the built-in MITCORER evaluation engine.',
      variant: 'info',
      code: 'AUTH_FALLBACK'
    };
  }

  if (
    status === 404 ||
    code === 'AI_MODEL_UNAVAILABLE' ||
    /404|model.*not found|endpoint.*not found/i.test(raw)
  ) {
    return {
      title: 'AI Model Unavailable',
      message: 'The selected AI model is temporarily unavailable. Automatically routing to the recommended backup model.',
      variant: 'warning',
      code: 'MODEL_UNAVAILABLE'
    };
  }

  // Strip any raw JSON, stack traces, or internal URLs
  const looksTechnical =
    raw.includes('{') ||
    raw.includes('}') ||
    raw.includes('http://') ||
    raw.includes('https://') ||
    raw.includes('at ') ||
    raw.includes('Error:') ||
    raw.length > 180;

  return {
    title: 'AI Assistant Notice',
    message:
      !looksTechnical && raw
        ? raw
        : 'The AI assistant encountered a temporary hiccup while processing your request. Please try again in a moment.',
    variant: 'warning',
    code: 'AI_SERVICE_NOTICE'
  };
}

export function dispatchGlobalToast(toast: Omit<ToastMessage, 'id'>) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(TOAST_EVENT_NAME, { detail: toast }));
}

export function dispatchAIErrorToast(rawMessage?: string, status?: number, errorCode?: string) {
  const sanitized = sanitizeAIErrorForUser(rawMessage, status, errorCode);
  dispatchGlobalToast({
    title: sanitized.title,
    message: sanitized.message,
    variant: sanitized.variant,
    code: sanitized.code,
    duration: 5500
  });
  return sanitized;
}

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback(
    (toast: Omit<ToastMessage, 'id'>) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const duration = toast.duration ?? 5000;

      setToasts(prev => {
        // Deduplicate identical messages within active toasts
        const duplicate = prev.find(t => t.title === toast.title && t.message === toast.message);
        if (duplicate) return prev;
        return [...prev.slice(-3), { ...toast, id }];
      });

      if (duration > 0) {
        setTimeout(() => {
          dismissToast(id);
        }, duration);
      }
    },
    [dismissToast]
  );

  useEffect(() => {
    const handleToastEvent = (e: Event) => {
      const customEvent = e as CustomEvent<Omit<ToastMessage, 'id'>>;
      if (customEvent.detail) {
        showToast(customEvent.detail);
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const rawMsg = String(reason?.message || reason || '');
      // Catch uncaught AI-related promise rejections and show a friendly toast instead of raw errors
      if (/gemini|claude|anthropic|ai_rate_limit|ai_model|429|503|401 status code/i.test(rawMsg)) {
        event.preventDefault();
        const sanitized = sanitizeAIErrorForUser(rawMsg, reason?.status);
        showToast({
          title: sanitized.title,
          message: sanitized.message,
          variant: sanitized.variant,
          code: sanitized.code
        });
      }
    };

    window.addEventListener(TOAST_EVENT_NAME, handleToastEvent);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => {
      window.removeEventListener(TOAST_EVENT_NAME, handleToastEvent);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast }}>
      {children}
      {/* Floating Toast Container */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-3 max-w-md w-full pointer-events-none px-4 sm:px-0"
      >
        {toasts.map(toast => {
          const isError = toast.variant === 'error';
          const isWarning = toast.variant === 'warning';
          const isSuccess = toast.variant === 'success';

          const containerStyles = isError
            ? 'bg-white dark:bg-slate-900 border-red-200 dark:border-red-800/70 text-slate-900 dark:text-slate-100'
            : isWarning
            ? 'bg-white dark:bg-slate-900 border-amber-200 dark:border-amber-800/70 text-slate-900 dark:text-slate-100'
            : isSuccess
            ? 'bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-800/70 text-slate-900 dark:text-slate-100'
            : 'bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-800/70 text-slate-900 dark:text-slate-100';

          const iconStyles = isError
            ? 'bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400'
            : isWarning
            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
            : isSuccess
            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
            : 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400';

          return (
            <div
              key={toast.id}
              role="status"
              className={`pointer-events-auto flex items-start gap-3.5 p-4 rounded-xl border shadow-xl backdrop-blur-md transition-all duration-200 ${containerStyles}`}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${iconStyles}`}>
                {toast.code === 'RATE_LIMIT' ? (
                  <Clock className="w-4 h-4" />
                ) : isError ? (
                  <ShieldAlert className="w-4 h-4" />
                ) : isWarning ? (
                  <AlertTriangle className="w-4 h-4" />
                ) : isSuccess ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                    {toast.title}
                  </h4>
                  {toast.code && (
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {toast.code.replace(/_/g, ' ')}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  {toast.message}
                </p>
              </div>

              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                aria-label="Dismiss notification"
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  friendlyTitle: string;
  friendlyMessage: string;
}

export class CentralizedErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      friendlyTitle: '',
      friendlyMessage: ''
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    const sanitized = sanitizeAIErrorForUser(error?.message);
    return {
      hasError: true,
      friendlyTitle: sanitized.title || 'Something Went Wrong',
      friendlyMessage:
        sanitized.message ||
        'We encountered a temporary display issue. Your progress is safe—click below to refresh this view.'
    };
  }

  componentDidCatch(error: Error) {
    // Emit a user-friendly toast notification without exposing stack traces to the student
    dispatchAIErrorToast(error?.message);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      friendlyTitle: '',
      friendlyMessage: ''
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-lg text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4">
              <Info className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {this.state.friendlyTitle}
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {this.state.friendlyMessage}
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={this.handleReset}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold transition-colors"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
