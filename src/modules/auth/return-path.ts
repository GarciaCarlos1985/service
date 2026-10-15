export function safeReturnPath(value: unknown): string {
  return typeof value === 'string' &&
    value.length <= 2000 &&
    value.startsWith('/') &&
    !value.startsWith('//') &&
    !/[\\\u0000-\u0020]/.test(value)
    ? value
    : '/conta'
}
