import clsx from "clsx";
import { Tag } from "./Tag";
import { Invoice } from "./Invoices";
import { useMemo, useState } from "react";
import { SearchIcon } from "lucide-react";
import { InputField } from "./InputField";
import { BIC_PATTERN, DATE_PATTERN, IBAN_PATTERN } from "../App";

export type Contact = {
  id: string;
  name: string;
  email: string;
  mandateId: string;
};

export type ContactWithBankAccount = Contact & {
  bankAccount?: BankAccount;
};

export type BankAccount = {
  id: string;
  bic: string;
  iban: string;
  dtOfSgntr: string;
};

export type Payment = {
  contact?: ContactWithBankAccount;
  invoice: Invoice;
};

export const Contacts = ({
  contacts,
  onUpdateContact = () => {},
}: {
  contacts: ContactWithBankAccount[];
  onUpdateContact: (contact: ContactWithBankAccount) => void;
}) => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredContacts = useMemo(() => {
    return contacts.filter((item) =>
      Object.values(item).some(
        (val) =>
          typeof val === "string" &&
          val.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [searchTerm, contacts]);

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex items-center gap-2">
        <SearchIcon />
        <InputField
          placeholder="Suchbegriff ..."
          onChange={(event) =>
            setSearchTerm((event.target as HTMLInputElement).value)
          }
          withMargin={false}
          className="flex-1"
        />
      </div>
      <div
        className={clsx(
          "flex flex-1 flex-col divide-y divide-gray-200 max-h-[800px] my-2 overflow-y-auto",
          "[&::-webkit-scrollbar]:w-0.5 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:bg-gray-700 pr-4"
        )}
      >
        {filteredContacts.length === 0 && (
          <div className="flex-1">
            <span className="block text-sm select-none my-3">
              Keine Kontakte verfügbar.
            </span>
          </div>
        )}
        {filteredContacts.map((contact, index) => {
          return (
            <div key={index} className="px-2 py-4">
              <div className="flex flex-col">
                <div className="flex justify-between">
                  <h3 className="font-medium text-gray-900">{contact.name}</h3>
                  <div className="text-right">
                    <Tag>MndtId: {contact.mandateId || "-"}</Tag>
                  </div>
                </div>
                <div className="flex flex-col justify-center mt-1 text-sm text-gray-600 w-fit gap-y-2">
                  <span>{contact.email}</span>
                  <span>{contact.id}</span>
                  {/* IBAN and BIC input fields */}
                  <div className="flex flex-row items-center gap-4 w-fit-content mt-1">
                    <div className="flex items-center gap-2">
                      <label
                        htmlFor={`iban-${contact.id}`}
                        className="text-xs whitespace-nowrap"
                      >
                        IBAN:
                      </label>
                      <input
                        id={`iban-${contact.id}`}
                        placeholder="Enter IBAN"
                        className={clsx(
                          "h-6 text-xs rounded-none w-40 px-2 outline-none border-1",
                          !contact.bankAccount?.iban.match(IBAN_PATTERN)
                            ? "border-red-600"
                            : "border-black"
                        )}
                        defaultValue={contact.bankAccount.iban || ""}
                        onChange={(event) => {
                          const value = event.target.value;
                          onUpdateContact({
                            ...contact,
                            bankAccount: {
                              ...contact.bankAccount,
                              iban: value,
                            },
                          });
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label
                        htmlFor={`bic-${contact.id}`}
                        className="text-xs whitespace-nowrap"
                      >
                        BIC:
                      </label>
                      <input
                        id={`bic-${contact.id}`}
                        placeholder="Enter BIC"
                        className={clsx(
                          "h-6 text-xs rounded-none w-32 border-1 px-2 outline-none",
                          !contact.bankAccount?.bic.match(BIC_PATTERN)
                            ? "border-red-600"
                            : "border-black"
                        )}
                        defaultValue={contact.bankAccount.bic || ""}
                        onChange={(event) => {
                          const value = event.target.value;

                          onUpdateContact({
                            ...contact,
                            bankAccount: { ...contact.bankAccount, bic: value },
                          });
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-1">
                    <label
                      htmlFor={`dtOfSgntr-${contact.id}`}
                      className="text-xs whitespace-nowrap"
                    >
                      Date of Signature:
                    </label>
                    <input
                      id={`dtOfSgntr-${contact.id}`}
                      placeholder="Enter DtOfSgntr"
                      className={clsx(
                        "h-6 text-xs rounded-none w-32 border-1 px-2 outline-none flex-1",
                        !contact.bankAccount?.dtOfSgntr.match(DATE_PATTERN)
                          ? "border-red-600"
                          : "border-black"
                      )}
                      defaultValue={contact.bankAccount.dtOfSgntr || ""}
                      onChange={(event) => {
                        const value = event.target.value;

                        onUpdateContact({
                          ...contact,
                          bankAccount: {
                            ...contact.bankAccount,
                            dtOfSgntr: value,
                          },
                        });
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
