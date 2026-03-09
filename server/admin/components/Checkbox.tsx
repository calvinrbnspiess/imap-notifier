import React, { useState } from "react";
import { Check } from "lucide-react";
import clsx from "clsx";

interface CheckboxProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  className: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  checked = false,
  onChange,
  label,
  className,
}) => {
  const [isChecked, setIsChecked] = useState(checked);

  const handleToggle = () => {
    const newChecked = !isChecked;
    setIsChecked(newChecked);
    onChange?.(newChecked);
  };

  return (
    <label
      className={clsx(
        "inline-flex items-center cursor-pointer gap-2",
        className
      )}
      onClick={handleToggle}
    >
      <div className="w-5 h-5 border border-black flex items-center justify-center p-0.5 focus:outline-black">
        {isChecked && <Check size={14} className="text-black" />}
      </div>
      {label && <span className="text-black select-none">{label}</span>}
    </label>
  );
};
