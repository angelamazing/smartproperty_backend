/**
 * 部门报餐功能前端集成示例
 * 包含完整的API调用示例和错误处理
 */

class DepartmentDiningAPI {
  constructor(baseURL = 'http://localhost:3000') {
    this.baseURL = baseURL;
    this.token = null;
  }

  // 设置Token
  setToken(token) {
    this.token = token;
  }

  // 通用请求方法
  async request(url, options = {}) {
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    if (this.token) {
      config.headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(`${this.baseURL}${url}`, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API请求失败:', error);
      throw error;
    }
  }

  // 1. 部门管理员登录
  async login(phoneNumber) {
    const response = await this.request('/api/auth/test-login-admin', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber })
    });

    if (response.success) {
      this.setToken(response.data.token);
      return response.data;
    }
    throw new Error(response.message);
  }

  // 1.1 指定部门的部门管理员登录
  async loginDeptAdmin(departmentCode) {
    const response = await this.request('/api/auth/test-login-dept-admin', {
      method: 'POST',
      body: JSON.stringify({ departmentCode })
    });

    if (response.success) {
      this.setToken(response.data.token);
      return response.data;
    }
    throw new Error(response.message);
  }

  // 2. 获取部门成员列表
  async getDepartmentMembers(options = {}) {
    const params = new URLSearchParams();
    if (options.includeInactive !== undefined) {
      params.append('includeInactive', options.includeInactive);
    }
    if (options.keyword) {
      params.append('keyword', options.keyword);
    }

    const url = `/api/dining/enhanced/dept-members${params.toString() ? '?' + params.toString() : ''}`;
    const response = await this.request(url);
    return response.data;
  }

  // 3. 部门报餐
  async createDepartmentOrder(orderData) {
    const response = await this.request('/api/dining/enhanced/department-order', {
      method: 'POST',
      body: JSON.stringify(orderData)
    });
    return response.data;
  }

  // 4. 获取部门报餐记录
  async getDepartmentOrders(options = {}) {
    const params = new URLSearchParams();
    if (options.date) params.append('date', options.date);
    if (options.mealType) params.append('mealType', options.mealType);
    if (options.page) params.append('page', options.page);
    if (options.pageSize) params.append('pageSize', options.pageSize);
    if (options.startDate) params.append('startDate', options.startDate);
    if (options.endDate) params.append('endDate', options.endDate);

    const url = `/api/dining/enhanced/department-orders${params.toString() ? '?' + params.toString() : ''}`;
    const response = await this.request(url);
    return response.data;
  }

  // 5. 获取部门报餐统计
  async getDepartmentStats(options = {}) {
    const params = new URLSearchParams();
    if (options.startDate) params.append('startDate', options.startDate);
    if (options.endDate) params.append('endDate', options.endDate);

    const url = `/api/dining/enhanced/department-stats${params.toString() ? '?' + params.toString() : ''}`;
    const response = await this.request(url);
    return response.data;
  }

  // 6. 获取部门报餐概览
  async getDepartmentOverview() {
    const response = await this.request('/api/dining/enhanced/department-overview');
    return response.data;
  }
}

// 使用示例
async function example() {
  const api = new DepartmentDiningAPI();

  try {
    // 1. 登录
    console.log('正在登录...');
    const loginData = await api.login('13800001001');
    console.log('登录成功:', loginData.userInfo);

    // 2. 获取部门成员
    console.log('获取部门成员...');
    const members = await api.getDepartmentMembers();
    console.log('部门成员:', members);

    // 3. 部门报餐
    console.log('开始报餐...');
    const orderData = {
      date: '2025-09-02',
      mealType: 'lunch',
      members: members.map(member => ({ userId: member._id })),
      remark: '部门聚餐'
    };
    const orderResult = await api.createDepartmentOrder(orderData);
    console.log('报餐结果:', orderResult);

    // 4. 获取报餐记录
    console.log('获取报餐记录...');
    const orders = await api.getDepartmentOrders({ date: '2025-09-02' });
    console.log('报餐记录:', orders);

    // 5. 获取统计信息
    console.log('获取统计信息...');
    const stats = await api.getDepartmentStats();
    console.log('统计信息:', stats);

    // 6. 获取概览
    console.log('获取概览...');
    const overview = await api.getDepartmentOverview();
    console.log('概览信息:', overview);

  } catch (error) {
    console.error('操作失败:', error.message);
  }
}

// Vue.js 组件示例
const DepartmentDiningComponent = {
  data() {
    return {
      api: new DepartmentDiningAPI(),
      members: [],
      orders: [],
      stats: {},
      loading: false,
      error: null
    };
  },
  async mounted() {
    await this.initialize();
  },
  methods: {
    async initialize() {
      try {
        this.loading = true;
        this.error = null;

        // 登录
        await this.api.login('13800001001');
        
        // 获取数据
        await Promise.all([
          this.loadMembers(),
          this.loadOrders(),
          this.loadStats()
        ]);

      } catch (error) {
        this.error = error.message;
      } finally {
        this.loading = false;
      }
    },

    async loadMembers() {
      this.members = await this.api.getDepartmentMembers();
    },

    async loadOrders() {
      this.orders = await this.api.getDepartmentOrders({ 
        date: new Date().toISOString().split('T')[0] 
      });
    },

    async loadStats() {
      this.stats = await this.api.getDepartmentStats();
    },

    async submitOrder(selectedMembers, mealType) {
      try {
        this.loading = true;
        
        const orderData = {
          date: new Date().toISOString().split('T')[0],
          mealType: mealType,
          members: selectedMembers.map(member => ({ userId: member._id }))
        };

        await this.api.createDepartmentOrder(orderData);
        
        // 刷新数据
        await this.loadOrders();
        await this.loadStats();
        
        this.$message.success('报餐成功！');
        
      } catch (error) {
        this.$message.error('报餐失败: ' + error.message);
      } finally {
        this.loading = false;
      }
    }
  }
};

// React Hook 示例
function useDepartmentDining() {
  const [api] = useState(() => new DepartmentDiningAPI());
  const [members, setMembers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const initialize = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      await api.login('13800001001');
      
      const [membersData, ordersData, statsData] = await Promise.all([
        api.getDepartmentMembers(),
        api.getDepartmentOrders({ date: new Date().toISOString().split('T')[0] }),
        api.getDepartmentStats()
      ]);

      setMembers(membersData);
      setOrders(ordersData);
      setStats(statsData);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [api]);

  const submitOrder = useCallback(async (selectedMembers, mealType) => {
    try {
      setLoading(true);
      
      const orderData = {
        date: new Date().toISOString().split('T')[0],
        mealType: mealType,
        members: selectedMembers.map(member => ({ userId: member._id }))
      };

      await api.createDepartmentOrder(orderData);
      
      // 刷新数据
      const [ordersData, statsData] = await Promise.all([
        api.getDepartmentOrders({ date: new Date().toISOString().split('T')[0] }),
        api.getDepartmentStats()
      ]);

      setOrders(ordersData);
      setStats(statsData);
      
      return { success: true, message: '报餐成功！' };
      
    } catch (err) {
      return { success: false, message: '报餐失败: ' + err.message };
    } finally {
      setLoading(false);
    }
  }, [api]);

  return {
    members,
    orders,
    stats,
    loading,
    error,
    initialize,
    submitOrder
  };
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DepartmentDiningAPI, example };
}
