"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.NganLuong = undefined;

var _simplSchema = require("simpl-schema");

var _simplSchema2 = _interopRequireDefault(_simplSchema);

var _axios = require("axios");

var _axios2 = _interopRequireDefault(_axios);

var _xml2js = require("xml2js");

var _utils = require("../utils");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/*
 * @Author: leopham - hongthaipro@gmail.com
 * @Date: 2019-01-05 10:59:56
 * @Last Modified by: leopham - hongthaipro@gmail.com
 * @Last Modified time: 2019-01-05 14:14:59
 */
class NganLuong {
  constructor(config) {
    this.config = Object.assign({}, config);
  }

  buildCheckoutUrl(payload) {
    return new Promise((resolve, reject) => {
      // Object tham số chuyển tới NganLuong Payment
      const data = Object.assign({}, this.checkoutPayloadDefaults, payload);
      const config = this.config;
      data.nganluongSecretKey = config.secureSecret;
      data.nganluongMerchant = config.merchant;
      data.receiverEmail = config.receiverEmail; // Input type checking

      try {
        this.validateCheckoutPayload(data);
      } catch (error) {
        reject(error.message);
      } // Step 1: Map data to ngan luong checkout params

      /* prettier-ignore */


      const arrParam = {
        function: data.nganluongCommand,
        cur_code: data.currency ? data.currency.toLowerCase() : 'vnd',
        version: data.nganluongVersion,
        merchant_id: data.nganluongMerchant,
        receiver_email: data.receiverEmail,
        merchant_password: (0, _utils.createMd5Hash)(data.nganluongSecretKey),
        order_code: data.orderId,
        total_amount: String(data.amount),
        payment_method: data.paymentMethod,
        bank_code: data.bankCode,
        payment_type: data.paymentType,
        order_description: data.orderInfo,
        tax_amount: data.taxAmount,
        fee_shipping: data.feeShipping || '0',
        discount_amount: data.discountAmount || '0',
        return_url: data.returnUrl,
        cancel_url: data.cancelUrl,
        buyer_fullname: data.customerName,
        buyer_email: data.customerEmail,
        buyer_mobile: data.customerPhone,
        buyer_address: data.billingStreet,
        time_limit: data.timeLimit,
        lang_code: data.locale,
        affiliate_code: data.affiliateCode,
        total_item: data.totalItem
      }; // Step 2: Post checkout data to ngan luong server

      const url = config.paymentGateway;
      const params = [];
      Object.keys(arrParam).forEach(key => {
        const value = arrParam[key];

        if (value == null || value.length === 0) {
          // skip empty params (but they must be optional)
          return;
        }

        if (value.length > 0) {
          params.push(`${key}=${encodeURI(value)}`);
        }
      });
      const options = {
        method: 'POST'
      };

      _axios2.default.post(`${url}?${params.join('&')}`).then(rs => {
        (0, _xml2js.parseString)(rs.data, (err, result) => {
          const objectResponse = result.result || {};

          if (objectResponse.error_code[0] === '00') {
            resolve({
              href: objectResponse.checkout_url[0]
            });
          } else {
            reject(new Error(objectResponse.description[0]));
          }
        });
      });
    });
  }

  validateCheckoutPayload(payload) {
    NganLuong.checkoutSchema.validate(payload);
  }

  get checkoutPayloadDefaults() {
    /* prettier-ignore */
    return {
      currency: NganLuong.CURRENCY_VND,
      locale: NganLuong.LOCALE_VN,
      nganluongVersion: NganLuong.VERSION,
      nganluongCommand: NganLuong.COMMAND
    };
  }

