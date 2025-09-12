-- 创建安全令牌表
CREATE TABLE IF NOT EXISTS qr_secure_tokens (
  _id VARCHAR(36) PRIMARY KEY,
  secureToken VARCHAR(64) NOT NULL UNIQUE,
  qrCode VARCHAR(50) NOT NULL,
  createdAt DATETIME NOT NULL,
  expiresAt DATETIME NOT NULL,
  isUsed TINYINT(1) DEFAULT 0,
  usedAt DATETIME NULL,
  usedBy VARCHAR(36) NULL,
  createdAt_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX idx_secure_token ON qr_secure_tokens(secureToken);
CREATE INDEX idx_qr_code ON qr_secure_tokens(qrCode);
CREATE INDEX idx_expires_at ON qr_secure_tokens(expiresAt);
CREATE INDEX idx_is_used ON qr_secure_tokens(isUsed);

-- 创建用户身份验证表
CREATE TABLE IF NOT EXISTS user_identifiers (
  _id VARCHAR(36) PRIMARY KEY,
  userId VARCHAR(36) NOT NULL,
  identifierType ENUM('employee_id', 'phone', 'email', 'ip_address') NOT NULL,
  identifierValue VARCHAR(100) NOT NULL,
  isActive TINYINT(1) DEFAULT 1,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_identifier (identifierType, identifierValue)
);

-- 创建索引
CREATE INDEX idx_user_id ON user_identifiers(userId);
CREATE INDEX idx_identifier_type ON user_identifiers(identifierType);
CREATE INDEX idx_identifier_value ON user_identifiers(identifierValue);
