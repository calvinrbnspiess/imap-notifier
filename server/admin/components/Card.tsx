import clsx from "clsx";
import { PropsWithChildren } from "react";

export const Card = ({
  title,
  children,
  className = null,
}: PropsWithChildren<{ title: string; className?: string }>) => (
  <div
    className={clsx(
      "border border-black bg-white p-4 flex flex-col",
      className
    )}
  >
    <h2 className="text-lg font-medium mb-3">{title}</h2>
    {children}
  </div>
);
