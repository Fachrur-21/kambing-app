import RegisterForm from '@/app/components/auth/RegisterForm'

export default function RegisterPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_18%_20%,#ffedd5_0,#ffedd5_15%,#fffbeb_42%),radial-gradient(circle_at_80%_85%,#d9f99d_0,#d9f99d_12%,transparent_45%)] px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(251,191,36,0.07),rgba(132,204,22,0.08))]" />
      <RegisterForm />
    </main>
  )
}