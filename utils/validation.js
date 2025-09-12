const Joi = require('joi');

/**
 * 参数验证工具类
 */

// 通用验证规则
const commonSchemas = {
  // ID验证
  id: Joi.string().required().messages({
    'string.empty': 'ID不能为空',
    'any.required': 'ID是必填项'
  }),
  
  // 手机号验证
  phoneNumber: Joi.string().pattern(/^1[3-9]\d{9}$/).required().messages({
    'string.pattern.base': '手机号格式不正确',
    'string.empty': '手机号不能为空',
    'any.required': '手机号是必填项'
  }),
  
  // 验证码验证
  verificationCode: Joi.string().pattern(/^\d{6}$/).required().messages({
    'string.pattern.base': '验证码必须是6位数字',
    'string.empty': '验证码不能为空',
    'any.required': '验证码是必填项'
  }),
  
  // 日期验证 (YYYY-MM-DD)
  date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required().messages({
    'string.pattern.base': '日期格式必须为YYYY-MM-DD',
    'string.empty': '日期不能为空',
    'any.required': '日期是必填项'
  }),
  
  // 时间验证 (HH:MM)
  time: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).messages({
    'string.pattern.base': '时间格式必须为HH:MM'
  }),
  
  // 分页参数
  page: Joi.number().integer().min(1).default(1).messages({
    'number.base': '页码必须是数字',
    'number.integer': '页码必须是整数',
    'number.min': '页码最小为1'
  }),
  
  pageSize: Joi.number().integer().min(1).max(100).default(20).messages({
    'number.base': '每页数量必须是数字',
    'number.integer': '每页数量必须是整数',
    'number.min': '每页数量最小为1',
    'number.max': '每页数量最大为100'
  })
};

// 用户认证相关验证
const authSchemas = {
  // 微信登录
  wechatLogin: Joi.object({
    code: Joi.string().required().messages({
      'string.empty': '微信登录凭证不能为空',
      'any.required': '微信登录凭证是必填项'
    }),
    userInfo: Joi.object({
      nickName: Joi.string().required(),
      avatarUrl: Joi.string().uri().allow(''),
      gender: Joi.number().valid(0, 1, 2).default(0),
      country: Joi.string().allow(''),
      province: Joi.string().allow(''),
      city: Joi.string().allow(''),
      language: Joi.string().allow('')
    }).required()
  }),
  
  // 手机号登录
  phoneLogin: Joi.object({
    phoneNumber: commonSchemas.phoneNumber,
    verificationCode: commonSchemas.verificationCode
  }),
  
  // 手机号密码登录
  phonePasswordLogin: Joi.object({
    phoneNumber: commonSchemas.phoneNumber,
    password: Joi.string().min(6).max(20).required().messages({
      'string.min': '密码长度不能少于6位',
      'string.max': '密码长度不能超过20位',
      'string.empty': '密码不能为空',
      'any.required': '密码是必填项'
    })
  }),
  
  // 发送验证码
  sendVerificationCode: Joi.object({
    phoneNumber: commonSchemas.phoneNumber
  }),
  
  // Token验证
  validateToken: Joi.object({
    token: Joi.string().required().messages({
      'string.empty': 'Token不能为空',
      'any.required': 'Token是必填项'
    })
  })
};

// 用户信息相关验证
const userSchemas = {
  // 更新用户头像
  updateUserAvatar: Joi.object({
    avatarUrl: Joi.string().pattern(/^(\/uploads\/avatars\/[^\/]+|[a-zA-Z]+:\/\/.+)$/).required().messages({
      'string.pattern.base': '头像URL格式不正确，支持相对路径或完整URL',
      'string.empty': '头像URL不能为空',
      'any.required': '头像URL是必填项'
    })
  }),
  
  // 更新用户资料
  updateUserProfile: Joi.object({
    nickName: Joi.string().min(1).max(50).allow(null, '').messages({
      'string.min': '昵称至少1个字符',
      'string.max': '昵称最多50个字符'
    }),
    department: Joi.string().max(100).allow(null, '').messages({
      'string.max': '部门名称最多100个字符'
    }),
    phoneNumber: Joi.string().pattern(/^1[3-9]\d{9}$/).allow(null, '').messages({
      'string.pattern.base': '手机号格式不正确'
    }),
    email: Joi.string().email().allow(null, '').messages({
      'string.email': '邮箱格式不正确'
    })
  })
};

