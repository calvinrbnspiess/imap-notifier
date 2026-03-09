import clsx from "clsx";
import { HTMLProps } from "react";

export const InputField = ({
  label,
  type = "text",
  maxLength,
  onChange,
  withMargin = true,
  className,
  ...props
}: HTMLProps<HTMLInputElement> & {
  label?: string;
  type?: string;
  maxLength?: number;
  withMargin?: boolean;
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    // If maxLength is set and input exceeds it, trim it
    if (maxLength && inputValue.length > maxLength) {
      e.target.value = inputValue.slice(0, maxLength);
    }

    // Call the original onChange (React Hook Form needs it!)
    if (onChange) {
      onChange(e);
    }
  };

  return (
    <div className={clsx(withMargin && "mb-3", className)}>
      {label && <label className="block mb-1">{label}</label>}
      <input
        {...props}
        type={type}
        maxLength={maxLength} // Also set HTML maxlength to prevent typing too much
        onChange={handleChange}
        className="w-full p-2 border border-black focus:outline-black"
      />
    </div>
  );
};
