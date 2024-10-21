const { del, select } = require('@evershop/postgres-query-builder');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const {
  OK,
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD
} = require('@evershop/evershop/src/lib/util/httpStatus');
const { join } = require('path');
const { rmdirSync,existsSync } = require('fs');
const { CONSTANTS } = require('@evershop/evershop/src/lib/helpers');
const getSecondDirctory = (filePath) => {
  // 查找最后一个斜杠的位置
  const lastSlashIndex = filePath.lastIndexOf("/")
  // 查找倒数第二个斜杠的位置
  const secondLastSlashIndex = filePath.lastIndexOf("/", lastSlashIndex - 1)
  if (secondLastSlashIndex !== -1) {
    return filePath.substring(0, secondLastSlashIndex)
  }
  return null
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
      const path = join(CONSTANTS.MEDIAPATH, getSecondDirctory(product.image))
      if(existsSync(path)) {
        rmdirSync(path,{ recursive: true });
      }
      const productImage = await select().from('product_image').where('product_image_product_id', '=', product.product_id).execute(pool);
      productImage.map(item=>{
        const path = join(CONSTANTS.MEDIAPATH, getSecondDirctory(item.image))
        if(existsSync(path)) {
          rmdirSync(path,{ recursive: true });
        }
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
