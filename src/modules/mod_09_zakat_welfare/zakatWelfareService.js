import { db } from '../../db/index.js';

export const zakatWelfareService = {
  // Zakat/Welfare Operations
  async getAllRecords() {
    try {
      if (db.zakat_welfare) {
        return await db.zakat_welfare.toArray();
      }
      return [];
    } catch (error) {
      console.error('Error fetching Zakat records:', error);
      throw error;
    }
  },

  async addRecord(recordData) {
    try {
      if (db.zakat_welfare) {
        return await db.zakat_welfare.add(recordData);
      }
      throw new Error('zakat_welfare store is not defined');
    } catch (error) {
      console.error('Error adding Zakat record:', error);
      throw error;
    }
  },

  async updateRecord(id, recordData) {
    try {
      if (db.zakat_welfare) {
        return await db.zakat_welfare.update(id, recordData);
      }
      throw new Error('zakat_welfare store is not defined');
    } catch (error) {
      console.error('Error updating Zakat record:', error);
      throw error;
    }
  },

  async deleteRecord(id) {
    try {
      if (db.zakat_welfare) {
        return await db.zakat_welfare.delete(id);
      }
      throw new Error('zakat_welfare store is not defined');
    } catch (error) {
      console.error('Error deleting Zakat record:', error);
      throw error;
    }
  },

  // Zakat Holders / Beneficiaries Operations (name, phone, amount_per_month_paid)
  async getAllHolders() {
    try {
      if (db.zakat_beneficiaries) {
        return await db.zakat_beneficiaries.toArray();
      }
      return [];
    } catch (error) {
      console.error('Error fetching Zakat holders:', error);
      throw error;
    }
  },

  async addHolder(holderData) {
    try {
      if (db.zakat_beneficiaries) {
        const amt = Number(holderData.amount_per_month_paid || holderData.monthlyAmount || 0);
        return await db.zakat_beneficiaries.add({
          name: (holderData.name || '').trim(),
          phone: (holderData.phone || '').trim(),
          amount_per_month_paid: amt,
          monthlyAmount: amt,
          address: (holderData.address || '').trim(),
          notes: (holderData.notes || '').trim(),
          createdAt: new Date().toISOString()
        });
      }
      throw new Error('zakat_beneficiaries store is not defined');
    } catch (error) {
      console.error('Error adding Zakat holder:', error);
      throw error;
    }
  },

  async updateHolder(id, holderData) {
    try {
      if (db.zakat_beneficiaries) {
        const amt = Number(holderData.amount_per_month_paid || holderData.monthlyAmount || 0);
        return await db.zakat_beneficiaries.update(id, {
          name: (holderData.name || '').trim(),
          phone: (holderData.phone || '').trim(),
          amount_per_month_paid: amt,
          monthlyAmount: amt,
          address: (holderData.address || '').trim(),
          notes: (holderData.notes || '').trim(),
          updatedAt: new Date().toISOString()
        });
      }
      throw new Error('zakat_beneficiaries store is not defined');
    } catch (error) {
      console.error('Error updating Zakat holder:', error);
      throw error;
    }
  },

  async deleteHolder(id) {
    try {
      if (db.zakat_beneficiaries) {
        return await db.zakat_beneficiaries.delete(id);
      }
      throw new Error('zakat_beneficiaries store is not defined');
    } catch (error) {
      console.error('Error deleting Zakat holder:', error);
      throw error;
    }
  }
};
