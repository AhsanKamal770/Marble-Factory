import { db } from '../../db/index';

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
  }
};
