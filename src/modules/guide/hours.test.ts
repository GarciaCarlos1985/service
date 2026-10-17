import { describe, expect, it } from 'vitest'
import { cleanWeek, dayHoursText, emptyWeek, weeklyHoursSchema, weekHoursText } from './hours'

describe('horários de funcionamento', () => {
  it('distingue dias fechados, horários e 24 horas sem inventar uma rotina', () => {
    const week = emptyWeek('Nos feriados, consulte a empresa.')
    week.days.mon = {
      closed: false,
      all_day: false,
      periods: [
        { start: '08:00', end: '12:00' },
        { start: '13:30', end: '18:00' },
      ],
    }
    week.days.sat = { closed: false, all_day: true, periods: [] }
    expect(weeklyHoursSchema.parse(week)).toEqual(week)
    expect(weekHoursText(week)).toContain('Segunda-feira: 08:00–12:00 · 13:30–18:00')
    expect(weekHoursText(week)).toContain('Domingo: Fechado')
    expect(dayHoursText(week.days.sat)).toBe('24 horas')
    expect(week.days.tue).not.toBe(week.days.wed)
  })
  it.each(['25:00', '08:61', '8:00', '', '08:00:00'])(
    'recusa horário incompleto ou inválido: %s',
    (start) => {
      const week = emptyWeek()
      week.days.mon = { closed: false, all_day: false, periods: [{ start, end: '18:00' }] }
      expect(weeklyHoursSchema.safeParse(week).success).toBe(false)
    },
  )
  it('recusa entradas iguais às saídas e intervalos sobrepostos', () => {
    const week = emptyWeek()
    week.days.mon = { closed: false, all_day: false, periods: [{ start: '08:00', end: '08:00' }] }
    expect(weeklyHoursSchema.safeParse(week).success).toBe(false)
    week.days.mon.periods = [
      { start: '08:00', end: '12:00' },
      { start: '11:00', end: '15:00' },
    ]
    expect(weeklyHoursSchema.safeParse(week).success).toBe(false)
  })
  it('aceita atendimento noturno e recusa sobreposição no dia seguinte', () => {
    const week = emptyWeek()
    week.days.mon = { closed: false, all_day: false, periods: [{ start: '22:00', end: '02:00' }] }
    expect(weeklyHoursSchema.safeParse(week).success).toBe(true)
    expect(dayHoursText(week.days.mon)).toBe('22:00–02:00 (dia seguinte)')
    week.days.tue = { closed: false, all_day: false, periods: [{ start: '01:30', end: '07:00' }] }
    expect(weeklyHoursSchema.safeParse(week).success).toBe(false)
  })
  it('valida a continuidade entre domingo e segunda-feira', () => {
    const week = emptyWeek()
    week.days.sun = { closed: false, all_day: false, periods: [{ start: '22:00', end: '02:00' }] }
    week.days.mon = { closed: false, all_day: false, periods: [{ start: '01:00', end: '05:00' }] }
    expect(weeklyHoursSchema.safeParse(week).success).toBe(false)
    week.days.mon.periods = [{ start: '02:00', end: '05:00' }]
    expect(weeklyHoursSchema.safeParse(week).success).toBe(true)
  })
  it('limpa apenas os intervalos desativados e mantém o rascunho original', () => {
    const week = emptyWeek()
    week.days.mon.periods = [{ start: '', end: '' }]
    week.days.tue = { closed: false, all_day: true, periods: [{ start: '08:00', end: '18:00' }] }
    expect(weeklyHoursSchema.safeParse(cleanWeek(week)).success).toBe(true)
    expect(week.days.mon.periods).toHaveLength(1)
  })
  it('recusa dias ausentes, campos desconhecidos e intervalos em excesso', () => {
    const week = emptyWeek()
    expect(weeklyHoursSchema.safeParse({ ...week, days: { mon: week.days.mon } }).success).toBe(
      false,
    )
    expect(weeklyHoursSchema.safeParse({ ...week, arbitrary: true }).success).toBe(false)
    week.days.mon = {
      closed: false,
      all_day: false,
      periods: Array.from({ length: 4 }, () => ({ start: '08:00', end: '09:00' })),
    }
    expect(weeklyHoursSchema.safeParse(week).success).toBe(false)
  })
})
