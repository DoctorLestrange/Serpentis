import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 bg-[#08110E] text-[#F2EFE9] flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-2xl p-6 bg-[#0B1713] border border-emerald-400/30 shadow-2xl text-center">
            <h1 className="text-2xl font-extrabold text-white">
              Arena Interrupted
            </h1>
            <p className="text-sm text-stone-300 mt-2">
              An unexpected rendering error occurred. Your saved records and
              preferences remain intact.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 px-5 py-2.5 rounded-xl font-bold text-sm text-stone-950 bg-emerald-400 hover:bg-emerald-300 transition-colors cursor-pointer"
            >
              Reload Serpentis
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
