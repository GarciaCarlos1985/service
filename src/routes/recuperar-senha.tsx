import { createFileRoute } from '@tanstack/react-router'
import { Card, CardBody } from '~/modules/ui'
import { useAuth } from '~/modules/auth/auth-context'
import { RequestResetForm, UpdatePasswordForm } from '~/modules/auth/PasswordRecoveryForms'
import { GuideAuthLayout } from '~/modules/guide/GuideShell'

export const Route = createFileRoute('/recuperar-senha')({
  component: ResetPasswordPage,
})

function ResetPasswordPage() {
  const { user, isLoading } = useAuth()

  return (
    <GuideAuthLayout>
      <Card className="w-full max-w-md">
        <CardBody className="space-y-6">
          {isLoading ? (
            <p role="status" className="text-center text-sm text-slate-500">
              Verificando seu acesso…
            </p>
          ) : user ? (
            <UpdatePasswordForm />
          ) : (
            <RequestResetForm />
          )}
        </CardBody>
      </Card>
    </GuideAuthLayout>
  )
}
