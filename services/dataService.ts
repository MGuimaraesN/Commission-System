import { ServiceOrder, Period, AppSettings, CommissionStatus, Brand, AuditLogEntry } from '../types';

// Simple ID generator
const generateId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

const STORAGE_KEYS = {
  ORDERS: 'commission_sys_orders',
  PERIODS: 'commission_sys_periods',
  SETTINGS: 'commission_sys_settings',
  BRANDS: 'commission_sys_brands',
  USER: 'commission_sys_user',
};

const DEFAULT_SETTINGS: AppSettings = {
  fixedCommissionPercentage: 10, // 10%
};

// --- Helpers ---

const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();

const getCurrentUserEmail = () => {
    const stored = localStorage.getItem(STORAGE_KEYS.USER);
    return stored ? JSON.parse(stored).email : 'System';
};

const createLogEntry = (action: string, details?: string): AuditLogEntry => ({
    timestamp: new Date().toISOString(),
    user: getCurrentUserEmail(),
    action,
    details
});

export const getBiWeeklyPeriodRange = (dateStr: string): { start: string, end: string } => {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed
  const day = date.getDate();

  let startDay = 1;
  let endDay = 15;

  if (day > 15) {
    startDay = 16;
    endDay = getDaysInMonth(year, month);
  }

  const start = new Date(year, month, startDay);
  const end = new Date(year, month, endDay);

  const toYMD = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${da}`;
  };

  return { start: toYMD(start), end: toYMD(end) };
};

// --- Data Access ---

export const getSettings = (): AppSettings => {
  const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS);
  return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
};

export const saveSettings = (settings: Partial<AppSettings>) => {
  const current = getSettings();
  const updated = { ...current, ...settings };
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
};

export const getPeriods = (): Period[] => {
  const stored = localStorage.getItem(STORAGE_KEYS.PERIODS);
  return stored ? JSON.parse(stored) : [];
};

const savePeriods = (periods: Period[]) => {
  localStorage.setItem(STORAGE_KEYS.PERIODS, JSON.stringify(periods));
};

export const getOrders = (): ServiceOrder[] => {
  const stored = localStorage.getItem(STORAGE_KEYS.ORDERS);
  return stored ? JSON.parse(stored) : [];
};

const saveOrders = (orders: ServiceOrder[]) => {
  localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
};

export const getBrands = (): Brand[] => {
  const stored = localStorage.getItem(STORAGE_KEYS.BRANDS);
  if (stored) return JSON.parse(stored);
  
  // Default brands if none exist
  const defaults: Brand[] = [
    { id: generateId(), name: 'Samsung', createdAt: new Date().toISOString() },
    { id: generateId(), name: 'Apple', createdAt: new Date().toISOString() },
    { id: generateId(), name: 'LG', createdAt: new Date().toISOString() },
    { id: generateId(), name: 'Motorola', createdAt: new Date().toISOString() },
  ];
  saveBrands(defaults);
  return defaults;
};

const saveBrands = (brands: Brand[]) => {
  localStorage.setItem(STORAGE_KEYS.BRANDS, JSON.stringify(brands));
};

// --- Operations ---

export const ensurePeriodExists = (dateStr: string): Period => {
  const { start, end } = getBiWeeklyPeriodRange(dateStr);
  const periods = getPeriods();
  let period = periods.find(p => p.startDate === start && p.endDate === end);

  if (!period) {
    period = {
      id: generateId(),
      startDate: start,
      endDate: end,
      paid: false,
      totalOrders: 0,
      totalServiceValue: 0,
      totalCommission: 0,
    };
    periods.push(period);
    // Sort periods descending by date
    periods.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
    savePeriods(periods);
  }
  return period;
};

export const createOrder = (order: Omit<ServiceOrder, 'id' | 'createdAt' | 'commissionValue' | 'status' | 'periodId'>) => {
  const settings = getSettings();
  const period = ensurePeriodExists(order.entryDate);

  if (period.paid) {
    throw new Error("Cannot add orders to a paid period.");
  }

  const commissionValue = (order.serviceValue * settings.fixedCommissionPercentage) / 100;

  const newOrder: ServiceOrder = {
    ...order,
    id: generateId(),
    createdAt: new Date().toISOString(),
    commissionValue,
    status: CommissionStatus.PENDING,
    periodId: period.id,
    paidAt: null,
    history: [createLogEntry('CREATED', `Order created with value R$ ${order.serviceValue}`)]
  };

  const orders = getOrders();
  orders.push(newOrder);
  saveOrders(orders);
  
  // Update period totals
  recalculatePeriodTotals();
  
  return newOrder;
};

export const duplicateOrder = (originalId: string) => {
    const orders = getOrders();
    const original = orders.find(o => o.id === originalId);
    if (!original) throw new Error("Order not found");

    const settings = getSettings();
    const today = new Date().toISOString().split('T')[0];
    const period = ensurePeriodExists(today);

    // Calculate commission based on current settings (new order logic)
    const commissionValue = (original.serviceValue * settings.fixedCommissionPercentage) / 100;

    // Generate new OS Number (simple max + 1 logic for uniqueness in demo)
    const maxOs = Math.max(...orders.map(o => o.osNumber), 1000);

    const newOrder: ServiceOrder = {
        id: generateId(),
        osNumber: maxOs + 1,
        entryDate: today,
        customerName: original.customerName,
        brand: original.brand,
        serviceValue: original.serviceValue,
        commissionValue: commissionValue,
        status: CommissionStatus.PENDING,
        periodId: period.id,
        createdAt: new Date().toISOString(),
        paidAt: null,
        paymentMethod: original.paymentMethod || undefined,
        history: [createLogEntry('DUPLICATED', `Duplicated from Order #${original.osNumber}`)]
    };

    orders.push(newOrder);
    saveOrders(orders);
    recalculatePeriodTotals();
    return newOrder;
};