// 报餐相关验证
const diningSchemas = {
  // 获取菜单
  getMenu: Joi.object({
    date: commonSchemas.date,
    mealType: Joi.string().valid('breakfast', 'lunch', 'dinner').required().messages({
      'any.only': '餐次类型必须是breakfast、lunch或dinner之一',
      'any.required': '餐次类型是必填项'
    })
  }),
  
  // 提交部门报餐
  submitDeptOrder: Joi.object({
    date: commonSchemas.date,
    mealType: Joi.string().valid('breakfast', 'lunch', 'dinner').required(),
    memberIds: Joi.array().items(Joi.string()).min(1).required().messages({
      'array.min': '至少选择一名成员',
      'any.required': '成员列表是必填项'
    }),
    remark: Joi.string().max(500).allow('').messages({
      'string.max': '备注最多500个字符'
    })
  }),
  
  // 获取报餐记录
  getDiningRecords: Joi.object({
    date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).allow(''),
    startDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).allow(''),
    endDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).allow(''),
    status: Joi.string().valid('pending', 'confirmed', 'completed', 'cancelled').allow(''),
    page: commonSchemas.page,
    pageSize: commonSchemas.pageSize
  }).custom((value, helpers) => {
    // 验证日期范围逻辑
    const { date, startDate, endDate } = value;
    
    // 如果同时提供了date和startDate/endDate，优先使用date
    if (date && (startDate || endDate)) {
      return helpers.error('不能同时使用date和startDate/endDate参数');
    }
    
    // 如果提供了startDate和endDate，验证日期范围
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (start > end) {
        return helpers.error('开始日期不能晚于结束日期');
      }
      
      // 检查日期范围不能超过一年
      const oneYear = 365 * 24 * 60 * 60 * 1000;
      if (end - start > oneYear) {
        return helpers.error('查询时间范围不能超过一年');
      }
    }
    
    return value;
  })
};

// 特殊预约相关验证
const reservationSchemas = {
  // 提交特殊预约
  submitSpecialReservation: Joi.object({
    name: Joi.string().min(2).max(50).required().messages({
      'string.min': '姓名至少2个字符',
      'string.max': '姓名最多50个字符',
      'any.required': '姓名是必填项'
    }),
    phone: commonSchemas.phoneNumber,
    department: Joi.string().max(100).required().messages({
      'string.max': '部门名称最多100个字符',
      'any.required': '部门是必填项'
    }),
    date: commonSchemas.date,
    mealTime: Joi.string().required().messages({
      'any.required': '用餐时段是必填项'
    }),
    peopleCount: Joi.number().integer().min(1).max(20).required().messages({
      'number.min': '用餐人数至少1人',
      'number.max': '用餐人数最多20人',
      'any.required': '用餐人数是必填项'
    }),
    specialRequirements: Joi.string().max(500).allow('').messages({
      'string.max': '特殊需求最多500个字符'
    }),
    selectedDishes: Joi.array().items(Joi.number()).optional().default([]),
    totalAmount: Joi.number().min(0).required().messages({
      'number.min': '总金额不能为负数',
      'any.required': '总金额是必填项'
    })
  }),
  
  // 审核特殊预约
  auditSpecialReservation: Joi.object({
    reservationId: commonSchemas.id,
    action: Joi.string().valid('approve', 'reject').required().messages({
      'any.only': '审核动作必须是approve或reject',
      'any.required': '审核动作是必填项'
    }),
    comment: Joi.string().max(500).allow('').messages({
      'string.max': '审核意见最多500个字符'
    })
  })
};

