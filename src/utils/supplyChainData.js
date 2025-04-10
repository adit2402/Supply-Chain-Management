import Papa from 'papaparse';

/**
 * Utility functions for handling supply chain management data
 */
class SupplyChainData {
  constructor() {
    this.data = [];
    this.isLoaded = false;
    this.productTypes = [];
    this.suppliers = [];
    this.locations = [];
    this.transportModes = [];
    this.carriers = [];
  }

  /**
   * Load data from CSV file
   * @param {string} csvFilePath - Path to the CSV file
   * @returns {Promise<Array>} - Parsed data
   */
  async loadData(csvFilePath = '/supply_chain_data.csv') {
    return new Promise((resolve, reject) => {
      Papa.parse(csvFilePath, {
        download: true,
        header: true,
        dynamicTyping: true,
        complete: (results) => {
          this.data = results.data;
          this.isLoaded = true;
          this.extractMetadata();
          resolve(this.data);
        },
        error: (error) => {
          console.error('Error parsing CSV:', error);
          reject(error);
        }
      });
    });
  }

  /**
   * Extract metadata like unique product types, suppliers, etc.
   */
  extractMetadata() {
    if (!this.isLoaded || !this.data.length) return;

    // Extract unique values for filters
    this.productTypes = [...new Set(this.data.map(item => item['Product type']))];
    this.suppliers = [...new Set(this.data.map(item => item['Supplier name']))];
    this.locations = [...new Set(this.data.map(item => item['Location']))];
    this.transportModes = [...new Set(this.data.map(item => item['Transportation modes']))];
    this.carriers = [...new Set(this.data.map(item => item['Shipping carriers']))];
  }

  /**
   * Get all data
   * @returns {Array} - All supply chain data
   */
  getAllData() {
    return this.data;
  }

  /**
   * Filter data by product type
   * @param {string} productType - Product type to filter by
   * @returns {Array} - Filtered data
   */
  getDataByProductType(productType) {
    return this.data.filter(item => item['Product type'] === productType);
  }

  /**
   * Filter data by supplier
   * @param {string} supplier - Supplier name to filter by
   * @returns {Array} - Filtered data
   */
  getDataBySupplier(supplier) {
    return this.data.filter(item => item['Supplier name'] === supplier);
  }

  /**
   * Get sales data for visualization
   * @returns {Object} - Structured sales data for charts
   */
  getSalesData() {
    const salesByProduct = {};
    
    this.productTypes.forEach(type => {
      const products = this.getDataByProductType(type);
      const totalSales = products.reduce((sum, item) => sum + item['Number of products sold'], 0);
      const totalRevenue = products.reduce((sum, item) => sum + item['Revenue generated'], 0);
      
      salesByProduct[type] = {
        totalSales,
        totalRevenue,
        averagePrice: totalRevenue / totalSales
      };
    });
    
    return salesByProduct;
  }

  /**
   * Get inventory data for visualization
   * @returns {Object} - Structured inventory data
   */
  getInventoryData() {
    return {
      stockLevels: this.data.map(item => ({
        sku: item.SKU,
        productType: item['Product type'],
        stock: item['Stock levels'],
        price: item.Price
      })),
      totalStock: this.data.reduce((sum, item) => sum + item['Stock levels'], 0),
      lowStockItems: this.data.filter(item => item['Stock levels'] < 10)
    };
  }

  /**
   * Get supplier performance metrics
   * @returns {Array} - Supplier performance data
   */
  getSupplierPerformance() {
    const supplierPerformance = [];
    
    this.suppliers.forEach(supplier => {
      const supplierData = this.getDataBySupplier(supplier);
      const avgLeadTime = supplierData.reduce((sum, item) => sum + item['Lead time'], 0) / supplierData.length;
      const avgDefectRate = supplierData.reduce((sum, item) => sum + item['Defect rates'], 0) / supplierData.length;
      
      supplierPerformance.push({
        supplier,
        avgLeadTime,
        avgDefectRate,
        totalProducts: supplierData.length,
        locations: [...new Set(supplierData.map(item => item['Location']))]
      });
    });
    
    return supplierPerformance;
  }

  /**
   * Get logistics and shipping data
   * @returns {Object} - Structured logistics data
   */
  getLogisticsData() {
    const shippingCostsByMode = {};
    const shippingTimesByMode = {};
    
    this.transportModes.forEach(mode => {
      const modeData = this.data.filter(item => item['Transportation modes'] === mode);
      const avgCost = modeData.reduce((sum, item) => sum + item['Shipping costs'], 0) / modeData.length;
      const avgTime = modeData.reduce((sum, item) => sum + item['Shipping times'], 0) / modeData.length;
      
      shippingCostsByMode[mode] = avgCost;
      shippingTimesByMode[mode] = avgTime;
    });
    
    return {
      shippingCostsByMode,
      shippingTimesByMode,
      carrierPerformance: this.carriers.map(carrier => {
        const carrierData = this.data.filter(item => item['Shipping carriers'] === carrier);
        return {
          carrier,
          avgCost: carrierData.reduce((sum, item) => sum + item['Shipping costs'], 0) / carrierData.length,
          avgTime: carrierData.reduce((sum, item) => sum + item['Shipping times'], 0) / carrierData.length
        };
      })
    };
  }

  /**
   * Get data for demand forecasting
   * @returns {Array} - Historical sales data for forecasting
   */
  getForecastingData() {
    // In a real app, this would include time-series data
    // For this demo, we'll structure the current data for forecasting
    return this.data.map(item => ({
      sku: item.SKU,
      productType: item['Product type'],
      historicalSales: item['Number of products sold'],
      price: item.Price,
      availability: item.Availability
    }));
  }

  /**
   * Get data for cost optimization
   * @returns {Array} - Cost-related data for optimization
   */
  getCostOptimizationData() {
    return this.data.map(item => ({
      sku: item.SKU,
      productType: item['Product type'],
      manufacturingCost: item['Manufacturing costs'],
      shippingCost: item['Shipping costs'],
      leadTime: item['Lead time'],
      defectRate: item['Defect rates']
    }));
  }

  /**
   * Search for specific SKUs
   * @param {string} query - Search term
   * @returns {Array} - Matching items
   */
  searchBySKU(query) {
    const searchTerm = query.toLowerCase();
    return this.data.filter(item => 
      item.SKU.toLowerCase().includes(searchTerm) ||
      item['Product type'].toLowerCase().includes(searchTerm)
    );
  }
}

// Create a singleton instance
const supplyChainDataService = new SupplyChainData();
export default supplyChainDataService;