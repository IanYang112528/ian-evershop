const { del, select } = require('@evershop/postgres-query-builder');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const {
  OK,
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD
} = require('@evershop/evershop/src/lib/util/httpStatus');
const { join } = require('path');
const { unlinkSync,existsSync } = require('fs');
const { CONSTANTS } = require('@evershop/evershop/src/lib/helpers');
const deleteFile = (image)=>{
  const thumb = image.replace(/.([^.]*)$/, '-thumb.$1');
  const single = image.replace(/.([^.]*)$/, '-single.$1');
  const listing = image.replace(/.([^.]*)$/, '-list.$1');
  const arr = [image,thumb,single,listing];
  arr.map(item=>{
    const path = join(CONSTANTS.MEDIAPATH, item)
    if(existsSync(path)) {
      console.log("delete image",path)
      unlinkSync(path);
    }
  })
 
}
// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, delegate, next) => {
  try {
    const { id } = request.params;
    const query = select().from('product');
    query
      .leftJoin('product_description')
      .on(
        'product_description.product_description_product_id',
        '=',
        'product.product_id'
      );
    const product = await query.where('uuid', '=', id).load(pool);

    if (!product) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'Product not found'
        }
      });
      return;
    }
    if(product.image) {
      deleteFile( product.image);
      const productImage = await select().from('product_image').where('product_image_product_id', '=', product.product_id).execute(pool);
      productImage.map(item=>{
        deleteFile( item.image);
      })
    }
    
    await del('product').where('uuid', '=', id).execute(pool);
    response.status(OK);
    response.json({
      data: product
    });
  } catch (e) {
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: e.message
      }
    });
  }
};
