import clsx from "clsx";
import { ButtonHTMLAttributes } from "react";

export const Button = ({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant: "primary" | "secondary";
}) => (
  <button
    className={clsx(
      "text-white px-4 py-2 text-lg cursor-pointer min-w-[250px] h-11 flex justify-center items-center disabled:pointer-events-none disabled:select-none disabled:opacity-70 disabled:grayscale-90 transition-colors",
      variant === "primary" && "bg-blue-600 hover:bg-blue-800",
      variant === "secondary" && "bg-gray-800 hover:bg-gray-600",
      className
    )}
    {...props}
  />
);

export const MiniButton = ({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant: "primary" | "secondary";
}) => (
  <button
    className={clsx(
      "text-white text-xs px-4 py-2 text-lg cursor-pointer flex justify-center items-center disabled:pointer-events-none disabled:select-none disabled:opacity-70 disabled:grayscale-90 transition-colors",
      variant === "primary" && "bg-blue-600 hover:bg-blue-800",
      variant === "secondary" && "bg-gray-800 hover:bg-gray-600",
      className
    )}
    {...props}
  />
);
