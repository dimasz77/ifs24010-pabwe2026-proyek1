import { Link } from 'react-router-dom';
import { EmptyState } from '../components/ui';

export default function NotFound() {
  return <EmptyState title="Halaman tidak ditemukan" text="Alamat yang Anda buka tidak tersedia." action={<Link to="/" className="btn btn-primary">Kembali ke beranda</Link>} />;
}
