/** The message under a form field. Not an alert: the field is marked invalid and points here. */
export function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p id={id} className="text-xs text-destructive">
      {message}
    </p>
  ) : null;
}
