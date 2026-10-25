import { Component } from 'react';

export default class AppErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Kesalahan tak terduga pada aplikasi:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="state error" role="alert">
          <h1 className="state-title">Terjadi kesalahan</h1>
          <p className="muted">Aplikasi mengalami gangguan. Muat ulang halaman untuk mencoba kembali.</p>
          <button className="btn btn-primary" type="button" onClick={() => window.location.reload()}>
            Muat ulang halaman
          </button>
        </main>
      );
    }

    return this.props.children;
  }
}
