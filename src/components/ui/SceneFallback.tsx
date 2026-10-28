import { Component, type ErrorInfo, type ReactNode } from 'react';

export function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

export function WebGLFallback({ detail }: { detail?: string }) {
  return (
    <div className="screen-message" role="alert">
      <h2>Pulau belum bisa ditampilkan</h2>
      <p>
        Peramban ini tidak dapat memulai WebGL, yang dibutuhkan untuk papan 3D. Coba perbarui
        peramban, aktifkan akselerasi perangkat keras, atau buka di peramban lain.
      </p>
      {detail ? <p className="screen-message__detail">{detail}</p> : null}
    </div>
  );
}

interface State {
  error: Error | null;
}

/** Menangkap kegagalan render 3D agar pengguna tidak melihat layar kosong. */
export class SceneErrorBoundary extends Component<{ children: ReactNode }, State> {
  override state: State = { error: null };
  static getDerivedStateFromError(error: Error): State {
    return { error };
  }
  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Kesalahan render 3D', error, info.componentStack);
  }
  override render(): ReactNode {
    return this.state.error ? <WebGLFallback detail={this.state.error.message} /> : this.props.children;
  }
}
