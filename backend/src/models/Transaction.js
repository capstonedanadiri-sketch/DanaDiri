const mongoose = require('mongoose');

const transactionSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    amount: {
      type: Number,
      required: [true, 'Jumlah harus diisi'],
      min: [0, 'Jumlah tidak boleh negatif'],
    },
    type: {
      type: String,
      required: [true, 'Tipe transaksi harus diisi'],
      enum: ['income', 'expense'],
    },
    category: {
      type: String,
      required: [true, 'Kategori harus diisi'],
      enum: [
        'Penghasilan',
        'Investasi',
        'Tunjangan',
        'Gaji',
        'Uang Saku',
        'Bisnis',
        'Bonus',
        'Hadiah',
        'Pencairan Dana',
        'Jajan',
        'Minuman',
        'Makanan',
        'Tagihan Listrik',
        'Tagihan Air',
        'Internet',
        'SPP',
        'Tabungan',
        'Transportasi',
        'Belanja',
        'Hiburan',
        'Kesehatan',
        'Lainnya',
      ],
    },
    description: {
      type: String,
      default: '',
    },
    date: {
      type: Date,
      required: [true, 'Tanggal harus diisi'],
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for optimization
transactionSchema.index({ user: 1, date: -1 });
transactionSchema.index({ user: 1, type: 1 });

const Transaction = mongoose.model('Transaction', transactionSchema);
module.exports = Transaction;
