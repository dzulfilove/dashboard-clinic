import fs from 'fs';
import path from 'path';

const configPath = path.join(process.cwd(), 'waha_config.json');

export interface WahaConfig {
  cron_time: string;
  message_template: string;
  is_active: boolean;
}

const defaultConfig: WahaConfig = {
  cron_time: "08:00",
  message_template: "Halo Kak *{nama}*,\n\nIni adalah pengingat otomatis dari *Puri Medika*.\nJadwal kunjungan vaksinasi Kakak berikutnya adalah:\n\n📌 *Paket Vaksin*: {paket_vaksin}\n📌 *Rencana Jumlah Tindakan*: {rencana_tindakan} Tindakan\n📅 *Hari/Tanggal*: {tanggal}\n🏥 *Unit Pelayanan*: {unit_kunjungan}\n🔢 *Kunjungan Ke*: {kunjungan_ke}\n\nMohon konfirmasi kehadiran Kakak dengan membalas pesan ini. Terima kasih dan sehat selalu! ❤️",
  is_active: false
};

export const getWahaConfig = (): WahaConfig => {
  try {
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading waha_config.json', err);
  }
  return defaultConfig;
};

export const setWahaConfig = (config: WahaConfig) => {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing waha_config.json', err);
  }
};
