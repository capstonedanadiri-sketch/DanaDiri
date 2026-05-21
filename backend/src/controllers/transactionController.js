const asyncHandler = require('express-async-handler');
const Transaction = require('../models/Transaction');
const { calculateBalance } = require('../utils/balanceUtils');


// @desc    Mendapatkan semua transaksi user + filter + search + pagination
// @route   GET /api/transactions
// @access  Private
const getTransactions = asyncHandler(async (req, res) => {
  const {
    type,
    category,
    search,
    startDate,
    endDate,
    month,
    page = 1,
    limit = 10,
  } = req.query;

  let filter = {
    user: req.user._id,
  };

  // Filter berdasarkan type (income / expense)
  if (type) {
    filter.type = type;
  }

  // Filter berdasarkan kategori
  if (category) {
    filter.category = category;
  }

  // Search berdasarkan deskripsi
  if (search) {
    filter.description = {
      $regex: search,
      $options: 'i', // case insensitive
    };
  }

  // Filter berdasarkan month ("YYYY-MM")
  if (month) {
    const [yyyy, mm] = month.split('-');
    const sDate = new Date(yyyy, mm - 1, 1);
    const eDate = new Date(yyyy, mm, 0, 23, 59, 59, 999);
    filter.date = { ...filter.date, $gte: sDate, $lte: eDate };
  } else if (startDate || endDate) {
    // Filter berdasarkan tanggal custom
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate);
    if (endDate) {
      const eDate = new Date(endDate);
      eDate.setHours(23,59,59,999);
      filter.date.$lte = eDate;
    }
  }

  // 🔥 PAGINATION
  const pageNumber = parseInt(page);
  const pageSize = parseInt(limit);

  const total = await Transaction.countDocuments(filter);

  const transactions = await Transaction.find(filter)
    .sort({ date: -1 })
    .skip((pageNumber - 1) * pageSize)
    .limit(pageSize);

  // Aggregation for totals of the FILTERED items
  const totalsResult = await Transaction.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        totalIncome: { $sum: { $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0] } },
        totalExpense: { $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] } }
      }
    }
  ]);

  const summaryIncome = totalsResult[0]?.totalIncome || 0;
  const summaryExpense = totalsResult[0]?.totalExpense || 0;

  res.json({
    transactions,
    page: pageNumber,
    pages: Math.ceil(total / pageSize),
    total,
    summaryIncome,
    summaryExpense
  });
});


// @desc    Membuat transaksi baru
// @route   POST /api/transactions
// @access  Private
const createTransaction = asyncHandler(async (req, res) => {
  const { amount, type, category, description, date } = req.body;

  if (!amount || !type || !category || !date) {
    return res.status(400).json({ 
      success: false, 
      message: 'Field wajib: amount, type, category, date' 
    });
  }

  // Jika ini pengeluaran, cek apakah saldo mencukupi
  if (type === 'expense') {
    const currentBalance = await calculateBalance(req.user._id);
    if (currentBalance < amount) {
      return res.status(400).json({ 
        success: false, 
        message: 'Saldo tidak cukup untuk melakukan transaksi ini' 
      });
    }
  }

  const transaction = await Transaction.create({
    user: req.user._id,
    amount,
    type,
    category,
    description,
    date,
  });

  res.status(201).json(transaction);
});


// @desc    Mengupdate transaksi
// @route   PUT /api/transactions/:id
// @access  Private
const updateTransaction = asyncHandler(async (req, res) => {
  const transaction = await Transaction.findById(req.params.id);

  if (!transaction) {
    res.status(404);
    throw new Error('Transaksi tidak ditemukan');
  }

  if (transaction.user.toString() !== req.user._id.toString()) {
    res.status(401);
    throw new Error('Tidak diizinkan mengupdate transaksi ini');
  }

  // Cek validasi saldo jika update mengakibatkan perubahan finansial
  const oldAmount = transaction.amount;
  const oldType = transaction.type;
  const newAmount = req.body.amount !== undefined ? req.body.amount : oldAmount;
  const newType = req.body.type !== undefined ? req.body.type : oldType;

  // Hitung efek ke saldo:
  // Saldo saat ini (tanpa transaksi lama) + transaksi baru
  const currentBalance = await calculateBalance(req.user._id);
  
  // Saldo tanpa transaksi ini
  const balanceWithoutThis = oldType === 'income' 
    ? currentBalance - oldAmount 
    : currentBalance + oldAmount;
  
  // Saldo setelah transaksi baru diterapkan
  const projectedBalance = newType === 'income'
    ? balanceWithoutThis + newAmount
    : balanceWithoutThis - newAmount;

  if (projectedBalance < 0) {
    return res.status(200).json({ 
      success: false, 
      message: 'Saldo tidak cukup untuk melakukan perubahan ini' 
    });
  }

  const updatedTransaction = await Transaction.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  res.json(updatedTransaction);
});


