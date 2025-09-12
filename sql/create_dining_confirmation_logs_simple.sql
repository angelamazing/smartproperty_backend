CREATE TABLE IF NOT EXISTS dining_confirmation_logs (
  _id VARCHAR(36) PRIMARY KEY COMMENT '日志ID',
  orderId VARCHAR(36) NOT NULL COMMENT '订单ID',
  userId VARCHAR(36) NOT NULL COMMENT '用户ID',
  userName VARCHAR(50) NOT NULL COMMENT '用户姓名',
  confirmationType ENUM('manual', 'qr', 'admin') NOT NULL COMMENT '确认类型：manual-手动确认，qr-扫码确认，admin-管理员代确认',
  confirmationTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '确认时间',
  remark TEXT COMMENT '备注信息',
  confirmedBy VARCHAR(36) COMMENT '确认人ID（管理员代确认时使用）',
  createTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  
  INDEX idx_order_id (orderId),
  INDEX idx_user_id (userId),
  INDEX idx_confirmation_time (confirmationTime),
  INDEX idx_confirmation_type (confirmationType),
  
  FOREIGN KEY (orderId) REFERENCES dining_orders(_id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES users(_id) ON DELETE CASCADE,
  FOREIGN KEY (confirmedBy) REFERENCES users(_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='就餐确认日志表';