  verifyReturnUrl(query) {
    return new Promise(resolve => {
      const data = {};
      const config = this.config;
      const token = query.token || query.token_nl;

      if (!token) {
        resolve({
          isSuccess: false,
          message: 'No token found'
        });
      }

      data.nganluongSecretKey = config.secureSecret;
      data.nganluongMerchant = config.merchant;
      data.receiverEmail = config.receiverEmail; // Step 1: Map data to ngan luong get detail params

      /* prettier-ignore */

      const arrParam = {
        merchant_id: data.nganluongMerchant,
        merchant_password: (0, _utils.createMd5Hash)(data.nganluongSecretKey),
        version: data.nganluongVersion,
        function: 'GetTransactionDetail',
        token
      }; // Step 2: Post checkout data to ngan luong server

      const url = config.paymentGateway;
      const params = [];
      Object.keys(arrParam).forEach(key => {
        const value = arrParam[key];

        if (value == null || value.length === 0) {
          // skip empty params (but they must be optional)
          return;
        }

        if (value.length > 0) {
          params.push(`${key}=${encodeURIComponent(value)}`);
        }
      });

      _axios2.default.post(`${url}?${params.join('&')}`).then(rs => {
        (0, _xml2js.parseString)(rs.data, (err, result) => {
          const objectResponse = result.result || {};

          if (objectResponse.error_code[0] === '00') {
            objectResponse.merchant = data.nganluongMerchant;

            const returnObject = this._mapQueryToObject(objectResponse);

            resolve(Object.assign({}, returnObject, {
              isSuccess: true
            }));
          } else {
            resolve({
              isSuccess: false,
              message: objectResponse.description || NganLuong.getReturnUrlStatus(objectResponse.error_code[0])
            });
          }
        });
      });
    });
  }

  _mapQueryToObject(query) {
    const returnObject = {};
    Object.keys(query).forEach(key => {
      returnObject[key] = query[key][0];
    });
    return Object.assign({}, returnObject, {
      merchant: returnObject.merchant,
      transactionId: returnObject.order_code,
      amount: returnObject.total_amount,
      orderInfo: returnObject.order_description,
      responseCode: returnObject.transaction_status,
      bankCode: returnObject.bank_code,
      gatewayTransactionNo: returnObject.transaction_id,
      message: returnObject.description || NganLuong.getReturnUrlStatus(returnObject.error_code),
      customerEmail: returnObject.buyer_email,
      customerPhone: returnObject.buyer_mobile,
      customerName: returnObject.buyer_fullname
    });
  }