// 场地预约相关验证
const venueSchemas = {
  // 获取场地列表
  getVenues: Joi.object({
    date: commonSchemas.date,
    type: Joi.string().valid('badminton', 'pingpong', 'basketball', 'other').allow('')
  }),
  
  // 提交场地预约
  submitReservation: Joi.object({
    venueId: commonSchemas.id,
    date: commonSchemas.date,
    startTime: commonSchemas.time.required(),
    endTime: commonSchemas.time.required(),
    userName: Joi.string().min(2).max(50).required().messages({
      'string.min': '预约人姓名至少2个字符',
      'string.max': '预约人姓名最多50个字符',
      'any.required': '预约人姓名是必填项'
    }),
    phoneNumber: commonSchemas.phoneNumber,
    purpose: Joi.string().max(200).required().messages({
      'string.max': '预约用途最多200个字符',
      'any.required': '预约用途是必填项'
    }),
    remark: Joi.string().max(500).allow('').messages({
      'string.max': '备注最多500个字符'
    })
  })
};

// 用餐验证相关验证
const verificationSchemas = {
  // 用餐验证
  verifyDining: Joi.object({
    verificationCode: Joi.string().required().messages({
      'string.empty': '验证码不能为空',
      'any.required': '验证码是必填项'
    }),
    diningPeople: Joi.number().integer().min(1).max(20).required().messages({
      'number.min': '用餐人数至少1人',
      'number.max': '用餐人数最多20人',
      'any.required': '用餐人数是必填项'
    }),
    remarks: Joi.string().max(200).allow('').messages({
      'string.max': '备注最多200个字符'
    }),
    verifyTime: Joi.string().isoDate().required().messages({
      'string.isoDate': '验证时间格式不正确',
      'any.required': '验证时间是必填项'
    })
  })
};

// 扫码就餐登记相关验证
const qrScanSchemas = {
  // 处理扫码登记
  processScan: Joi.object({
    qrCode: Joi.string().min(1).max(100).required().messages({
      'string.empty': '二维码标识不能为空',
      'string.min': '二维码标识至少1个字符',
      'string.max': '二维码标识最多100个字符',
      'any.required': '二维码标识是必填项'
    }),
    scanTime: Joi.string().isoDate().required().messages({
      'string.isoDate': '扫码时间格式不正确',
      'any.required': '扫码时间是必填项'
    })
  }),

  // 获取登记历史
  getHistory: Joi.object({
    startDate: Joi.string().isoDate().allow('').messages({
      'string.isoDate': '开始日期格式不正确'
    }),
    endDate: Joi.string().isoDate().allow('').messages({
      'string.isoDate': '结束日期格式不正确'
    }),
    mealType: Joi.string().valid('breakfast', 'lunch', 'dinner').allow('').messages({
      'any.only': '餐次类型只能是breakfast、lunch或dinner'
    }),
    limit: Joi.number().integer().min(1).max(100).default(50).messages({
      'number.min': '每页数量至少1条',
      'number.max': '每页数量最多100条'
    }),
    offset: Joi.number().integer().min(0).default(0).messages({
      'number.min': '偏移量不能小于0'
    })
  }),

  // 获取统计信息
  getStatistics: Joi.object({
    date: Joi.string().isoDate().allow('').messages({
      'string.isoDate': '日期格式不正确'
    })
  }),

  // 创建二维码
  createQRCode: Joi.object({
    name: Joi.string().min(2).max(100).required().messages({
      'string.empty': '二维码名称不能为空',
      'string.min': '二维码名称至少2个字符',
      'string.max': '二维码名称最多100个字符',
      'any.required': '二维码名称是必填项'
    }),
    location: Joi.string().min(2).max(200).required().messages({
      'string.empty': '张贴位置不能为空',
      'string.min': '张贴位置至少2个字符',
      'string.max': '张贴位置最多200个字符',
      'any.required': '张贴位置是必填项'
    }),
    description: Joi.string().max(500).allow('').messages({
      'string.max': '描述最多500个字符'
    })
  }),

  // 获取二维码列表
  getQRCodes: Joi.object({
    status: Joi.string().valid('active', 'inactive').allow('').messages({
      'any.only': '状态只能是active或inactive'
    }),
    limit: Joi.number().integer().min(1).max(200).default(100).messages({
      'number.min': '每页数量至少1条',
      'number.max': '每页数量最多200条'
    }),
    offset: Joi.number().integer().min(0).default(0).messages({
      'number.min': '偏移量不能小于0'
    })
  }),

  // 更新二维码状态
  updateQRCodeStatus: Joi.object({
    status: Joi.string().valid('active', 'inactive').required().messages({
      'any.only': '状态只能是active或inactive',
      'any.required': '状态是必填项'
    })
  })
};

