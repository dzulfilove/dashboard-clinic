import cron from 'node-cron';
import axios from 'axios';
import { getWahaConfig } from './waha_config.js';
import { db } from './src/db/connection.js';

let activeCronTask: cron.ScheduledTask | null = null;

// Helper to format date in Indonesian (since it is used in the frontend template)
function formatTanggalIndo(dateStr: string) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  const formatter = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  return formatter.format(date);
}

export const initWahaCron = () => {
  if (activeCronTask) {
    activeCronTask.stop();
  }

  const config = getWahaConfig();
  if (!config.is_active) {
    console.log('WAHA Cron is disabled in config.');
    return;
  }

  const [hours, minutes] = config.cron_time.split(':');
  
  // Format: "minute hour * * *"
  const cronExpression = `${minutes} ${hours} * * *`;
  
  console.log(`Initializing WAHA Cron Job: running every day at ${config.cron_time}`);

  activeCronTask = cron.schedule(cronExpression, async () => {
    console.log('[WAHA Cron] Starting daily broadcast check...');
    try {
      // Find all followup_vaksin schedules for today that haven't been notified yet
      const followups = await db.query('SELECT * FROM followup_vaksin');
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const pendingList = followups.filter((f: any) => {
        if (!f.tanggal_rencana) return false;
        if (['Notified', 'Completed', 'Cancelled'].includes(f.status_rencana)) return false;
        const planDate = new Date(f.tanggal_rencana);
        planDate.setHours(0, 0, 0, 0);
        return planDate.getTime() === today.getTime() || planDate.getTime() < today.getTime(); // Include overdue
      });

      if (pendingList.length === 0) {
        console.log('[WAHA Cron] No pending followups for today.');
        return;
      }

      console.log(`[WAHA Cron] Found ${pendingList.length} pending followups. Sending messages...`);

      // Fetch patients to get no_telp
      const patients = await db.query('SELECT * FROM pasien');

      const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

      const wahaUrl = process.env.WAHA_URL || 'https://waha.purimedikabdl.com/';
      const session = process.env.WAHA_SESSION || 'default';
      const apiToken = process.env.WAHA_API_TOKEN || 'mysecretkeyPuryMedik4123';
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };
      if (apiToken) {
        headers['X-Api-Key'] = apiToken;
      }

      for (const item of pendingList) {
        const patient = patients.find((p: any) => p.no_rm === item.pasien_no_rm);
        let cleanPhone = patient?.no_telp?.replace(/\D/g, '') || '';
        if (!cleanPhone) continue;

        if (cleanPhone.startsWith('0')) {
          cleanPhone = '62' + cleanPhone.substring(1);
        }
        const chatId = `${cleanPhone}@c.us`;

        // Replace template variables
        let msg = config.message_template;
        msg = msg.replace(/{nama}/g, patient?.nama || item.pasien_nama || '');
        msg = msg.replace(/{paket_vaksin}/g, item.paket_vaksin || '-');
        msg = msg.replace(/{rencana_tindakan}/g, item.rencana_tindakan || item.diagnosa_keluhan || '-');
        msg = msg.replace(/{tanggal}/g, formatTanggalIndo(item.tanggal_rencana));
        msg = msg.replace(/{unit_kunjungan}/g, item.unit_kunjungan || 'Poli Vaksinasi');
        msg = msg.replace(/{kunjungan_ke}/g, item.rencana_kunjungan_ke || '-');

        console.log(`[WAHA Cron] Sending to ${chatId}: ${patient?.nama}`);

        try {
          await axios.post(`${wahaUrl}api/startTyping`, { session, chatId }, { headers, timeout: 5000 });
        } catch (e: any) {
           console.error('[WAHA Cron] startTyping error:', e.response?.data || e.message);
        }

        await delay(2000);

        try {
          await axios.post(`${wahaUrl}api/stopTyping`, { session, chatId }, { headers, timeout: 5000 });
        } catch (e: any) {
           console.error('[WAHA Cron] stopTyping error:', e.response?.data || e.message);
        }

        try {
          await axios.post(`${wahaUrl}api/sendText`, {
            session,
            chatId,
            text: msg
          }, { headers, timeout: 10000 });
          
          console.log(`[WAHA Cron] Successfully sent to ${chatId}`);

          // Update status
          const updatedCatatan = (item.catatan_hasil || '') + `\n[Broadcast WA otomatis (cron) pada ${new Date().toLocaleString('id-ID')}]`;
          await db.query(
            'UPDATE followup_vaksin SET status_rencana = ?, catatan_hasil = ? WHERE id = ?',
            ['Notified', updatedCatatan, item.id]
          );

        } catch (e: any) {
          console.error(`[WAHA Cron] sendText failed for ${chatId}:`, e.response?.data || e.message);
        }

        // Delay between messages to avoid ban
        await delay(3000);
      }
      
      console.log('[WAHA Cron] Finished processing all pending followups.');

    } catch (err: any) {
      console.error('[WAHA Cron] Error processing followups:', err.message);
    }
  });
};
