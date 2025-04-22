const {
  select,
  update
} = require('@evershop/postgres-query-builder');
const {
  pool
} = require('@evershop/evershop/src/lib/postgres/connection');
const {
  setContextValue
} = require('../../../../graphql/services/contextHelper');
const {
  getCartByUUID
} = require('@evershop/evershop/src/modules/checkout/services/getCartByUUID');
module.exports = async (request, response, delegate, next) => {
  // Check if any cart is associated with the session id
  const cart = await select()
    .from('cart')
    .where('sid', '=', request.sessionID)
    .andWhere('status', '=', 1)
    .load(pool);
  if (cart) {
    //将BuyNow 的cart进行处理
    let uuid = cart.uuid;
    let _uuid = cart.user_ip;

    if (_uuid) {
      if (_uuid == 'buynow') {
        await update('cart')
          .given({
            status: 0,
            user_ip: null
          })
          .where('uuid', '=', uuid)
          .execute(pool);
      } else {
        let _cart = await select()
          .from('cart')
          .where('uuid', '=', _uuid)
          .andWhere('status', '=', 0)
          .load(pool);
        if (_cart) {
          await update('cart')
            .given({
              status: 1
            })
            .where('uuid', '=', _cart.uuid)
            .execute(pool);
          await update('cart')
            .given({
              status: 0,
              user_ip: null
            })
            .where('uuid', '=', cart.uuid)
            .execute(pool);
          uuid = _cart.uuid;
        }
      }
    }
    setContextValue(request, 'cartId', uuid);
  } else {
    // Get the customer id from the session
    const customerID = request.session.customerID || null;
    if (customerID) {
      // Check if any cart is associated with the customer id
      const customerCart = await select()
        .from('cart')
        .where('customer_id', '=', customerID)
        .andWhere('status', '=', 1)
        .load(pool);

      if (customerCart) {
        // Update the cart with the session id
        await update('cart')
          .given({
            sid: request.sessionID
          })
          .where('uuid', '=', customerCart.uuid)
          .execute(pool);
        request.session.cartID = customerCart.uuid;
        setContextValue(request, 'cartId', customerCart.uuid);
      } else {
        setContextValue(request, 'cartId', undefined);
      }
    }
  }
  next();
};