  static getReturnUrlStatus(responseCode, locale = 'vn') {
    const responseCodeTable = {
      '00': {
        vn: 'Giao dịch thành công',
        en: 'Approved'
      },
      '02': {
        vn: 'Địa chỉ IP của merchant gọi tới NganLuong.vn không được chấp nhận',
        en: 'Invalid IP Address'
      },
      '03': {
        vn: 'Sai tham số gửi tới NganLuong.vn (có tham số sai tên hoặc kiểu dữ liệu)',
        en: 'Sent data is not in the right format'
      },
      '04': {
        vn: 'Tên hàm API do merchant gọi tới không hợp lệ (không tồn tại)',
        en: 'API function name not found'
      },
      '05': {
        vn: 'Sai version của API',
        en: 'Wrong API version'
      },
      '06': {
        vn: 'Mã merchant không tồn tại hoặc chưa được kích hoạt',
        en: 'Merchant code not found or not activated yet'
      },
      '07': {
        vn: 'Sai mật khẩu của merchant',
        en: 'Wrong merchant password'
      },
      '08': {
        vn: 'Tài khoản người bán hàng không tồn tại',
        en: 'Seller account not found'
      },
      '09': {
        vn: 'Tài khoản người nhận tiền đang bị phong tỏa',
        en: 'Receiver account is frozen'
      },
      10: {
        vn: 'Hóa đơn thanh toán không hợp lệ',
        en: 'Invalid payment bill'
      },
      11: {
        vn: 'Số tiền thanh toán không hợp lệ',
        en: 'Invalid amount'
      },
      12: {
        vn: 'Đơn vị tiền tệ không hợp lệ',
        en: 'Invalid money currency'
      },
      29: {
        vn: 'Token không tồn tại',
        en: 'Token not found'
      },
      80: {
        vn: 'Không thêm được đơn hàng',
        en: "Can't add more order"
      },
      81: {
        vn: 'Đơn hàng chưa được thanh toán',
        en: 'The order has not yet been paid'
      },
      110: {
        vn: 'Địa chỉ email tài khoản nhận tiền không phải email chính',
        en: 'The email address is not the primary email'
      },
      111: {
        vn: 'Tài khoản nhận tiền đang bị khóa',
        en: 'Receiver account is locked'
      },
      113: {
        vn: 'Tài khoản nhận tiền chưa cấu hình là người bán nội dung số',
        en: 'Receiver account is not configured as digital content sellers'
      },
      114: {
        vn: 'Giao dịch đang thực hiện, chưa kết thúc',
        en: 'Pending transaction'
      },
      115: {
        vn: 'Giao dịch bị hủy',
        en: 'Cancelled transaction'
      },
      118: {
        vn: 'tax_amount không hợp lệ',
        en: 'Invalid tax_amount'
      },
      119: {
        vn: 'discount_amount không hợp lệ',
        en: 'Invalid discount_amount'
      },
      120: {
        vn: 'fee_shipping không hợp lệ',
        en: 'Invalid fee_shipping'
      },
      121: {
        vn: 'return_url không hợp lệ',
        en: 'Invalid return_url'
      },
      122: {
        vn: 'cancel_url không hợp lệ',
        en: 'Invalid cancel_url'
      },
      123: {
        vn: 'items không hợp lệ',
        en: 'Invalid items'
      },
      124: {
        vn: 'transaction_info không hợp lệ',
        en: 'Invalid transaction_info'
      },
      125: {
        vn: 'quantity không hợp lệ',
        en: 'Invalid quantity'
      },
      126: {
        vn: 'order_description không hợp lệ',
        en: 'Invalid order_description'
      },
      127: {
        vn: 'affiliate_code không hợp lệ',
        en: 'Invalid affiliate_code'
      },
      128: {
        vn: 'time_limit không hợp lệ',
        en: 'Invalid time_limit'
      },
      129: {
        vn: 'buyer_fullname không hợp lệ',
        en: 'Invalid buyer_fullname'
      },
      130: {
        vn: 'buyer_email không hợp lệ',
        en: 'Invalid buyer_email'
      },
      131: {
        vn: 'buyer_mobile không hợp lệ',
        en: 'Invalid buyer_mobile'
      },
      132: {
        vn: 'buyer_address không hợp lệ',
        en: 'Invalid buyer_address'
      },
      133: {
        vn: 'total_item không hợp lệ',
        en: 'Invalid total_item'
      },
      134: {
        vn: 'payment_method, bank_code không hợp lệ',
        en: 'Invalid payment_method, bank_code'
      },
      135: {
        vn: 'Lỗi kết nối tới hệ thống ngân hàng',
        en: 'Error connecting to banking system'
      },
      140: {
        vn: 'Đơn hàng không hỗ trợ thanh toán trả góp',
        en: 'The order does not support installment payments'
      },
      99: {
        vn: 'Lỗi không được định nghĩa hoặc không rõ nguyên nhân',
        en: 'Unknown error'
      },
      default: {
        vn: 'Giao dịch thất bại',
        en: 'Failured'
      }
    };
    const respondText = responseCodeTable[responseCode];
    return respondText ? respondText[locale] : responseCodeTable.default[locale];
  }

}

