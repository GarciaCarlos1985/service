import { Copy, Plus, Trash2 } from 'lucide-react'
import { useRef } from 'react'
import { cleanWeek, dayHoursText, emptyWeek, weekDays, weeklyHoursSchema } from '../hours'
import type { DayHours, WeekDay, WeeklyHours } from '../hours'

export function WeeklyHoursEditor({
  value,
  legacy,
  disabled,
  errors,
  prefix,
  onChange,
  onLegacyChange,
}: {
  value: WeeklyHours | null
  legacy: string
  disabled: boolean
  errors: Record<string, string>
  prefix: string
  onChange: (week: WeeklyHours | null) => void
  onLegacyChange: (text: string) => void
}) {
  const previousWeek = useRef(value)
  const update = (day: WeekDay, next: Partial<DayHours>) => {
    if (value)
      onChange({ ...value, days: { ...value.days, [day]: { ...value.days[day], ...next } } })
  }
  const source =
    value &&
    weekDays.find(({ id }) => {
      if (value.days[id].closed) return false
      const candidate = emptyWeek()
      candidate.days[id] = value.days[id]
      return weeklyHoursSchema.safeParse(cleanWeek(candidate)).success
    })
  return (
    <div className="company-hours-editor">
      <p>
        Marque os dias em que a empresa abre. Os demais aparecerão como <strong>Fechado</strong>.
        Adicione outro intervalo quando houver pausa para almoço.
      </p>
      <label className="guide-checkbox company-hours-enable">
        <input
          type="checkbox"
          checked={!!value}
          disabled={disabled}
          onChange={(event) => {
            if (!event.target.checked) previousWeek.current = value
            onChange(event.target.checked ? (previousWeek.current ?? emptyWeek(legacy)) : null)
          }}
        />
        Definir dias e horários de funcionamento
      </label>
      {value ? (
        <>
          <div className="company-hours-tools">
            <span>Os horários seguem a rotina informada pela empresa.</span>
            <button
              className="text-button"
              type="button"
              disabled={disabled || !source}
              onClick={() => {
                if (!source) return
                onChange({
                  ...value,
                  days: Object.fromEntries(
                    weekDays.map(({ id }) => [
                      id,
                      value.days[id].closed
                        ? value.days[id]
                        : structuredClone(value.days[source.id]),
                    ]),
                  ) as WeeklyHours['days'],
                })
              }}
            >
              <Copy size={16} />
              {source
                ? `Copiar ${source.name.toLowerCase()} para os outros dias abertos`
                : 'Preencha um dia para copiar os horários'}
            </button>
          </div>
          <div className="company-week-days">
            {weekDays.map(({ id, name }) => {
              const day = value.days[id]
              const dayPath = 'weekly_hours.days.' + id
              const dayErrors = Object.entries(errors).filter(([path]) => path.startsWith(dayPath))
              return (
                <div key={id} className={'company-hours-day' + (day.closed ? ' closed' : '')}>
                  <div className="company-hours-day-heading">
                    <label className="guide-checkbox">
                      <input
                        type="checkbox"
                        checked={!day.closed}
                        disabled={disabled}
                        onChange={(event) => {
                          update(id, {
                            closed: !event.target.checked,
                            periods: day.periods.length ? day.periods : [{ start: '', end: '' }],
                          })
                        }}
                      />
                      {name}
                    </label>
                    <span className="company-day-status">
                      {day.closed ? 'Fechado' : day.all_day ? '24 horas' : 'Aberto'}
                    </span>
                  </div>
                  {!day.closed && (
                    <div className="company-day-periods">
                      <label className="guide-checkbox company-all-day">
                        <input
                          type="checkbox"
                          checked={day.all_day}
                          disabled={disabled}
                          onChange={(event) => {
                            update(id, { all_day: event.target.checked })
                          }}
                        />
                        Aberto 24 horas
                      </label>
                      {!day.all_day && (
                        <>
                          {day.periods.map((period, index) => (
                            <div className="company-hours-period" key={index}>
                              {(['start', 'end'] as const).map((field) => {
                                const path = `${dayPath}.periods.${String(index)}.${field}`
                                const fieldId = prefix + path
                                return (
                                  <div key={field}>
                                    <label htmlFor={fieldId}>
                                      {field === 'start' ? 'Abre às' : 'Fecha às'}
                                      <span className="sr-only">
                                        {' '}
                                        · {name} · intervalo {index + 1}
                                      </span>
                                    </label>
                                    <input
                                      id={fieldId}
                                      name={path}
                                      type="time"
                                      step="60"
                                      value={period[field]}
                                      disabled={disabled}
                                      required
                                      aria-invalid={!!errors[path]}
                                      aria-describedby={
                                        errors[path] ? prefix + dayPath + '-errors' : undefined
                                      }
                                      onChange={(event) => {
                                        update(id, {
                                          periods: day.periods.map((entry, position) =>
                                            position === index
                                              ? { ...entry, [field]: event.target.value }
                                              : entry,
                                          ),
                                        })
                                      }}
                                    />
                                  </div>
                                )
                              })}
                              {day.periods.length > 1 && (
                                <button
                                  type="button"
                                  className="btn outline company-remove-period"
                                  disabled={disabled}
                                  aria-label={`Remover intervalo ${String(index + 1)} de ${name}`}
                                  onClick={() => {
                                    update(id, {
                                      periods: day.periods.filter(
                                        (_, position) => position !== index,
                                      ),
                                    })
                                  }}
                                >
                                  <Trash2 size={17} />
                                </button>
                              )}
                              {period.end && period.start && period.end < period.start && (
                                <small className="company-next-day">Encerra no dia seguinte.</small>
                              )}
                            </div>
                          ))}
                          <button
                            type="button"
                            className="text-button company-add-period"
                            disabled={disabled || day.periods.length >= 3}
                            onClick={() => {
                              update(id, { periods: [...day.periods, { start: '', end: '' }] })
                            }}
                          >
                            <Plus size={16} />
                            Adicionar intervalo<span className="sr-only"> de {name}</span>
                          </button>
                        </>
                      )}
                    </div>
                  )}
                  {dayErrors.length > 0 && (
                    <p className="field-error" role="alert" id={prefix + dayPath + '-errors'}>
                      {[...new Set(dayErrors.map(([, message]) => message))].join(' ')}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
          <label htmlFor={prefix + 'hours-notes'}>Observações de funcionamento (opcional)</label>
          <textarea
            id={prefix + 'hours-notes'}
            rows={3}
            maxLength={1000}
            value={value.notes}
            disabled={disabled}
            placeholder="Ex.: nos feriados, confirme o horário pelo WhatsApp."
            onChange={(event) => {
              onChange({ ...value, notes: event.target.value })
            }}
          />
          {errors['weekly_hours.notes'] && (
            <p className="field-error" role="alert">
              {errors['weekly_hours.notes']}
            </p>
          )}
          <details className="company-hours-summary">
            <summary>Conferir como os horários aparecerão</summary>
            <dl>
              {weekDays.map(({ id, name }) => (
                <div key={id}>
                  <dt>{name}</dt>
                  <dd>{dayHoursText(value.days[id])}</dd>
                </div>
              ))}
            </dl>
          </details>
        </>
      ) : (
        <div className="company-hours-legacy">
          <p>
            Sem rotina semanal definida, o perfil mantém o texto abaixo ou orienta o cliente a
            consultar a empresa.
          </p>
          <label htmlFor={prefix + 'hours-legacy'}>Texto de funcionamento (opcional)</label>
          <textarea
            id={prefix + 'hours-legacy'}
            rows={3}
            maxLength={2000}
            value={legacy}
            disabled={disabled}
            onChange={(event) => {
              onLegacyChange(event.target.value)
            }}
          />
        </div>
      )}
      {errors.weekly_hours && (
        <p role="alert" className="field-error">
          {errors.weekly_hours}
        </p>
      )}
    </div>
  )
}
