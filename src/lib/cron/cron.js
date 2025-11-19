const cron = require('node-cron');
const {
    emit
} = require('@evershop/evershop/src/lib/event/emitter');
async function start() {
    // 每2天执行一次 (0 0 */2 * *)
    if (process.env.GAGAB2B_CRON) {
        cron.schedule(process.env.GAGAB2B_CRON, async () => {
            try {
                await emit('upload_giga_product')
            } catch (error) {
                console.error('定时任务执行失败:', error.message);
            }
        });
    }
}
start();