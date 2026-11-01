export interface Trip {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  description: string;
  places: string[];
  color?: string;
}

export interface Holiday {
  id: string;
  date: string;
  name: string;
  color: string;
}