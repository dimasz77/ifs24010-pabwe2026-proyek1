import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="public-home">
      <header className="public-home-header">
        <Link className="public-home-brand" to="/">Jenika Rental</Link>
        <nav aria-label="Navigasi utama">
          <Link className="link" to="/auth/login">Masuk</Link>
          <Link className="btn btn-primary btn-sm" to="/auth/register">Buat akun</Link>
        </nav>
      </header>
      <main className="public-home-main">
        <p className="public-home-eyebrow">Rental motor Samosir</p>
        <h1>Kelola penyewaan motor dengan lebih mudah.</h1>
        <p className="public-home-description">
          Catat armada, pelanggan, dan transaksi penyewaan Jenika Rental dalam satu aplikasi.
        </p>
        <div className="public-home-actions">
          <Link className="btn btn-primary" to="/auth/register">Mulai sekarang</Link>
          <Link className="btn btn-ghost" to="/auth/login">Masuk ke akun</Link>
        </div>
        <p className="public-home-places">Melayani Tomok, Tuktuk, Ambarita, Pangururan, dan Simanindo.</p>
      </main>
    </div>
  );
}
