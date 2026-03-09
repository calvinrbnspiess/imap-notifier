import clsx from "clsx";
import { Tag } from "./Tag";
import { PropsWithChildren, useMemo, useState } from "react";
import { InputField } from "./InputField";
import { CheckCircle, SearchIcon, Trash2, XCircle } from "lucide-react";
import { Payment } from "./Contacts";
import { useSearchFilter } from "../helpers/useSearchFilter";
import { Button } from "./Button";
import { hasValidBankDetails } from "../helpers/contact";
import { Checkbox } from "./Checkbox";

export type Invoice = {
  contactId: string;
  contactName: string;
  totalAmount: number;
  voucherNumber: string;
  voucherDate: string;
};

export const statusOptions = [
  { label: "Draft", value: "draft" },
  { label: "Open", value: "open" },
  { label: "Paid", value: "paid" },
  { label: "Paid Off", value: "paidoff" },
  { label: "Voided", value: "voided" },
  { label: "Transferred", value: "transferred" },
  { label: "SEPA Debit", value: "sepadebit" },
  { label: "Overdue", value: "overdue" },
  { label: "Accepted", value: "accepted" },
  { label: "Rejected", value: "rejected" },
  { label: "Unchecked", value: "unchecked" },
];

export const Invoices = ({
  payments,
  children,
  deleteInvoice = () => {},
}: PropsWithChildren<{
  payments: Payment[];
  deleteInvoice: (invoice: Invoice) => void;
}>) => {
  const [
    invoicesWithoutBankDetailsHidden,
    setInvoicesWithoutBankDetailsHidden,
  ] = useState(false);
  const { filteredData, SearchInput } = useSearchFilter({
    payments,
    inputClassName: "flex-1",
  });

  const filteredInvoices = filteredData.filter((data) => {
    if (invoicesWithoutBankDetailsHidden) {
      return hasValidBankDetails(data.contact);
    }

    return true;
  });

  return (
    <div className="w-full h-full flex flex-col">
      {SearchInput}
      <Checkbox
        label="Zeige nur Rechnungen mit Bankdaten"
        className="my-3"
        onChange={setInvoicesWithoutBankDetailsHidden}
        checked={invoicesWithoutBankDetailsHidden}
      />
      {children}
      <div className="w-full py-2 after:content-[''] after:h-[1px] after:bg-gray-300 after:w-full after:block"></div>
      <div
        className={clsx(
          "flex flex-1 flex-col divide-y divide-gray-200 max-h-[800px] my-2 overflow-y-auto",
          "[&::-webkit-scrollbar]:w-0.5 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:bg-gray-700 pr-4"
        )}
      >
        {filteredInvoices.length === 0 && (
          <div className="flex-1">
            <span className="block text-sm select-none my-3">
              Keine Rechnungen verfügbar.
            </span>
          </div>
        )}
        {filteredInvoices.map(({ invoice, contact }, index) => (
          <div key={index} className="px-2 py-4 flex gap-x-4 items-center">
            <div className="flex flex-col flex-1">
              <div className="flex justify-between">
                <h3 className="font-medium text-gray-900 flex items-center gap-2">
                  {invoice.contactName}
                  {hasValidBankDetails(contact) ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <Tag>
                      Keine Bankdaten{" "}
                      <XCircle className="h-4 w-4 text-gray-400" />
                    </Tag>
                  )}
                </h3>
                <div className="text-right">
                  <Tag>
                    {invoice.totalAmount.toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                      minimumFractionDigits: 2,
                    }) + " €"}
                  </Tag>
                </div>
              </div>
              <div className="flex items-center mt-1 text-sm text-gray-600">
                <span>
                  {invoice.voucherNumber} /{" "}
                  {new Date(invoice.voucherDate).toLocaleDateString("de-DE")}
                </span>
              </div>
            </div>
            <button
              className="hover:text-red-400 text-red-500 cursor-pointer p-2"
              onClick={() => deleteInvoice(invoice)}
              type="button"
            >
              <Trash2 className="h-5 w-5 text-inherit" color="currentColor" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
