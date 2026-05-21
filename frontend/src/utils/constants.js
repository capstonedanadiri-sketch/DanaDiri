export const INCOME_CATEGORIES = [
  'Penghasilan',
  'Gaji',
  'Uang Saku',
  'Bisnis',
  'Bonus',
  'Investasi',
  'Hadiah',
  'Kos-kosan',
  'Jual Tanah',
  'Tunjangan',
  'Pencairan Dana',
  'Lainnya',
];

export const EXPENSE_CATEGORIES = [
  'Jajan',
  'Minuman',
  'Tabungan',
  'Tagihan Listrik',
  'Tagihan Air',
  'Tagihan Telepon',
  'Internet',
  'SPP',
  'Makanan',
  'Transportasi',
  'Belanja',
  'Hiburan',
  'Kesehatan',
  'Tagihan',
  'Lainnya',
];

export const CATEGORIES = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];

export const TRANSACTION_TYPES = [
  { value: 'income', label: 'Pemasukan' },
  { value: 'expense', label: 'Pengeluaran' },
];

export const GOAL_CATEGORIES = [
  'Liburan',
  'Kendaraan',
  'Rumah',
  'Pendidikan',
  'Dana Darurat',
  'Pensiun',
  'Investasi',
  'Lainnya',
];

export const GOAL_STATUS = {
  active: 'Aktif',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
};

// Bulan dalam Bahasa Indonesia
export const MONTHS = [
  { value: 1, label: 'Januari' },
  { value: 2, label: 'Februari' },
  { value: 3, label: 'Maret' },
  { value: 4, label: 'April' },
  { value: 5, label: 'Mei' },
  { value: 6, label: 'Juni' },
  { value: 7, label: 'Juli' },
  { value: 8, label: 'Agustus' },
  { value: 9, label: 'September' },
  { value: 10, label: 'Oktober' },
  { value: 11, label: 'November' },
  { value: 12, label: 'Desember' },
];

// Hari dalam bulan
export const DAYS = Array.from({ length: 31 }, (_, i) => ({
  value: i + 1,
  label: `${i + 1}`,
}));
