import express from 'express';
import cors from 'cors';
import * as ordersController from './controllers/orders.controller';
// import * as periodsController from './controllers/periods.controller';
import * as dashboardController from './controllers/dashboard.controller';
import * as settingsController from './controllers/settings.controller';
import * as backupController from './controllers/backup.controller';
import * as brandsController from './controllers/brands.controller';
import * as auditController from './controllers/audit.controller';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Orders
app.get('/api/orders', ordersController.getOrders);
app.post('/api/orders', ordersController.createOrder);
app.put('/api/orders/:id', ordersController.updateOrder);
app.delete('/api/orders/:id', ordersController.deleteOrder);

// Periods
// app.get('/api/periods', periodsController.getPeriods);
// app.post('/api/periods', periodsController.createPeriod);
// app.put('/api/periods/:id', periodsController.updatePeriod);
// app.delete('/api/periods/:id', periodsController.deletePeriod);
// app.post('/api/periods/:id/pay', periodsController.payPeriod);

// Dashboard
app.get('/api/dashboard', dashboardController.getDashboard);

// Settings
app.get('/api/settings', settingsController.getSettings);
app.put('/api/settings', settingsController.updateSettings);

// Backup
app.get('/api/backup/export', backupController.exportDatabase);
app.post('/api/backup/import', backupController.importDatabase);

// Brands
app.get('/api/brands', brandsController.getBrands);
app.post('/api/brands', brandsController.createBrand);
app.delete('/api/brands/:id', brandsController.deleteBrand);

// Audit
app.get('/api/audit', auditController.getAuditLogs);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
