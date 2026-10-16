import { ClientSession } from 'mongoose';
import { Counter } from '../models/Counter';

export const generateInvoiceNumber = async (session?: ClientSession): Promise<string> => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateKey = `${year}${month}${day}`;
  const counterKey = `INV-${dateKey}`;

  const counter = await Counter.findOneAndUpdate(
    { key: counterKey },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, session }
  );

  const seqPadded = String(counter.seq).padStart(4, '0');
  return `INV-${dateKey}-${seqPadded}`;
};
