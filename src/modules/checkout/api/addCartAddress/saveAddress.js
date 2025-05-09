/* eslint-disable camelcase */
const { insert, select,update } = require('@evershop/postgres-query-builder');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const {
  INVALID_PAYLOAD,
  OK,
  INTERNAL_SERVER_ERROR
} = require('@evershop/evershop/src/lib/util/httpStatus');
const { getCartByUUID } = require('../../services/getCartByUUID');
const { saveCart } = require('../../services/saveCart');
const {
  validateAddress
} = require('../../../customer/services/addressValidator');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, delegate, next) => {
  try {
    const { cart_id } = request.params;
    const { address, type } = request.body;
    // Check if cart exists
    const cart = await getCartByUUID(cart_id);
    if (!cart) {
      response.status(INVALID_PAYLOAD);
      return response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'Invalid cart'
        }
      });
    }
    // Use shipping address as a billing address
    // Validate address
    validateAddress(address);
    // Save billing address
    let shipping_address_id = cart.data.shipping_address_id;
    if(shipping_address_id){
      await update('cart_address')
      .given({
        ...address
      })
      .where('cart_address_id', '=', cart.data.shipping_address_id)
      .execute(pool);
    }else {
      const result = await insert('cart_address').given(address).execute(pool);
      shipping_address_id = result.insertId;
    }
    // Set address ID to cart
    if (type === 'shipping') {
      // Find the shipping zone
      const shippingZoneQuery = select().from('shipping_zone');
      shippingZoneQuery
        .leftJoin('shipping_zone_province')
        .on(
          'shipping_zone_province.zone_id',
          '=',
          'shipping_zone.shipping_zone_id'
        );
      shippingZoneQuery.where('shipping_zone.country', '=', address.country);

      const shippingZoneProvinces = await shippingZoneQuery.execute(pool);
      const zone = shippingZoneProvinces.find(
        (p) => p.province === address.province || p.province === null
      );
      if (!zone) {
        await cart.setData('shipping_address_id', null);
        await saveCart(cart);
        response.status(INVALID_PAYLOAD);
        return response.json({
          error: {
            status: INVALID_PAYLOAD,
            message: 'We do not ship to this address'
          }
        });
      }

      await cart.setData(
        'shipping_zone_id',
        parseInt(zone.shipping_zone_id, 10)
      );
      await cart.setData('shipping_address_id', parseInt(shipping_address_id, 10));
    } else {
      await cart.setData('billing_address_id', parseInt(shipping_address_id, 10));
    }
    // Save cart
    await saveCart(cart);

    const createdAddress = await select()
      .from('cart_address')
      .where('cart_address_id', '=', shipping_address_id)
      .load(pool);

    response.status(OK);
    return response.json({
      data: createdAddress
    });
  } catch (e) {
    response.status(INTERNAL_SERVER_ERROR);
    return response.json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: e.message
      }
    });
  }
};