export const updateOrder = (id: string, updates: Partial<Omit<ServiceOrder, 'id' | 'createdAt' | 'status' | 'periodId'>>) => {
  const orders = getOrders();
  const index = orders.findIndex(o => o.id === id);
  if (index === -1) throw new Error("Order not found");

  const existingOrder = orders[index];
  
  if (existingOrder.status === 'PAID') {
    throw new Error("Cannot edit a PAID order.");
  }

  const periods = getPeriods();
  const currentPeriod = periods.find(p => p.id === existingOrder.periodId);
  
  if (currentPeriod?.paid) {
    throw new Error("Cannot edit orders in a paid period.");
  }

  // Calculate new commission if value changed
  let commissionValue = existingOrder.commissionValue;
  if (updates.serviceValue !== undefined) {
    const settings = getSettings();
    commissionValue = (updates.serviceValue * settings.fixedCommissionPercentage) / 100;
  }

  // Check if date changed, might need new period
  let periodId = existingOrder.periodId;
  if (updates.entryDate && updates.entryDate !== existingOrder.entryDate) {
     const newPeriod = ensurePeriodExists(updates.entryDate);
     if (newPeriod.paid) throw new Error("Cannot move order to a paid period.");
     periodId = newPeriod.id;
  }

  // Audit Log
  const history = existingOrder.history || [];
  const changes: string[] = [];
  
  if (updates.serviceValue !== undefined && updates.serviceValue !== existingOrder.serviceValue) {
      changes.push(`Value: ${existingOrder.serviceValue} -> ${updates.serviceValue}`);
  }
  if (updates.customerName && updates.customerName !== existingOrder.customerName) {
      changes.push(`Customer: ${existingOrder.customerName} -> ${updates.customerName}`);
  }
  if (updates.brand && updates.brand !== existingOrder.brand) {
      changes.push(`Brand: ${existingOrder.brand} -> ${updates.brand}`);
  }
  if (updates.entryDate && updates.entryDate !== existingOrder.entryDate) {
      changes.push(`Date: ${existingOrder.entryDate} -> ${updates.entryDate}`);
  }
  if (updates.osNumber && updates.osNumber !== existingOrder.osNumber) {
      changes.push(`OS: ${existingOrder.osNumber} -> ${updates.osNumber}`);
  }
  if (updates.paymentMethod !== undefined && updates.paymentMethod !== existingOrder.paymentMethod) {
      changes.push(`Payment: ${existingOrder.paymentMethod || 'None'} -> ${updates.paymentMethod || 'None'}`);
  }
  
  if (changes.length > 0) {
      history.push(createLogEntry('UPDATED', changes.join(', ')));
  }

  const updatedOrder = {
    ...existingOrder,
    ...updates,
    commissionValue,
    periodId,
    history
  };

  orders[index] = updatedOrder;
  saveOrders(orders);
  recalculatePeriodTotals();
  return updatedOrder;
};

