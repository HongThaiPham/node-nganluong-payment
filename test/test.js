const { NganLuong } = require('../dist/index');
const payment = {
  merchant: '47135',
  paymentGateway:
    'https://sandbox.nganluong.vn:8088/nl30/checkout.api.nganluong.post.php',
  receiverEmail: 'hongthai@lhu.edu.vn',
  secureSecret: '87bc74ead5c6aa5c6ba43fdf1984dac7',
  currency: 'vnd',
  locale: 'vi',
  paymentMethod: 'ATM_ONLINE',
  paymentType: '1',
  returnUrl: 'http://localhost:4200/payment/nganluong/callback'
};
const xxx = new NganLuong({
  paymentGateway: payment.paymentGateway,
  merchant: payment.merchant,
  receiverEmail: payment.receiverEmail,
  secureSecret: payment.secureSecret
});
const main = async () => {
  try {
    const url = await xxx.buildCheckoutUrl({
      amount: 100000,
      orderId: '112321sd',
      paymentMethod: 'ATM_ONLINE',
      bankCode: 'EXB',
      customerEmail: 'aaa@gmail.com',
      customerPhone: '0367123250',
      customerName: 'leo',
      returnUrl: payment.returnUrl,
      transactionId: 'asds'
    });
    console.log(url);
  } catch (error) {
    console.log(error);
  }
};

const verify = async query => {
  try {
    const ok = await xxx.verifyReturnUrl(query);
    console.log(ok);
  } catch (error) {
    console.log(error);
  }
};
verify({
  error_code: '00',
  token: '102474-453c07a9123ff58e6b33c784470033dd',
  order_code: '112321sd',
  order_id: '102474'
});
// main();
