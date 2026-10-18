import { useState } from 'react'
import { captchaSiteKey } from './captcha-options'

export function useAuthCaptcha() {
  const [token, setToken] = useState('')
  const [attempt, setAttempt] = useState(0)
  const reset = () => {
    setToken('')
    setAttempt((previous) => previous + 1)
  }
  return { token, setToken, attempt, reset, waiting: !!captchaSiteKey && !token }
}