export const updateOrderStatus = (id: string, status: 'PENDING' | 'PAID') => {
  const orders = getOrders();
  const index = orders.findIndex(o => o.id === id);
  if (index === -1) throw new Error("Order not found");
  
  const order = orders[index];
  order.status = status;
  
  // Manage PaidAt
  if (status === 'PAID') {
      order.paidAt = new Date().toISOString();
  } else {
      order.paidAt = null;
  }

  // History
  if (!order.history) order.history = [];
  order.history.push(createLogEntry('STATUS_CHANGE', `Status changed to ${status}`));

  saveOrders(orders);
};

export const bulkUpdateOrderStatus = (ids: string[], status: 'PENDING' | 'PAID') => {
  if (ids.length === 0) return;
  const orders = getOrders();
  let changed = false;
  
  ids.forEach(id => {
    const index = orders.findIndex(o => o.id === id);
    if (index !== -1) {
       const order = orders[index];
       if (order.status !== status) {
           order.status = status;
           if (status === 'PAID') {
               order.paidAt = new Date().toISOString();
           } else {
               order.paidAt = null;
           }
           if (!order.history) order.history = [];
           order.history.push(createLogEntry('STATUS_CHANGE', `Bulk status change to ${status}`));
           changed = true;
       }
    }
  });

  if (changed) {
    saveOrders(orders);
  }
};

export const bulkDeleteOrders = (ids: string[]) => {
  if (ids.length === 0) return;
  let orders = getOrders();
  const periods = getPeriods();
  
  const initialCount = orders.length;
  orders = orders.filter(o => {
    if (!ids.includes(o.id)) return true; // Keep orders not in list
    
    // Logic for orders to be deleted:
    if (o.status === 'PAID') return true; // Prevent deleting PAID orders (Keep them)
    const period = periods.find(p => p.id === o.periodId);
    if (period?.paid) return true; // Prevent deleting from Paid Period (Keep them)
    
    return false; // Safe to delete
  });

  if (orders.length !== initialCount) {
    saveOrders(orders);
    recalculatePeriodTotals();
  }
};

export const deleteOrder = (id: string) => {
    const orders = getOrders();
    const order = orders.find(o => o.id === id);
    if (!order) return;

    if (order.status === 'PAID') throw new Error("Cannot delete a PAID order");

    const periods = getPeriods();
    const period = periods.find(p => p.id === order.periodId);
    if (period?.paid) throw new Error("Cannot delete orders from a paid period");

    const newOrders = orders.filter(o => o.id !== id);
    saveOrders(newOrders);
    recalculatePeriodTotals();
};

export const markPeriodAsPaid = (periodId: string) => {
  const periods = getPeriods();
  const periodIndex = periods.findIndex(p => p.id === periodId);
  if (periodIndex === -1) throw new Error("Period not found");

  periods[periodIndex].paid = true;
  periods[periodIndex].paidAt = new Date().toISOString();
  savePeriods(periods);

  // Update all orders in this period to PAID
  const orders = getOrders();
  let changed = false;
  const now = new Date().toISOString();
  orders.forEach(o => {
    if (o.periodId === periodId) {
      if (o.status !== 'PAID') {
          o.status = CommissionStatus.PAID;
          o.paidAt = now;
          if (!o.history) o.history = [];
          o.history.push(createLogEntry('STATUS_CHANGE', 'Period closed and paid'));
          changed = true;
      }
    }
  });
  if (changed) saveOrders(orders);
};

// --- Brand Operations ---

export const addBrand = (name: string) => {
  const brands = getBrands();
  if (brands.some(b => b.name.toLowerCase() === name.toLowerCase())) {
    throw new Error("Brand already exists");
  }
  const newBrand: Brand = {
    id: generateId(),
    name,
    createdAt: new Date().toISOString()
  };
  brands.push(newBrand);
  brands.sort((a, b) => a.name.localeCompare(b.name));
  saveBrands(brands);
  return newBrand;
};

