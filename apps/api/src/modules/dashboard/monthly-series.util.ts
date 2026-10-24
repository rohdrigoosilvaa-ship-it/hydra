/** Últimos `months` meses (do mais antigo ao atual), com o rótulo curto do mês. */
export function lastMonths(months = 6, now = new Date()) {
  const labels = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
  return Array.from({ length: months }, (_, i) => {
    const start = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    return { label: labels[start.getMonth()]!, start, end };
  });
}

export interface MonthPoint {
  label: string;
  value: number;
}
