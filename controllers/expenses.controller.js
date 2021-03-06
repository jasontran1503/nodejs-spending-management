const Expenses = require('../models/expenses.model');
const User = require('../models/user.model');
const Category = require('../models/category.model');
const createError = require('http-errors');
const { convertDate, getRangeDateByMonth } = require('../helpers/date.helper');

/**
 * Get all expenses by user
 * @route GET api/expenses
 */
const getAllExpenses = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      throw createError.Unauthorized('Không tìm thấy user');
    }

    const expensesList = await Expenses.find({ user: req.user._id }).populate('category');
    return res.status(200).json({
      success: true,
      message: '',
      data: expensesList
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single expenses
 * @route GET api/expenses/single
 * @params expensesId
 */
const getSingleExpenses = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      throw createError.Unauthorized('Không tìm thấy user');
    }

    const data = await Expenses.findOne({ user: req.user._id, _id: req.query.expensesId }).populate(
      'category'
    );
    return res.status(200).json({
      success: true,
      message: '',
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete expenses
 * @route POST api/expenses/delete
 * @params expensesId
 */
const deleteExpenses = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      throw createError.Unauthorized('Không tìm thấy user');
    }

    const expenses = await Expenses.findOneAndDelete({
      user: req.user._id,
      _id: req.query.expensesId
    });
    if (!expenses) {
      throw createError.BadRequest('Không tìm thấy khoản chi này');
    }
    return res.status(200).json({
      success: true,
      message: 'Xóa thành công',
      data: expenses
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create expenses
 * @route POST api/expenses/create
 * @body money, category, createdAt, note
 */
const createExpenses = async (req, res, next) => {
  req.body.user = req.user._id;
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      throw createError.Unauthorized('Không tìm thấy user');
    }

    const category = await Category.findOne({
      user: req.user._id,
      _id: req.body.category
    });
    if (!category) {
      throw createError.BadRequest('Không tìm thấy danh mục');
    }

    const newExpenses = await Expenses.create({
      ...req.body,
      createdAt: convertDate(req.body.createdAt)
    });
    return res.status(200).json({
      success: true,
      message: 'Thêm thành công',
      data: newExpenses
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update expenses
 * @route POST api/expenses/update
 * @body money, category, createdAt
 * @params expensesId
 */
const updateExpenses = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      throw createError.Unauthorized('Không tìm thấy user');
    }

    const category = await Category.findOne({
      user: req.user._id,
      _id: req.body.category
    });
    if (!category) {
      throw createError.BadRequest('Không tìm thấy danh mục');
    }

    const expenses = await Expenses.findOneAndUpdate(
      { user: req.user._id, _id: req.query.expensesId },
      {
        ...req.body,
        createdAt: convertDate(req.body.createdAt)
      },
      {
        new: true,
        runValidators: true
      }
    ).populate('category');
    if (!expenses) {
      throw createError.BadRequest('Khoản chi đã bị xóa hoặc không tồn tại');
    }
    return res.status(200).json({
      success: true,
      message: 'Cập nhật thành công',
      data: expenses
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Report daily expenses
 * @route GET api/expenses/daily
 * @params day
 */
const reportDailyExpenses = async (req, res, next) => {
  const day = convertDate(req.query.day);
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      throw createError.Unauthorized('Không tìm thấy user');
    }

    const dailyExpensesList = await Expenses.find({ user: req.user._id, createdAt: day })
      .populate('category')
      .lean();
    const totalMoney = dailyExpensesList.reduce((a, b) => {
      return a + b.money;
    }, 0);

    return res.status(200).json({
      success: true,
      message: '',
      data: {
        dailyExpensesList,
        totalMoney
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Report monthly expenses
 * @route GET api/expenses/monthly
 * @params date
 */
const reportMonthlyExpenses = async (req, res, next) => {
  const { fromDate, toDate } = getRangeDateByMonth(req.query.date);

  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      throw createError.Unauthorized('Không tìm thấy user');
    }

    let monthlyExpensesList = await Expenses.find({
      user: req.user._id,
      createdAt: { $gte: fromDate, $lte: toDate }
    })
      .populate('category')
      .lean();

    const totalMoney = monthlyExpensesList.reduce((a, b) => {
      return a + b.money;
    }, 0);

    monthlyExpensesList = [
      ...monthlyExpensesList
        .reduce((map, item) => {
          const key = item.category && item.category._id;
          const prev = map.get(key);

          map.set(
            key,
            !prev
              ? item
              : {
                  ...item,
                  money: prev.money + item.money
                }
          );

          return map;
        }, new Map())
        .values()
    ];

    return res.status(200).json({
      success: true,
      message: '',
      data: {
        monthlyExpensesList,
        totalMoney
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get expenses in month
 * @route GET api/expenses/monthly/detail
 * @params date, categoryId
 */
const getExpensesInMonthByCategory = async (req, res, next) => {
  const { date, categoryId } = req.query;
  const { fromDate, toDate } = getRangeDateByMonth(date);

  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      throw createError.Unauthorized('Không tìm thấy user');
    }

    const data = await Expenses.find({
      user: req.user._id,
      category: require('mongoose').Types.ObjectId.isValid(categoryId) ? categoryId : null,
      createdAt: { $gte: fromDate, $lte: toDate }
    }).populate('category');

    return res.status(200).json({
      success: true,
      message: '',
      data
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllExpenses,
  deleteExpenses,
  createExpenses,
  updateExpenses,
  reportDailyExpenses,
  reportMonthlyExpenses,
  getSingleExpenses,
  getExpensesInMonthByCategory
};