NganLuong.checkoutSchema = new _simplSchema2.default({
  createdDate: {
    type: String,
    optional: true
  },
  amount: {
    type: _simplSchema2.default.Integer
  },
  clientIp: {
    type: String,
    optional: true,
    max: 16
  },
  currency: {
    type: String,
    allowedValues: ['vnd', 'VND', 'USD', 'usd']
  },
  billingCity: {
    type: String,
    optional: true,
    max: 255
  },
  billingCountry: {
    type: String,
    optional: true,
    max: 255
  },
  billingPostCode: {
    type: String,
    optional: true,
    max: 255
  },
  billingStateProvince: {
    type: String,
    optional: true,
    max: 255
  },
  billingStreet: {
    type: String,
    optional: true,
    max: 255
  },
  customerId: {
    type: String,
    optional: true,
    max: 255
  },
  deliveryAddress: {
    type: String,
    optional: true,
    max: 255
  },
  deliveryCity: {
    type: String,
    optional: true,
    max: 255
  },
  deliveryCountry: {
    type: String,
    optional: true,
    max: 255
  },
  deliveryProvince: {
    type: String,
    optional: true,
    max: 255
  },
  locale: {
    type: String,
    allowedValues: ['vi', 'en']
  },
  orderId: {
    type: String,
    max: 50
  },
  receiverEmail: {
    type: String,
    max: 255,
    regEx: _simplSchema2.default.RegEx.Email
  },
  paymentMethod: {
    type: String,
    allowedValues: ['NL', 'VISA', 'MASTER', 'JCB', 'ATM_ONLINE', 'ATM_OFFLINE', 'NH_OFFLINE', 'TTVP', 'CREDIT_CARD_PREPAID', 'IB_ONLINE']
  },
  bankCode: {
    type: String,
    optional: true,
    max: 50,

    custom() {
      let shouldBeRequired = false;
      const method = this.field('paymentMethod').value;

      if (['ATM_ONLINE', 'ATM_OFFLINE', 'NH_OFFLINE', 'CREDIT_CARD_PREPAID'].indexOf(method) > -1) {
        shouldBeRequired = true;
      }

      if (shouldBeRequired && (this.value == null || this.value === '')) {
        return _simplSchema2.default.ErrorTypes.REQUIRED;
      } // field is valid


      return undefined;
    }

  },
  paymentType: {
    type: String,
    optional: true,
    allowedValues: ['1', '2']
  },
  orderInfo: {
    type: String,
    optional: true,
    max: 500
  },
  taxAmount: {
    type: _simplSchema2.default.Integer,
    optional: true
  },
  discountAmount: {
    type: _simplSchema2.default.Integer,
    optional: true
  },
  feeShipping: {
    type: _simplSchema2.default.Integer,
    optional: true
  },
  customerEmail: {
    type: String,
    max: 255,
    regEx: _simplSchema2.default.RegEx.Email
  },
  customerPhone: {
    type: String,
    max: 255
  },
  customerName: {
    type: String,
    max: 255
  },
  returnUrl: {
    type: String,
    max: 255
  },
  cancelUrl: {
    type: String,
    max: 255,
    optional: true
  },
  timeLimit: {
    type: _simplSchema2.default.Integer,
    optional: true
  },
  // minutes
  affiliateCode: {
    type: String,
    max: 255,
    optional: true
  },
  totalItem: {
    type: String,
    optional: true
  },
  transactionId: {
    type: String,
    max: 50
  },
  nganluongSecretKey: {
    type: String,
    max: 32
  },
  nganluongMerchant: {
    type: String,
    max: 16
  },
  nganluongCommand: {
    type: String,
    max: 32
  },
  nganluongVersion: {
    type: String,
    max: 3
  }
});
NganLuong.configSchema = new _simplSchema2.default({
  paymentGateway: {
    type: String,
    regEx: _simplSchema2.default.RegEx.Url
  },
  merchant: {
    type: String
  },
  receiverEmail: {
    type: String
  },
  secureSecret: {
    type: String
  }
}); // should not be changed

NganLuong.VERSION = '3.1';
NganLuong.COMMAND = 'SetExpressCheckout'; // nganluong only support VND

NganLuong.CURRENCY_VND = 'vnd';
NganLuong.LOCALE_EN = 'en';
NganLuong.LOCALE_VN = 'vi';
exports.NganLuong = NganLuong;
//# sourceMappingURL=ngan-luong.js.map