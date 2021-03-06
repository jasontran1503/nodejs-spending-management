const express = require('express');
const router = express.Router();

const expensesController = require('../controllers/expenses.controller');
const validation = require('../helpers/validation.helper');
const auth = require('../middlewares/auth.middleware');

router.get('/', auth.guard, expensesController.getAllExpenses);
router.get('/single', auth.guard, expensesController.getSingleExpenses);
router.post('/create', auth.guard, validation.expenses, expensesController.createExpenses);
router.put('/update', auth.guard, validation.expenses, expensesController.updateExpenses);
router.delete('/delete', auth.guard, expensesController.deleteExpenses);
router.get('/daily', auth.guard, expensesController.reportDailyExpenses);
router.get('/monthly', auth.guard, expensesController.reportMonthlyExpenses);
router.get('/monthly/detail', auth.guard, expensesController.getExpensesInMonthByCategory);

module.exports = router;
