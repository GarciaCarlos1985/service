import { z } from 'zod'

export const weekDays = [
  { id: 'mon', name: 'Segunda-feira' },
  { id: 'tue', name: 'Terça-feira' },
  { id: 'wed', name: 'Quarta-feira' },
  { id: 'thu', name: 'Quinta-feira' },
  { id: 'fri', name: 'Sexta-feira' },
  { id: 'sat', name: 'Sábado' },
  { id: 'sun', name: 'Domingo' },
] as const
export type WeekDay = (typeof weekDays)[number]['id']
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Informe um horário válido.')
const periodSchema = z.object({ start: time, end: time }).strict()
export type HoursPeriod = z.infer<typeof periodSchema>
export type DayHours = { closed: boolean; all_day: boolean; periods: HoursPeriod[] }
const daySchema = z
  .object({ closed: z.boolean(), all_day: z.boolean(), periods: z.array(periodSchema).max(3) })
  .strict()
  .superRefine((day, context) => {
    if ((day.closed && (day.all_day || day.periods.length)) || (day.all_day && day.periods.length))
      context.addIssue({ code: 'custom', message: 'Revise as opções de funcionamento deste dia.' })
    if (!day.closed && !day.all_day && !day.periods.length)
      context.addIssue({
        code: 'custom',
        path: ['periods'],
        message: 'Adicione um intervalo de atendimento.',
      })
    day.periods.forEach((period, index) => {
      if (period.start === period.end)
        context.addIssue({
          code: 'custom',
          path: ['periods', index, 'end'],
          message: 'A saída deve ser diferente da entrada. Para o dia inteiro, marque 24 horas.',
        })
    })
  })
const daysSchema = z
  .object({
    mon: daySchema,
    tue: daySchema,
    wed: daySchema,
    thu: daySchema,
    fri: daySchema,
    sat: daySchema,
    sun: daySchema,
  })
  .strict()
const minutes = (value: string) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3))
export const weeklyHoursSchema = z
  .object({
    days: daysSchema,
    notes: z.string().max(1000, 'Use até 1.000 caracteres nas observações.'),
  })
  .strict()
  .superRefine((week, context) => {
    const spans: { start: number; end: number; day: WeekDay; period: number }[] = []
    weekDays.forEach(({ id }, index) => {
      const day = week.days[id]
      if (day.closed) return
      const periods = day.all_day ? [{ start: '00:00', end: '00:00' }] : day.periods
      periods.forEach((period, periodIndex) => {
        const start = minutes(period.start),
          end = minutes(period.end)
        spans.push({
          start: index * 1440 + start,
          end: index * 1440 + end + (day.all_day || end < start ? 1440 : 0),
          day: id,
          period: periodIndex,
        })
      })
    })
    for (const [index, current] of spans.entries()) {
      for (const other of spans.slice(index + 1)) {
        if (
          [0, -10080, 10080].some(
            (offset) => current.start < other.end + offset && other.start + offset < current.end,
          )
        )
          context.addIssue({
            code: 'custom',
            path: ['days', other.day, 'periods', other.period, 'start'],
            message:
              'Este intervalo coincide com outro horário da semana. Revise as entradas e saídas.',
          })
      }
    }
  })
export type WeeklyHours = z.infer<typeof weeklyHoursSchema>
export function emptyWeek(notes = ''): WeeklyHours {
  const closed = (): DayHours => ({ closed: true, all_day: false, periods: [] })
  return {
    days: {
      mon: closed(),
      tue: closed(),
      wed: closed(),
      thu: closed(),
      fri: closed(),
      sat: closed(),
      sun: closed(),
    },
    notes,
  }
}
export function cleanWeek(week: WeeklyHours): WeeklyHours {
  return {
    ...week,
    days: Object.fromEntries(
      weekDays.map(({ id }) => {
        const day = week.days[id]
        return [
          id,
          {
            ...day,
            all_day: !day.closed && day.all_day,
            periods:
              day.closed || day.all_day
                ? []
                : [...day.periods].sort((a, b) => a.start.localeCompare(b.start)),
          },
        ]
      }),
    ) as WeeklyHours['days'],
  }
}
export function dayHoursText(day: DayHours): string {
  if (day.closed) return 'Fechado'
  if (day.all_day) return '24 horas'
  return day.periods
    .map(({ start, end }) => `${start}–${end}${end < start ? ' (dia seguinte)' : ''}`)
    .join(' · ')
}
export function weekHoursText(week: WeeklyHours): string {
  return [
    ...weekDays.map(({ id, name }) => `${name}: ${dayHoursText(week.days[id])}`),
    ...(week.notes.trim() ? [week.notes.trim()] : []),
  ].join('\n')
}
