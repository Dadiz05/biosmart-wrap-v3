import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  fallbackTitle?: string;
};

type State = {
  hasError: boolean;
  errorMessage: string;
};

export default class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    errorMessage: "",
  };

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error.message || "Có lỗi không xác định",
    };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[BioSmartWrap] Unhandled UI error:", error, info.componentStack);
  }

  reset = () => {
    this.setState({ hasError: false, errorMessage: "" });
  };

  override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-dvh bg-slate-950 px-4 py-10 text-white flex items-center justify-center">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
            <div className="text-xs font-semibold uppercase tracking-wide text-rose-200">Ứng dụng gặp lỗi</div>
            <h1 className="mt-2 text-2xl font-black leading-tight">{this.props.fallbackTitle ?? "Màn hình quét tạm thời bị gián đoạn"}</h1>
            <p className="mt-3 text-sm leading-6 text-white/70">
              Không sao, dữ liệu trước đó vẫn còn. Bạn có thể tải lại trang hoặc quay về màn hình chính để thử lại.
            </p>
            <div className="mt-4 rounded-2xl bg-black/20 p-3 text-xs text-white/75 ring-1 ring-white/10">
              {this.state.errorMessage}
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => this.reset()}
                className="rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white active:scale-[0.99]"
              >
                Thử lại
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-semibold text-white ring-1 ring-white/15 active:scale-[0.99]"
              >
                Tải lại
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}