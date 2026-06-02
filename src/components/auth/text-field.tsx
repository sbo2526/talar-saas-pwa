type TextFieldProps = {
  label: string;
  name: string;
  type?: string;
  placeholder: string;
  helper?: string;
  autoComplete?: string;
};

export function TextField({
  label,
  name,
  type = "text",
  placeholder,
  helper,
  autoComplete,
}: TextFieldProps) {
  return (
    <label
      htmlFor={name}
      className="grid gap-2 text-sm font-black text-[#172033]"
    >
      <span>{label}</span>
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        dir="auto"
        className="min-h-[3.6rem] w-full rounded-2xl border border-[#d8c08b]/75 bg-[#fff8ea]/95 px-4 py-3.5 text-[0.97rem] font-bold text-[#101722] shadow-[inset_0_1px_0_rgba(255,255,255,0.70),0_12px_32px_rgba(17,24,39,0.06)] outline-none transition placeholder:text-[#8a7a5e]/65 focus:border-[#c7a15a] focus:bg-white focus:ring-4 focus:ring-[#c7a15a]/25"
      />
      {helper ? (
        <span className="text-xs font-bold leading-6 text-[#7d6841]">
          {helper}
        </span>
      ) : null}
    </label>
  );
}
