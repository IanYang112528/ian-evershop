const {
  select,
  update,
  del
} = require('@evershop/postgres-query-builder');
const {
  pool
} = require('@evershop/evershop/src/lib/postgres/connection');
const {
  debug
} = require('@evershop/evershop/src/lib/log/debuger');

module.exports = async (request, response, delegate, next) => {
  try {
    const {
      sessionID
    } = request;
    const customer = request.getCurrentCustomer();
    if (customer) {
      // Check if there is any cart with the same sid
      const cart = await select()
        .from('cart')
        .where('sid', '=', sessionID)
        .and('status', '=', 1)
        .load(pool);
      if (cart) {
        //查看当前账户下是否存在status = 1 的购物车
        const customerCart = await select()
          .from('cart')
          .where('customer_id', '=', customer.customer_id)
          .and('status', '=', 1)
          .load(pool);
        if (customerCart && customerCart.cart_id != cart.cart_id) {
          //将当前cusstomerCart清除掉，并将cart_item更新到
          await update('cart_item')
            .given({
              cart_id: cart.cart_id
            })
            .where('cart_id', '=', customerCart.cart_id)
            .execute(pool);
          await del('cart')
            .where('cart_id', '=', customerCart.cart_id)
            .execute(pool);
        }
        await update('cart')
          .given({
            customer_group_id: customer.group_id,
            customer_id: customer.customer_id,
            customer_full_name: customer.full_name,
            customer_email: customer.email
          })
          .where('cart_id', '=', cart.cart_id)
          .execute(pool);
      }
    }
  } catch (error) {
    debug('critical', error);
  }
  next();
};