export const updateBrand = (id: string, name: string) => {
  const brands = getBrands();
  const index = brands.findIndex(b => b.id === id);
  if (index === -1) throw new Error("Brand not found");
  
  if (brands.some(b => b.id !== id && b.name.toLowerCase() === name.toLowerCase())) {
    throw new Error("Brand name already taken");
  }

  brands[index].name = name;
  brands.sort((a, b) => a.name.localeCompare(b.name));
  saveBrands(brands);
};

export const deleteBrand = (id: string) => {
  const brands = getBrands();
  const newBrands = brands.filter(b => b.id !== id);
  saveBrands(newBrands);
};

const recalculatePeriodTotals = () => {
  const periods = getPeriods();
  const orders = getOrders();

  const periodMap = new Map<string, Period>();
  periods.forEach(p => {
    p.totalOrders = 0;
    p.totalServiceValue = 0;
    p.totalCommission = 0;
    periodMap.set(p.id, p);
  });

  orders.forEach(o => {
    const p = periodMap.get(o.periodId);
    if (p) {
      p.totalOrders++;
      p.totalServiceValue += o.serviceValue;
      p.totalCommission += o.commissionValue;
    }
  });

  savePeriods(Array.from(periodMap.values()));
};

// --- Analytics Helpers ---

export const getBackupData = () => {
    return JSON.stringify({
        orders: getOrders(),
        periods: getPeriods(),
        brands: getBrands(),
        settings: getSettings(),
        version: '1.0'
    }, null, 2);
};

export const restoreBackup = (jsonData: string) => {
    try {
        const data = JSON.parse(jsonData);
        if (data.orders) localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(data.orders));
        if (data.periods) localStorage.setItem(STORAGE_KEYS.PERIODS, JSON.stringify(data.periods));
        if (data.brands) localStorage.setItem(STORAGE_KEYS.BRANDS, JSON.stringify(data.brands));
        if (data.settings) localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(data.settings));
        return true;
    } catch (e) {
        console.error(e);
        return false;
    }
};

export const getMonthlyStats = () => {
    const orders = getOrders();
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${now.getMonth()}`; // YYYY-M
    
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthKey = `${prevMonthDate.getFullYear()}-${prevMonthDate.getMonth()}`;

    let currentComm = 0;
    let prevComm = 0;
    let currentPaid = 0;
    let currentPending = 0;

    orders.forEach(o => {
        const d = new Date(o.entryDate);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        
        if (key === currentMonthKey) {
            currentComm += o.commissionValue;
            if (o.status === 'PAID') currentPaid += o.commissionValue;
            else currentPending += o.commissionValue;
        } else if (key === prevMonthKey) {
            prevComm += o.commissionValue;
        }
    });

    const growth = prevComm === 0 ? 100 : ((currentComm - prevComm) / prevComm) * 100;
    
    return {
        currentMonth: {
            total: currentComm,
            paid: currentPaid,
            pending: currentPending
        },
        prevMonth: {
            total: prevComm
        },
        growth
    };
};

export const getRankings = () => {
    const orders = getOrders();
    const brandMap = new Map<string, number>();
    const customerMap = new Map<string, number>();

    orders.forEach(o => {
        brandMap.set(o.brand, (brandMap.get(o.brand) || 0) + o.commissionValue);
        customerMap.set(o.customerName, (customerMap.get(o.customerName) || 0) + o.serviceValue);
    });

    const topBrands = Array.from(brandMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, value]) => ({ name, value }));

    const topCustomers = Array.from(customerMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, value]) => ({ name, value }));
        
    return { topBrands, topCustomers };
};

export const initializeData = () => {
  // Ensure brands exist
  getBrands();

  if (getOrders().length === 0) {
    const today = new Date();
    const addDays = (d: Date, days: number) => new Date(d.getTime() + days * 86400000);
    const dates = [
        today, 
        addDays(today, -5), 
        addDays(today, -15),
        addDays(today, -20),
        addDays(today, -40)
    ];

    const brands = getBrands().map(b => b.name);

    dates.forEach((d, i) => {
        try {
            createOrder({
                osNumber: 1000 + i,
                entryDate: d.toISOString().split('T')[0],
                customerName: `Customer ${i + 1}`,
                brand: brands[i % brands.length],
                serviceValue: 150 + (i * 50)
            });
        } catch (e) {
            // Ignore errors if period paid (shouldn't happen on init)
        }
    });
  }
};