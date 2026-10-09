import { useMemo, useState } from 'react';
import { getDisplayError } from '@/core/network/ApiError';
import { useAuthSession } from '../context/AuthSessionContext';
import {
  passwordChecks,
  sanitizeName,
  sanitizePhone,
  validateRegister,
  type FieldErrors,
  type RegisterForm,
} from '../validation/authValidation';

const initialForm: RegisterForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
};

export function useRegisterViewModel() {
  const { register } = useAuthSession();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState<FieldErrors<RegisterForm>>({});
  const [requestError, setRequestError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const checks = useMemo(() => passwordChecks(form.password), [form.password]);

  function updateField(field: keyof RegisterForm, rawValue: string) {
    const value =
      field === 'firstName' || field === 'lastName'
        ? sanitizeName(rawValue)
        : field === 'phone'
          ? sanitizePhone(rawValue)
          : rawValue;

    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setRequestError(null);
  }

  async function submit(): Promise<boolean> {
    const fieldErrors = validateRegister(form);
    setErrors(fieldErrors);
    setRequestError(null);

    if (Object.keys(fieldErrors).length > 0) {
      return false;
    }

    setIsSubmitting(true);
    try {
      await register({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone,
        password: form.password,
      });
      return true;
    } catch (error) {
      setRequestError(getDisplayError(error, 'No se pudo crear la cuenta.'));
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }

  return { form, errors, checks, requestError, isSubmitting, updateField, submit };
}
