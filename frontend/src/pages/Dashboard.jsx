import { Link } from 'react-router-dom';
import { Plus, TriangleAlert, Clock } from 'lucide-react';
import { api } from '../lib/api';
import { useAsync } from '../lib/hooks';
import { rupiah, formatDate, formatLongDate, typeLabel, RENTAL_STATUS } from '../lib/format';
import { PageHeader, Spinner, ErrorState, Badge, EmptyState } from '../components/ui';

export default function Dashboard() {
  const { data, loading, error, reload } = useAsync(() => api.get('/dashboard/summary'), []);

  if (loading && !data) return <Spinner label="Memuat ringkasan..." />;
  if (error && !data) return <ErrorState error={error} onRetry={reload} />;

  const { fleet, rentals, customers, revenue_this_month: revenue } = data;
  const segs = [
    { key: 'available', label: 'Tersedia', value: fleet.available },
    { key: 'rented', label: 'Sedang disewa', value: fleet.rented },
    { key: 'maintenance', label: 'Perawatan', value: fleet.maintenance },
  ];
  const maxType = Math.max(1, ...data.fleet_by_type.map((t) => t.count));

  return (
    <>
      <PageHeader title="Horas! Ringkasan hari ini" subtitle={formatLongDate(data.today)}>
        <Link to="/sewa/baru" className="btn btn-primary"><Plus size={18} /> Buat sewa baru</Link>
        <Link to="/motor?baru=1" className="btn btn-ghost">Tambah motor</Link>
      </PageHeader>

      {rentals.overdue > 0 && (
        <Link to="/sewa?overdue=true" className="alert alert-danger">
          <TriangleAlert size={20} />
          <span><strong>{rentals.overdue} motor terlambat dikembalikan.</strong> Lihat dan selesaikan penyewaannya.</span>
        </Link>
      )}

      <section className="fleet-panel" aria-label="Kondisi armada">
        <div className="fleet-head">
          <h2>Kondisi armada</h2>
          <p className="muted">{fleet.total} motor terdaftar</p>
        </div>
        <div className="segbar" role="group" aria-label={segs.map((s) => `${s.label} ${s.value}`).join(', ')}>
          {segs.map((s) => s.value > 0 && <span key={s.key} className={`seg seg-${s.key}`} style={{ flexGrow: s.value }} />)}
        </div>
        <ul className="seg-legend">
          {segs.map((s) => (
            <li key={s.key}><span className={`dot seg-${s.key}`} /><strong>{s.value}</strong> {s.label}</li>
          ))}
        </ul>
      </section>

      <section className="stats">
        <div className="stat"><p className="stat-num">{rentals.active}</p><p className="muted">Sewa berjalan</p></div>
        <div className="stat"><p className="stat-num">{rentals.booked}</p><p className="muted">Pesanan akan datang</p></div>
        <div className="stat"><p className="stat-num">{customers}</p><p className="muted">Pelanggan terdaftar</p></div>
        <div className="stat stat-money"><p className="stat-num">{rupiah(revenue)}</p><p className="muted">Pendapatan bulan ini ({rentals.completed_this_month} sewa selesai)</p></div>
      </section>

      <div className="grid-2">
        <section className="panel">
          <div className="panel-head"><h2>Jadwal pengembalian</h2><Link to="/sewa?status=berjalan" className="link">Lihat semua</Link></div>
          {data.upcoming_returns.length === 0 ? (
            <EmptyState title="Tidak ada motor yang sedang disewa" text="Pengembalian akan muncul di sini setelah sewa dimulai." />
          ) : (
            <ul className="list">
              {data.upcoming_returns.map((r) => (
                <li key={r.id} className="list-row">
                  <div>
                    <p className="row-title">{r.motorcycle_name} <span className="plate-mini">{r.motorcycle_plate}</span></p>
                    <p className="muted">{r.customer_name}</p>
                  </div>
                  <div className="row-end">
                    <p className={r.is_overdue ? 'text-danger' : ''}><Clock size={14} /> {formatDate(r.end_date)}</p>
                    {r.is_overdue && <Badge tone="danger">Terlambat</Badge>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel">
          <div className="panel-head"><h2>Sewa terbaru</h2><Link to="/sewa" className="link">Lihat semua</Link></div>
          {data.recent_rentals.length === 0 ? (
            <EmptyState title="Belum ada penyewaan" action={<Link to="/sewa/baru" className="btn btn-primary">Buat sewa pertama</Link>} />
          ) : (
            <ul className="list">
              {data.recent_rentals.map((r) => (
                <li key={r.id} className="list-row">
                  <div>
                    <p className="row-title">{r.customer_name}</p>
                    <p className="muted">{r.motorcycle_name} &middot; {formatDate(r.start_date)} s/d {formatDate(r.end_date)}</p>
                  </div>
                  <div className="row-end">
                    <p>{rupiah(r.grand_total)}</p>
                    <Badge tone={RENTAL_STATUS[r.status].tone}>{RENTAL_STATUS[r.status].label}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="panel">
        <div className="panel-head"><h2>Komposisi armada</h2><Link to="/motor" className="link">Kelola motor</Link></div>
        <ul className="bars">
          {data.fleet_by_type.map((t) => (
            <li key={t.type}>
              <span className="bar-label">{typeLabel(t.type)}</span>
              <span className="bar-track"><span className={`bar-fill type-${t.type}`} style={{ width: `${(t.count / maxType) * 100}%` }} /></span>
              <span className="bar-val">{t.count}</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
