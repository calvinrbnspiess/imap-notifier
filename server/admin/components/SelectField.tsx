import { HTMLProps } from "react";

export const SelectField = ({
  label,
  options,
  ...props
}: HTMLProps<HTMLSelectElement> & {
  label: string;
  options: { label: string; value: string }[];
}) => (
  <div className="mb-3 relative">
    <label className="block mb-1">{label}</label>

    <div className="relative flex items-center">
      <select
        {...props}
        className="appearance-none w-full p-2 pr-10 border border-black focus:outline-black bg-white"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {/* Enlarged Caret SVG */}
      <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-black">
        <svg
          className="w-6 h-6"
          viewBox="0 0 20 20"
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.186l3.71-3.955a.75.75 0 111.08 1.04l-4.24 4.52a.75.75 0 01-1.08 0L5.25 8.27a.75.75 0 01-.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </div>
    </div>
  </div>
);
