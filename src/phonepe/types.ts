export interface AuthTokenResponse {
  access_token: string;
  encrypted_access_token?: string;
  expires_in: number | null;
  issued_at: number;
  expires_at: number;
  session_expires_at?: number;
  token_type: string;
}

export interface CreatePaymentRequest {
  merchantOrderId: string;
  amount: number;
  expireAfter?: number;
  metaInfo?: Record<string, string>;
  paymentFlow: {
    type: "PG_CHECKOUT";
    message?: string;
    merchantUrls: { redirectUrl: string };
    paymentModeConfig?: Record<string, unknown>;
  };
}

export interface CreatePaymentResponse {
  orderId: string;
  state: string;
  expireAt: number;
  redirectUrl: string;
}

export interface OrderStatusResponse {
  orderId: string;
  state: "PENDING" | "FAILED" | "COMPLETED" | string;
  amount: number;
  expireAt?: number;
  metaInfo?: Record<string, string>;
  paymentDetails?: unknown[];
  errorCode?: string;
  detailedErrorCode?: string;
}

export interface RefundRequest {
  merchantRefundId: string;
  originalMerchantOrderId: string;
  amount: number;
}

export interface RefundResponse {
  refundId: string;
  amount: number;
  state: string;
}

export interface RefundStatusResponse {
  merchantId?: string;
  merchantRefundId: string;
  originalMerchantOrderId?: string;
  amount: number;
  state: string;
  paymentDetails?: unknown[];
  errorCode?: string;
  detailedErrorCode?: string;
}

export interface PhonePeApiError {
  code?: string;
  message?: string;
  data?: unknown;
}
