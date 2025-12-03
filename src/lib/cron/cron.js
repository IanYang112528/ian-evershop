const cron = require('node-cron');
const {
    emit
} = require('@evershop/evershop/src/lib/event/emitter');
async function start() {
    // 每2天执行一次 (0 0 */2 * *)
    await emit('upload_giga_product', {
        data: 'upload_giga_product'
    })
}
start();