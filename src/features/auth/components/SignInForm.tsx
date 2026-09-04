'use client';

import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { CLIENT } from '@/config/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ROUTES } from '@/config/routes';
import { useMessages } from '@/i18n/use-messages';
import type { ApiError } from '@/lib/api/errors';

import { signInAction } from '../actions';
import { signInSchema, type SignInInput } from '../schemas/sign-in.schema';

/**
 * D3 — the placeholder sign-in form.
 *
 * Kept deliberately small and self-contained so that deleting it when the real
 * Identity module lands is a single-directory removal.
 */
export function SignInForm() {
  const t = useMessages();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignInInput>({ resolver: zodResolver(signInSchema) });

  function handleFailure(error: ApiError): void {
    // ERR-11: never render the backend's message.
    if (error.kind !== 'VALIDATION') {
      setError('root', { message: t.errors.network });
      return;
    }
    setError('mobile', { message: t.auth.invalidMobile });
  }

  async function onSubmit(input: SignInInput): Promise<void> {
    const result = await signInAction(input);

    if (!result.ok) {
      handleFailure(result.error);
      return;
    }

    // NEXT-08: navigation goes through the router, never window.location.
    router.push(ROUTES.home);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        {/* FORM-05: label associated, error wired to aria-describedby. */}
        <label htmlFor="sign-in-mobile" className="text-fg text-sm font-medium">
          {t.auth.mobileLabel}
        </label>
        <Input
          id="sign-in-mobile"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          /*
           * PD-01: the example is read from the same profile entry as the
           * validation pattern, so the two cannot drift. It is a format sample
           * rather than prose, which is why it is not in the message registry —
           * a translator editing it would silently break the field.
           */
          placeholder={CLIENT.market.mobile.example}
          aria-invalid={Boolean(errors.mobile)}
          aria-describedby={errors.mobile ? 'sign-in-mobile-error' : undefined}
          {...register('mobile')}
        />
        {errors.mobile ? (
          <p id="sign-in-mobile-error" role="alert" className="text-danger-500 text-sm">
            {t.auth.invalidMobile}
          </p>
        ) : null}
      </div>

      {/* FORM-06: disabled and aria-busy while in flight. */}
      <Button type="submit" isLoading={isSubmitting}>
        {t.auth.signInCta}
      </Button>

      {errors.root ? (
        <p role="alert" className="text-danger-500 text-sm">
          {errors.root.message}
        </p>
      ) : null}
    </form>
  );
}
