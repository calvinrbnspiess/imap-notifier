import { useMemo, useState } from "react";
import { SearchIcon } from "lucide-react";
import { Payment } from "../components/Contacts";
import { InputField } from "../components/InputField";

type FilterTarget = Record<string, any>;

interface UseSearchFilterOptions {
  payments: Payment[];
  placeholder?: string;
  inputClassName?: string;
}

export const useSearchFilter = ({
  payments,
  placeholder = "Suchbegriff ...",
  inputClassName = "",
}: UseSearchFilterOptions) => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return payments;

    return payments.filter(
      (item) =>
        Object.values(item.invoice || {}).some(
          (val) =>
            typeof val === "string" &&
            val.toLowerCase().includes(searchTerm.toLowerCase())
        ) ||
        Object.values(item.contact || {}).some(
          (val) =>
            typeof val === "string" &&
            val.toLowerCase().includes(searchTerm.toLowerCase())
        )
    );
  }, [searchTerm, payments]);

  const SearchInput = (
    <div className="flex items-center gap-2 w-full">
      <SearchIcon className="text-gray-500" />
      <InputField
        value={searchTerm}
        onChange={(e) => setSearchTerm((e.target as HTMLInputElement).value)}
        placeholder={placeholder}
        withMargin={false}
        className="flex-1"
      />
    </div>
  );

  return {
    filteredData,
    searchTerm,
    setSearchTerm,
    SearchInput,
  };
};