// @desc    Menghapus transaksi
// @route   DELETE /api/transactions/:id
// @access  Private
const deleteTransaction = asyncHandler(async (req, res) => {
  const transaction = await Transaction.findById(req.params.id);

  if (!transaction) {
    res.status(404);
    throw new Error('Transaksi tidak ditemukan');
  }

  if (transaction.user.toString() !== req.user._id.toString()) {
    res.status(401);
    throw new Error('Tidak diizinkan menghapus transaksi ini');
  }

  await transaction.deleteOne();

  res.json({ message: 'Transaksi berhasil dihapus' });
});


// @desc    Mendapatkan ringkasan keuangan
// @route   GET /api/transactions/summary
// @access  Private
const getSummary = asyncHandler(async (req, res) => {
  const { period = '6months' } = req.query;
  const userId = req.user._id;
  const now = new Date();

  // 1. Calculate All Time Balance & Current Month Totals
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const statsAggregation = await Transaction.aggregate([
    { $match: { user: userId } },
    {
      $facet: {
        allTime: [
          {
            $group: {
              _id: null,
              totalIncome: { $sum: { $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0] } },
              totalExpense: { $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] } },
            },
          },
        ],
        currentMonth: [
          { $match: { date: { $gte: startOfMonth } } },
          {
            $group: {
              _id: null,
              totalIncome: { $sum: { $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0] } },
              totalExpense: { $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] } },
            },
          },
        ],
        categoryStats: [
          { $match: { date: { $gte: startOfMonth }, type: 'expense' } },
          {
            $group: {
              _id: '$category',
              total: { $sum: '$amount' },
            },
          },
        ],
      },
    },
  ]);

  const stats = statsAggregation[0];
  const allTime = stats.allTime[0] || { totalIncome: 0, totalExpense: 0 };
  const currentMonth = stats.currentMonth[0] || { totalIncome: 0, totalExpense: 0 };

  const balance = allTime.totalIncome - allTime.totalExpense;
  const totalIncome = currentMonth.totalIncome;
  const totalExpense = currentMonth.totalExpense;

  const categoryExpense = {};
  stats.categoryStats.forEach((cat) => {
    categoryExpense[cat._id] = cat.total;
  });

  // 2. Chart Data Aggregation
  const aggregatedData = [];
  let startDateChart;
  
  if (period === 'week' || period === 'month') {
    const days = period === 'week' ? 7 : 30;
    startDateChart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1));
    startDateChart.setHours(0, 0, 0, 0); // Start of the day
    
    // Initialize empty labels
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const label = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
      aggregatedData.push({
        label,
        income: 0,
        expense: 0,
        year: d.getFullYear(),
        monthNum: d.getMonth(),
        dayNum: d.getDate()
      });
    }

  } else {
    const months = period === '6months' ? 6 : 12;
    startDateChart = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
    
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString('id-ID', { month: 'short' }).toUpperCase();
      aggregatedData.push({
        label,
        income: 0,
        expense: 0,
        year: d.getFullYear(),
        monthNum: d.getMonth()
      });
    }
  }

  // Fetch actual data for chart using aggregation
  const chartAggregation = await Transaction.aggregate([
    { $match: { user: userId, date: { $gte: startDateChart } } },
    {
      $project: {
        amount: 1,
        type: 1,
        date: 1,
        // Convert to local timezone concepts roughly. Better handled in application code below.
      }
    }
  ]);

  // Map to chart
  chartAggregation.forEach(t => {
    const tDate = new Date(t.date);
    let data;
    if (period === 'week' || period === 'month') {
      data = aggregatedData.find(ad => 
        ad.year === tDate.getFullYear() && 
        ad.monthNum === tDate.getMonth() && 
        ad.dayNum === tDate.getDate()
      );
    } else {
      data = aggregatedData.find(ad => 
        ad.year === tDate.getFullYear() && 
        ad.monthNum === tDate.getMonth()
      );
    }

    if (data) {
      if (t.type === 'income') data.income += t.amount;
      else data.expense += t.amount;
    }
  });

  res.json({
    totalIncome,
    totalExpense,
    balance,
    categoryExpense,
    chartData: aggregatedData.map(d => ({
      label: d.label,
      income: d.income,
      expense: d.expense
    }))
  });
});

module.exports = {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getSummary,
};
