import { Component, ErrorInfo, ReactNode } from "react";

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  hasError: boolean;
};

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Admin app crashed while rendering.", error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="app-loading-shell">
          <div className="app-loading-card">
            <p className="app-loading-eyebrow">Jewellery Association Admin</p>
            <h1 className="app-loading-title">We hit a screen error</h1>
            <p className="app-loading-copy">
              The admin app ran into an unexpected rendering problem. Reload the page to try again.
            </p>
            <button className="admin-shell__logout" type="button" onClick={this.handleReload}>
              Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