/**
 * 验证中间件工厂函数
 * @param {Object} schema - Joi验证模式
 * @param {string} source - 验证数据源 'body' | 'query' | 'params'
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const data = req[source];
    const { error, value } = schema.validate(data, {
      abortEarly: false, // 返回所有错误
      allowUnknown: false, // 不允许未知字段
      stripUnknown: true // 删除未知字段
    });
    
    if (error) {
      const validationErrors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context.value
      }));
      
      return res.status(422).json({
        success: false,
        message: '参数验证失败',
        error: 'Validation Error',
        validationErrors
      });
    }
    
    // 将验证后的数据替换原数据
    req[source] = value;
    next();
  };
};

// 部门相关验证规则
const departmentSchemas = {
  // 创建部门
  createDepartment: Joi.object({
    name: Joi.string().min(2).max(100).required().messages({
      'string.empty': '部门名称不能为空',
      'string.min': '部门名称至少2个字符',
      'string.max': '部门名称最多100个字符',
      'any.required': '部门名称是必填项'
    }),
    code: Joi.string().min(2).max(20).pattern(/^[A-Z_]+$/).required().messages({
      'string.empty': '部门编码不能为空',
      'string.min': '部门编码至少2个字符',
      'string.max': '部门编码最多20个字符',
      'string.pattern.base': '部门编码只能包含大写字母和下划线',
      'any.required': '部门编码是必填项'
    }),
    description: Joi.string().max(500).allow('').messages({
      'string.max': '部门描述最多500个字符'
    }),
    parentId: Joi.string().uuid().allow(null).messages({
      'string.uuid': '父级部门ID格式不正确'
    }),
    level: Joi.number().integer().min(1).max(10).default(1).messages({
      'number.base': '部门层级必须是数字',
      'number.integer': '部门层级必须是整数',
      'number.min': '部门层级最小为1',
      'number.max': '部门层级最大为10'
    })
  }),

  // 更新部门
  updateDepartment: Joi.object({
    name: Joi.string().min(2).max(100).messages({
      'string.empty': '部门名称不能为空',
      'string.min': '部门名称至少2个字符',
      'string.max': '部门名称最多100个字符'
    }),
    code: Joi.string().min(2).max(20).pattern(/^[A-Z_]+$/).messages({
      'string.empty': '部门编码不能为空',
      'string.min': '部门编码至少2个字符',
      'string.max': '部门编码最多20个字符',
      'string.pattern.base': '部门编码只能包含大写字母和下划线'
    }),
    description: Joi.string().max(500).allow('').messages({
      'string.max': '部门描述最多500个字符'
    }),
    managerId: Joi.string().uuid().allow(null).messages({
      'string.uuid': '部门管理员ID格式不正确'
    })
  }),

  // 获取部门成员
  getDepartmentMembers: Joi.object({
    page: commonSchemas.page,
    pageSize: commonSchemas.pageSize,
    status: Joi.string().valid('active', 'inactive', 'pending', 'suspended').default('active').messages({
      'any.only': '状态值无效'
    }),
    role: Joi.string().valid('user', 'dept_admin', 'admin', 'sys_admin').messages({
      'any.only': '角色值无效'
    }),
    keyword: Joi.string().max(50).allow('').messages({
      'string.max': '搜索关键词最多50个字符'
    })
  })
};

// 增强版报餐验证规则
const diningEnhancedSchemas = {
  // 创建部门报餐
  createDepartmentOrder: Joi.object({
    date: commonSchemas.date,
    mealType: Joi.string().valid('breakfast', 'lunch', 'dinner').required().messages({
      'any.only': '餐次类型必须是breakfast、lunch或dinner',
      'any.required': '餐次类型是必填项'
    }),
    members: Joi.array().items(
      Joi.object({
        userId: Joi.string().uuid().required().messages({
          'string.uuid': '用户ID格式不正确',
          'any.required': '用户ID是必填项'
        })
      })
    ).min(1).required().messages({
      'array.min': '至少需要选择一个成员',
      'any.required': '成员列表是必填项'
    })
  }),

  // 获取部门报餐记录
  getDepartmentOrders: Joi.object({
    page: commonSchemas.page,
    pageSize: commonSchemas.pageSize,
    date: commonSchemas.date.optional(),
    mealType: Joi.string().valid('breakfast', 'lunch', 'dinner').messages({
      'any.only': '餐次类型必须是breakfast、lunch或dinner'
    }),
    startDate: commonSchemas.date.optional(),
    endDate: commonSchemas.date.optional()
  }),

  // 获取部门报餐统计
  getDepartmentStats: Joi.object({
    startDate: commonSchemas.date.optional(),
    endDate: commonSchemas.date.optional()
  })
};

module.exports = {
  validate,
  schemas: {
    common: commonSchemas,
    auth: authSchemas,
    user: userSchemas,
    dining: diningSchemas,
    diningEnhanced: diningEnhancedSchemas,
    reservation: reservationSchemas,
    venue: venueSchemas,
    verification: verificationSchemas,
    qrScan: qrScanSchemas,
    department: departmentSchemas,
    
    // 批量报餐验证规则
    batchDining: {
    // 批量报餐订单
    createBatchOrders: Joi.object({
      orders: Joi.array().items(
        Joi.object({
          date: commonSchemas.date,
          mealType: Joi.string().valid('breakfast', 'lunch', 'dinner').required().messages({
            'any.only': '餐次类型必须是breakfast、lunch或dinner',
            'any.required': '餐次类型是必填项'
          }),
          members: Joi.array().items(
            Joi.object({
              userId: Joi.string().uuid().required().messages({
                'string.uuid': '用户ID格式不正确',
                'any.required': '用户ID是必填项'
              })
            })
          ).min(1).required().messages({
            'array.min': '至少需要选择一个成员',
            'any.required': '成员列表是必填项'
          }),
          remark: Joi.string().max(500).allow('').messages({
            'string.max': '备注最多500个字符'
          })
        })
      ).min(1).max(20).required().messages({
        'array.min': '至少需要提交一个订单',
        'array.max': '单次最多只能提交20个订单',
        'any.required': '订单列表是必填项'
      })
    }),

    // 快速批量报餐
    createQuickBatchOrders: Joi.object({
      members: Joi.array().items(
        Joi.object({
          userId: Joi.string().uuid().required().messages({
            'string.uuid': '用户ID格式不正确',
            'any.required': '用户ID是必填项'
          })
        })
      ).min(1).max(50).required().messages({
        'array.min': '至少需要选择一个成员',
        'array.max': '单次最多只能选择50个成员',
        'any.required': '成员列表是必填项'
      }),
      meals: Joi.array().items(
        Joi.object({
          date: commonSchemas.date,
          mealType: Joi.string().valid('breakfast', 'lunch', 'dinner').required().messages({
            'any.only': '餐次类型必须是breakfast、lunch或dinner',
            'any.required': '餐次类型是必填项'
          })
        })
      ).min(1).max(10).required().messages({
        'array.min': '至少需要选择一个餐次',
        'array.max': '单次最多只能选择10个餐次',
        'any.required': '餐次列表是必填项'
      }),
      remark: Joi.string().max(500).allow('').messages({
        'string.max': '备注最多500个字符'
      })
    })
    }
  }
};
