'use client';

interface CalendarHeaderProps {
  quarterDays: Date[];
  formatMonthDay: (date: Date) => string;
  getDayName: (date: Date) => string;
  isToday: (date: Date) => boolean;
  isWeekend: (date: Date) => boolean;
}

export default function CalendarHeader({
  quarterDays,
  formatMonthDay,
  getDayName,
  isToday,
  isWeekend
}: CalendarHeaderProps) {
  return (
    <thead className="bg-base-100 sticky top-0 z-30">
      <tr>
        <th className="bg-base-100 sticky left-0 z-50 text-center" style={{ minWidth: '120px', width: '120px' }}>
          Date
        </th>
        {quarterDays.map((day, index) => {
          const isNewMonth = index === 0 || day.getDate() === 1;
          return (
            <th
              key={day.toISOString()}
              className={`text-center px-2 ${
                isToday(day)
                  ? 'bg-primary text-primary-content'
                  : isWeekend(day)
                  ? 'bg-base-300'
                  : 'bg-base-100'
              } ${isNewMonth ? 'border-l-2 border-base-300' : ''}`}
              style={{ minWidth: '140px', width: '140px' }}
            >
              <div className="flex flex-col items-center">
                <div className="text-xs font-normal opacity-70">
                  {getDayName(day)}
                </div>
                <div className="text-sm font-bold">
                  {formatMonthDay(day)}
                </div>
              </div>
            </th>
          );
        })}
      </tr>
    </thead>
  );
}
