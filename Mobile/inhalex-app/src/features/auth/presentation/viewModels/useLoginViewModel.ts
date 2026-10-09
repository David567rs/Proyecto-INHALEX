import { useState } from 'react';
import { getDisplayError } from '@/core/network/ApiError';
import type { LoginInput } from '../../domain/entities/AuthCredentials';
import { useAuthSession } from '../context/AuthSessionContext';
import { validateLogin, type FieldErrors } from '../validation/authValidation';

const initialForm: LoginInput = { email: '', password: '' };

export function useLoginViewModel() {
  const { login } = useAuthSession();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState<FieldErrors<LoginInput>>({});
  const [requestError, setRequestError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField(field: keyof LoginInput, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setRequestError(null);
  }

  async function submit(): Promise<boolean> {
    const fieldErrors = validateLogin(form);
    setErrors(fieldErrors);
    setRequestError(null);

    if (Object.keys(fieldErrors).length > 0) {
      return false;
    }

    setIsSubmitting(true);
    try {
      await login({ email: form.email.trim().toLowerCase(), password: form.password });
      return true;
    } catch (error) {
      setRequestError(getDisplayError(error, 'No se pudo iniciar sesion.'));
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }

  return { form, errors, requestError, isSubmitting, updateField, submit };
}
