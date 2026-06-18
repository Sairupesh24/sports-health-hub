import { parseISO } from 'date-fns';

try {
  const d = new Date();
  const parsed = parseISO(d);
  console.log('parseISO(Date) returned:', parsed);
  console.log('is parsed instance of Date:', parsed instanceof Date);
  console.log('parsed time:', parsed.getTime());
} catch (e) {
  console.error('Error:', e);
}
